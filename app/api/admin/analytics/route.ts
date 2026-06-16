import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-utils';
import { adminService } from '@/services/admin.service';

/**
 * GET /api/admin/analytics
 * Get platform analytics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    let data;

    switch (type) {
      case 'overview':
        data = await adminService.getPlatformStats();
        break;
      case 'growth':
        data = await adminService.getUserGrowthStats();
        break;
      case 'subscriptions':
        data = await adminService.getSubscriptionAnalytics();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      data,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
