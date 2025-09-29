import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireSuperAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { logCreate } from "@/lib/logger";

// Professional in-memory cache for users data
const usersCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for better performance

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Require superadmin access
    await requireSuperAdmin(req);

    // Check cache first
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '25');
    const page = parseInt(searchParams.get('page') || '1');
    const cacheKey = `users-${limit}-${page}`;
    
    const cached = usersCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return new Response(JSON.stringify({
        success: true,
        data: cached.data,
        message: 'Users loaded from cache'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    await dbConnect();
    
    const skip = (page - 1) * limit;
    
    // Super simple and fast query - no complex operations
    const users = await User.find({}, {
      _id: 1,
      name: 1,
      username: 1,
      phoneNumber: 1,
      address: 1,
      role: 1,
      isActive: 1,
      createdAt: 1
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .maxTimeMS(3000); // 3 second timeout to prevent timeouts
    
    // Simple count - no parallel needed
    const totalCount = await User.countDocuments().maxTimeMS(3000);

    // No need to map since we're already selecting only needed fields

    // Minimal headers for speed
    const headers = {
      'Content-Type': 'application/json',
    };

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    
    const responseData = {
      users,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    // Update cache
    usersCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      message: 'Users fetched successfully'
    }), { 
      status: 200, 
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) {
        return new Response(JSON.stringify({ 
          success: false,
          message: "Unauthorized" 
        }), { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return new Response(JSON.stringify({ 
          success: false,
          message: "Access denied - Superadmin access required" 
        }), { status: 403 });
      }
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ 
      success: false,
      message 
    }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require superadmin access
    await requireSuperAdmin(req);

    const { name, username, password, role: newUserRole, phoneNumber, address } = await req.json();

    // Validation
    const errors: string[] = [];
    
    if (!name || !name.trim()) {
      errors.push("Name is required");
    }
    
    if (!username || !username.trim()) {
      errors.push("Username is required");
    }
    
    if (!password || password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }
    
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ message: errors.join(", ") }), 
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return new Response(JSON.stringify({ message: "Username already exists" }), { status: 400 });
    }

    // Don't hash password here - let the User model pre-save middleware handle it
    const userData = {
      name: name.trim(),
      username: username.trim(),
      password: password, // Plain password - will be hashed by model middleware
      role: newUserRole === "superadmin" ? "superadmin" : "user",
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      address: address ? address.trim() : undefined,
    };
    
    const created = await User.create(userData);

    const userSafe = {
      _id: created._id,
      name: created.name,
      username: created.username,
      phoneNumber: created.phoneNumber,
      address: created.address,
      role: created.role,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    // Log user creation
    await logCreate('user', created._id.toString(), { username: created.username, role: created.role }, req);

    return new Response(JSON.stringify({ message: "User created", user: userSafe }), { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
      }
      if (error.message.includes("Forbidden")) {
        return new Response(JSON.stringify({ message: "Access denied - Superadmin access required" }), { status: 403 });
      }
      // Handle MongoDB duplicate key errors
      if (error.message.includes('E11000')) {
        if (error.message.includes('username')) {
          return new Response(
            JSON.stringify({ message: "Username already exists" }), 
            { status: 400 }
          );
        }
      }
    }
    
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
}
