'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';

export function AdminLoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        // Update session to get the latest data
        const session = await update();

        // Check if user is admin
        if (session?.user?.role !== 'admin') {
          // Sign out non-admin users
          await signIn('credentials', { redirect: false }); // This will fail, effectively logging out
          setError('Access denied. Admin privileges required.');
        } else {
          router.push('/admin/dashboard');
          router.refresh();
        }
      } else {
        setError('Admin login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      className={cn('flex flex-col gap-3', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground text-sm">
            Enter your admin credentials to access the admin portal
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field className="gap-1">
          <FieldLabel htmlFor="email" className="text-sm">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@example.com"
            required
            disabled={isLoading}
          />
        </Field>

        <Field className="gap-1">
          <FieldLabel htmlFor="password" className="text-sm">Password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            required
            disabled={isLoading}
          />
        </Field>

        <Field>
          <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Login as Admin'}
          </Button>
        </Field>

        <p className="text-center text-xs text-muted-foreground">
          Admin access only. Unauthorized access attempts are logged.
        </p>
      </FieldGroup>
    </form>
  );
}
