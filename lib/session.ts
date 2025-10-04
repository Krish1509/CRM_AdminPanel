import { jwtVerify } from "jose";
import { type NextRequest } from "next/server";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: string;
  phoneNumber?: string;
  address?: string;
}

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!token || !JWT_SECRET) return null;

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    
    if (!payload || typeof payload !== "object") return null;

    const sessionUser: SessionUser = {
      id: (payload as Record<string, unknown>).id as string,
      name: (payload as Record<string, unknown>).name as string,
      username: (payload as Record<string, unknown>).username as string,
      role: (payload as Record<string, unknown>).role as string,
      phoneNumber: (payload as Record<string, unknown>).phoneNumber as string | undefined,
      address: (payload as Record<string, unknown>).address as string | undefined,
    };

    return sessionUser;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const session = await getSession(req);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireSuperAdmin(req: NextRequest): Promise<SessionUser> {
  const session = await requireAuth(req);
  if (session.role !== "superadmin") {
    throw new Error("Forbidden - Superadmin access required");
  }
  return session;
}
