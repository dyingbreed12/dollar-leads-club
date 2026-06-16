'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { verifyEmailAction } from '@/actions/auth.actions';

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification token');
        return;
      }

      try {
        const result = await verifyEmailAction(token);

        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Email verified successfully!');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to verify email');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    }

    verifyEmail();
  }, [token, router]);

  return (
    <>
      {status === 'loading' && (
        <Alert>
          <AlertDescription>Verifying your email address...</AlertDescription>
        </Alert>
      )}

      {status === 'success' && (
        <>
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <p className="text-center text-sm text-muted-foreground">
            Redirecting to login page...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Link href="/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </>
      )}
    </>
  );
}
