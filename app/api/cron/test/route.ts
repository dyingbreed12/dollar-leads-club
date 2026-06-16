import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email.service';
import { getEmailsAfterFirstList } from '@/utils/customs/emailList';


// Vercel Pro plan allows up to 300 seconds (5 minutes)
export const maxDuration = 300;

export async function GET(request: Request) {
  console.log('🚀 TEST CRON TRIGGERED - Start');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🌍 Environment:', process.env.VERCEL_ENV);

  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  console.log('🔐 Auth header present:', !!authHeader);
  console.log('🔐 CRON_SECRET configured:', !!process.env.CRON_SECRET);

  if (authHeader !== expectedAuth) {
    console.error('❌ Unauthorized - Auth header mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();

    console.log('🧪 Test cron job started at:', new Date().toISOString());

    // Get email from URL parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      console.warn('⚠️ No email parameter provided');
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required as URL parameter',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log(`📧 Sending test email to: ${email}`);

    // Send 24 hours notice email
    await emailService.send24HoursNoticeEmail(email);

    // Send live notice email
    await emailService.sendLiveEmail(email);

    // Send welcome email
    await emailService.sendWelcomeEmail(email, 'User');

    console.log(`✅ Email sent successfully to: ${email}`);

    const executionTime = Date.now() - startTime;
    const emailsToSend = await getEmailsAfterFirstList();
    const result = {
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString(),
      executionTime: `${executionTime}ms`,
      environment: process.env.VERCEL_ENV || 'development',
      data: {
        email: email,
        processingCompleted: true,
        emailsAfterFirstList: emailsToSend
      }
    };

    console.log('✅ Test cron job completed:', JSON.stringify(result, null, 2));

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Test cron job failed:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}