'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { registerAction } from '@/actions/auth.actions';

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await registerAction(formData);

      if (result.success) {
        setSuccess('Registration successful! Logging you in...');

        // Auto-login using client-side signIn (this properly sets cookies)
        const loginResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (loginResult?.ok) {
          router.push('/dashboard/pricing');
          router.refresh();
        } else {
          // Registration succeeded but auto-login failed, redirect to login
          setSuccess('Registration successful! Please log in.');
          setTimeout(() => router.push('/login'), 1500);
        }
      } else {
        setError(result.error || 'Registration failed');
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
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your information to get started
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Field className="gap-1">
          <FieldLabel htmlFor="name" className="text-sm">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            required
            disabled={isLoading}
          />
        </Field>

        <Field className="gap-1">
          <FieldLabel htmlFor="email" className="text-sm">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
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
            minLength={8}
          />
          <FieldDescription className="text-xs">
            At least 8 characters with uppercase, lowercase, and number
          </FieldDescription>
        </Field>

        <Field className="gap-1">
          <FieldLabel htmlFor="confirmPassword" className="text-sm">Confirm Password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            disabled={isLoading}
          />
        </Field>

        <Field>
          <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          Already have an account?{' '}
          <Link href="/login" className="underline underline-offset-4">
            Login
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
