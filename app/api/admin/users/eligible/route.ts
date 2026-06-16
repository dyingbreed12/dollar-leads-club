import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-utils';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/users/eligible
 * Fetch all users eligible for auto-claim (active subscription + lead_access)
 */
export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Fetch users with active subscription and lead_access enabled
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, subscription_plan, subscription_status, lead_access')
      .eq('subscription_status', 'active')
      .eq('lead_access', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Error fetching eligible users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch eligible users' },
      { status: 500 }
    );
  }
}
