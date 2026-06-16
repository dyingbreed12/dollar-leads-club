import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email.service';
import {  getEmailsAfterFirstList } from '@/utils/customs/emailList';

// Vercel Pro plan allows up to 300 seconds (5 minutes)
// This gives us plenty of time to send all emails without timeout
export const maxDuration = 300;

export async function GET(request: Request) {
  console.log('🚀 24-HOUR NOTICE CRON TRIGGERED');
  console.log('⏰ UTC Time:', new Date().toISOString());

  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only run in production
  if (process.env.VERCEL_ENV !== 'production') {
    console.log(`⏭️ Skipping - Not production (${process.env.VERCEL_ENV})`);
    return NextResponse.json(
      {
        success: false,
        error: 'This cron job only runs in production',
        environment: process.env.VERCEL_ENV,
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    );
  }

  try {
    // Get current date/time in New York timezone
    const nyDate = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });

    console.log('🗽 New York Date/Time:', nyDate);

    // Extract day of week and hour
    const dayOfWeek = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long'
    });

    const timeOnly = new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const [hourStr] = timeOnly.split(':');
    const hour = parseInt(hourStr);

    console.log(`📅 Day: ${dayOfWeek}, Hour: ${hour}`);

    // Check if it's Sunday, November 23, 2025
    const currentDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const targetDate = '11/23/2025';

    console.log(`📆 Current date: ${currentDate}, Target date: ${targetDate}`);

    if (currentDate !== targetDate) {
      console.log(`⏭️ Skipping - Current date: ${currentDate}, Expected: ${targetDate}`);
      return NextResponse.json({
        success: true,
        message: 'Skipped - not the target date',
        currentDate: currentDate,
        targetDate: targetDate,
        currentNYTime: timeOnly,
        timestamp: new Date().toISOString()
      });
    }

    // Check if it's Sunday
    if (dayOfWeek !== 'Sunday') {
      console.log(`⏭️ Skipping - Current day: ${dayOfWeek}, Expected: Sunday`);
      return NextResponse.json({
        success: true,
        message: 'Skipped - not Sunday',
        currentDay: dayOfWeek,
        currentNYTime: timeOnly,
        timestamp: new Date().toISOString()
      });
    }

    // Check if it's 8 AM
    if (hour !== 8) {
      console.log(`⏭️ Skipping - Current NY hour: ${hour}, Expected: 8`);
      return NextResponse.json({
        success: true,
        message: 'Skipped - not 8 AM NY time',
        currentDay: dayOfWeek,
        currentNYHour: hour,
        currentNYTime: timeOnly,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Time check passed - Executing on Sunday at 8 AM NY time');

    const startTime = Date.now();

    console.log('📧 Starting 24-hour notice email batch (ONE-TIME SEND)');

    // Get emails to send - all users EXCEPT those in firstEmailList
    const emailsToSend = await getEmailsAfterFirstList();

    console.log(`📊 Total emails to send: ${emailsToSend.length}`);

    // Send emails
    const results = await sendEmails(emailsToSend);

    const executionTime = Date.now() - startTime;

    const response = {
      success: true,
      message: '24 hours notice emails sent (ONE-TIME)',
      note: 'This was a one-time send. Future cron runs will be skipped.',
      timestamp: new Date().toISOString(),
      newYorkTime: timeOnly,
      executionTime: `${executionTime}ms`,
      stats: {
        totalEmails: emailsToSend.length,
        sent: results.sent,
        failed: results.failed,
        successRate: `${((results.sent / emailsToSend.length) * 100).toFixed(2)}%`
      }
    };

    console.log('✅ 24-hour notice emails completed:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ 24-hour notice emails failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');

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

async function sendEmails(emails: string[]) {
  let sent = 0;
  let failed = 0;
  const batchSize = 10; // Send in batches to avoid overwhelming the email service

  console.log(`📦 Processing ${emails.length} emails in batches of ${batchSize}`);

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emails.length / batchSize);

    console.log(`📤 Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);

    await Promise.allSettled(
      batch.map(async (email) => {
        try {
          await emailService.send24HoursNoticeEmail(email);
          sent++;
          console.log(`✉️ Sent to: ${email}`);
        } catch (error) {
          failed++;
          console.error(`❌ Failed to send to: ${email}`, error instanceof Error ? error.message : 'Unknown error');
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`📊 Batch processing complete - Sent: ${sent}, Failed: ${failed}`);

  return { sent, failed };
}