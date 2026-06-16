import { RegisterForm } from '@/components/register-form';
import { AuthSidebar } from '@/components/auth-sidebar';
import Image from 'next/image';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function RegisterPage() {
  // Check if user is already authenticated
  const session = await auth();

  if (session?.user) {
    // Redirect based on role
    if (session.user.role === 'admin') {
      redirect('/admin/dashboard');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="mb-4 flex justify-center">
              <Image src="/assets/logo.webp" alt="Logo" width={150} height={150} />
            </div>
            <RegisterForm />
          </div>
        </div>
      </div>
      <AuthSidebar />
    </div>
  );
}
