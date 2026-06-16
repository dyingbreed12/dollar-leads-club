import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-utils';
import { adminService } from '@/services/admin.service';

/**
 * GET /api/admin/stats
 * Get quick platform statistics (admin only)
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

    const [platformStats, growthStats, subscriptionStats] = await Promise.all([
      adminService.getPlatformStats(),
      adminService.getUserGrowthStats(),
      adminService.getSubscriptionAnalytics(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        platform: platformStats,
        growth: growthStats,
        subscriptions: subscriptionStats,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
