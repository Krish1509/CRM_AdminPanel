import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import Log, { ILogModel } from '@/models/Log';

export async function POST(request: NextRequest) {
  try {
    // Get user session before logging out
    const session = await getSession(request);
    
    if (session) {
      // Log the logout action with actual user info
      await (Log as ILogModel).logUserAction({
        userId: session.id,
        username: session.username || session.name,
        userRole: session.role,
        action: 'logout',
        resource: 'auth',
        details: {
          username: session.username || session.name,
          userId: session.id
        },
        success: true,
        severity: 'info',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Logged out successfully' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Logout failed' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
