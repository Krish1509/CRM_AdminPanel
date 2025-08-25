import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Lab } from '@/models';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const { id: orderId } = await params;
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order ID is required' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete all labs for this order
    const result = await Lab.updateMany({ 
      order: orderId,
      softDeleted: false 
    }, {
      softDeleted: true
    });

    console.log(`Soft deleted ${result.modifiedCount} lab records for order ${orderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${result.modifiedCount} lab records`,
        deletedCount: result.modifiedCount
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error deleting labs by order:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
