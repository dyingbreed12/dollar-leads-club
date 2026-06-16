import { GalleryVerticalEnd } from 'lucide-react';
import { ResetPasswordForm } from '@/components/reset-password-form';
import Image from 'next/image';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="grid min-h-svh lg:grid-cols-1">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="mb-4 flex justify-center">
              <Image src="/assets/logo.webp" alt="Logo" width={150} height={150} />
            </div>
            <ResetPasswordForm token={params.token} />
          </div>
        </div>
      </div>

    </div>
  );
}
