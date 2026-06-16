import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-utils';
import { settingsService } from '@/services/settings.service';
import { UpdateAutoClaimConfigDTO } from '@/types/settings.types';

/**
 * GET /api/admin/settings/auto-claim
 * Get auto-claim configuration (admin only)
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

    const config = await settingsService.getAutoClaimConfig();

    if (!config) {
      return NextResponse.json(
        { error: 'Auto-claim configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching auto-claim config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-claim configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/auto-claim
 * Update auto-claim configuration (admin only)
 *
 * Body can include partial updates:
 * {
 *   "enabled": true,
 *   "schedule": { "hour": 8, "minute": 0 },
 *   "plans": {
 *     "dollar-lead": { "dollar_leads": 5, "weekdays_only": true },
 *     "diamond-lead": { "dollar_leads": 10, "diamond_leads": 2 }
 *   }
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updates: UpdateAutoClaimConfigDTO = {};

    // Parse and validate request body
    if (body.enabled !== undefined) {
      updates.enabled = Boolean(body.enabled);
    }

    if (body.schedule) {
      updates.schedule = {};
      if (body.schedule.hour !== undefined) {
        updates.schedule.hour = Number(body.schedule.hour);
      }
      if (body.schedule.minute !== undefined) {
        updates.schedule.minute = Number(body.schedule.minute);
      }
      if (body.schedule.timezone) {
        updates.schedule.timezone = String(body.schedule.timezone);
      }
      if (body.schedule.utc_hour !== undefined) {
        updates.schedule.utc_hour = Number(body.schedule.utc_hour);
      }
    }

    if (body.plans) {
      updates.plans = {};
      if (body.plans['dollar-lead']) {
        updates.plans['dollar-lead'] = {};
        const dollarPlan = body.plans['dollar-lead'];
        if (dollarPlan.dollar_leads !== undefined) {
          updates.plans['dollar-lead'].dollar_leads = Number(dollarPlan.dollar_leads);
        }
        if (dollarPlan.diamond_leads !== undefined) {
          updates.plans['dollar-lead'].diamond_leads = Number(dollarPlan.diamond_leads);
        }
        if (dollarPlan.weekdays_only !== undefined) {
          updates.plans['dollar-lead'].weekdays_only = Boolean(dollarPlan.weekdays_only);
        }
        if (dollarPlan.description !== undefined) {
          updates.plans['dollar-lead'].description = String(dollarPlan.description);
        }
      }
      if (body.plans['diamond-lead']) {
        updates.plans['diamond-lead'] = {};
        const diamondPlan = body.plans['diamond-lead'];
        if (diamondPlan.dollar_leads !== undefined) {
          updates.plans['diamond-lead'].dollar_leads = Number(diamondPlan.dollar_leads);
        }
        if (diamondPlan.diamond_leads !== undefined) {
          updates.plans['diamond-lead'].diamond_leads = Number(diamondPlan.diamond_leads);
        }
        if (diamondPlan.weekdays_only !== undefined) {
          updates.plans['diamond-lead'].weekdays_only = Boolean(diamondPlan.weekdays_only);
        }
        if (diamondPlan.description !== undefined) {
          updates.plans['diamond-lead'].description = String(diamondPlan.description);
        }
      }
    }

    if (body.notifications) {
      updates.notifications = {};
      if (body.notifications.send_email !== undefined) {
        updates.notifications.send_email = Boolean(body.notifications.send_email);
      }
      if (body.notifications.email_api_url !== undefined) {
        updates.notifications.email_api_url = body.notifications.email_api_url;
      }
      if (body.notifications.include_csv_attachment !== undefined) {
        updates.notifications.include_csv_attachment = Boolean(
          body.notifications.include_csv_attachment
        );
      }
    }

    if (body.logging) {
      updates.logging = {};
      if (body.logging.log_executions !== undefined) {
        updates.logging.log_executions = Boolean(body.logging.log_executions);
      }
      if (body.logging.log_errors !== undefined) {
        updates.logging.log_errors = Boolean(body.logging.log_errors);
      }
      if (body.logging.log_insufficient_leads !== undefined) {
        updates.logging.log_insufficient_leads = Boolean(body.logging.log_insufficient_leads);
      }
    }

    // Update configuration
    const updatedConfig = await settingsService.updateAutoClaimConfig(updates, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Auto-claim configuration updated successfully',
      data: updatedConfig,
    });
  } catch (error) {
    console.error('Error updating auto-claim config:', error);

    if (error instanceof Error) {
      if (error.message.includes('Validation errors')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update auto-claim configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/auto-claim/reset
 * Reset auto-claim configuration to defaults (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      const resetConfig = await settingsService.resetAutoClaimConfig(session.user.id);

      return NextResponse.json({
        success: true,
        message: 'Auto-claim configuration reset to defaults',
        data: resetConfig,
      });
    }

    if (action === 'status') {
      const status = await settingsService.getAutoClaimStatus();

      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=reset or ?action=status' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing auto-claim action:', error);
    return NextResponse.json(
      { error: 'Failed to process auto-claim action' },
      { status: 500 }
    );
  }
}
