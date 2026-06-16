import { GalleryVerticalEnd } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/forgot-password-form';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-1">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs ">
            <div className="mb-4 flex justify-center">
              <Image src="/assets/logo.webp" alt="Logo" width={150} height={150} />
            </div>
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
