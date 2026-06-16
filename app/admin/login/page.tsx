import { AdminLoginForm } from "@/components/admin-login-form"
import { AuthSidebar } from "@/components/auth-sidebar"
import Image from "next/image"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getImpersonationStatus } from "@/actions/impersonation.actions"

export default async function AdminLoginPage() {
  // Check if user is already authenticated
  const session = await auth();

  if (session?.user) {
    // Check if admin is currently impersonating a user
    const impersonationStatus = await getImpersonationStatus();

    // If admin, redirect to admin dashboard; otherwise redirect to user dashboard
    if (session.user.role === 'admin' && !impersonationStatus.isImpersonating) {
      redirect('/admin/dashboard');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-1">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="mb-4 flex justify-center">
              <Image src="/assets/logo.webp" alt="Logo" width={150} height={150} />
            </div>
            <AdminLoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
