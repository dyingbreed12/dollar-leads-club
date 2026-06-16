import { Suspense } from 'react';
import Image from 'next/image';
import { VerifyEmailContent } from './verify-email-content';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VerifyEmailPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-1">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md flex flex-col gap-6">
            <div className="mb-4 flex justify-center">
              <Image src="/assets/logo.webp" alt="Logo" width={150} height={150} />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold">Email Verification</h1>
            </div>

            <Suspense
              fallback={
                <Alert>
                  <AlertDescription>Loading...</AlertDescription>
                </Alert>
              }
            >
              <VerifyEmailContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
