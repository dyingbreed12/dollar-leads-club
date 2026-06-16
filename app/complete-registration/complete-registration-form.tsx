'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import { verifyCheckoutSessionAction } from '@/actions/public-checkout.actions';
import { completeRegistrationAction } from '@/actions/complete-registration.actions';
import { checkEmailExistsAction } from '@/actions/auth.actions';
import Link from 'next/link';

export function CompleteRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<{
    customerEmail: string;
    customerName: string;
    planName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Existing user state
  const [isShowingLoginForm, setIsShowingLoginForm] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [planName, setPlanName] = useState('');
  const [status, setStatus] = useState('');

  // Verify checkout session on mount
  useEffect(() => {
    async function verifySession() {
      if (!sessionId) {
        setError('No checkout session found. Please try subscribing again.');
        setLoading(false);
        return;
      }

      const result = await verifyCheckoutSessionAction(sessionId);

      console.log('result', result);

      if (!result.success) {
        setError(
          result.error || 'Invalid checkout session. Please try again.'
        );
        setLoading(false);
        return;
      }

      if (result.session) {
        setSessionData({
          customerEmail: result.session.customerEmail,
          customerName: result.session.customerName,
          planName: result.session.planName,
        });
        // Initialize form fields with Stripe data
        setEmail(result.session.customerEmail);
        setName(result.session.customerName);
        setCustomerId(result.session.customerId);
        setSubscriptionId(result.session.subscriptionId);
        setPlanName(result.session.planName);
        setStatus(result.session.status);

        // Check if email already exists in the database
        const emailCheckResult = await checkEmailExistsAction(
          result.session.customerEmail
        );

        if (emailCheckResult.success && emailCheckResult.exists) {
          // User exists - show login form immediately
          setIsShowingLoginForm(true);

          // Set message - webhook will handle the actual subscription update
          const newPlanDisplay =
            result.session.planName === 'diamond-lead'
              ? 'Diamond Lead Club (DLC+)'
              : 'Dollar Lead Club (DLC)';

          setUpgradeMessage(
            `Your email already exists. Your payment for ${newPlanDisplay} was successful! Please log in to access your subscription.`
          );
        }
        // If email doesn't exist, registration form will show by default
      }

      setLoading(false);
    }

    verifySession();
  }, [sessionId]);

  const validatePassword = (pass: string): string => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email || !email.trim()) {
      setPasswordError('Email is required');
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    // If showing login form, handle login
    if (isShowingLoginForm) {
      setSubmitting(true);
      setPasswordError('');

      try {
        const result = await signIn('credentials', {
          email: email.trim(),
          password,
          redirect: false,
        });

        if (result?.error) {
          setPasswordError('Invalid email or password');
          setSubmitting(false);
        } else {
          toast.success('Success!', {
            description: 'Logged in successfully! Redirecting to dashboard...',
          });

          // Redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        }
      } catch (error) {
        console.error('Login error:', error);
        setPasswordError('An error occurred during login');
        setSubmitting(false);
      }
      return;
    }

    // Otherwise, handle registration
    // Validate name
    if (!name || !name.trim()) {
      setPasswordError('Name is required');
      return;
    }

    // Validate password
    const passError = validatePassword(password);
    if (passError) {
      setPasswordError(passError);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (!sessionId) {
      toast.error('Error', {
        description: 'No checkout session found',
      });
      return;
    }

    setSubmitting(true);
    setPasswordError('');

    const result = await completeRegistrationAction(
      sessionId,
      customerId,
      subscriptionId,
      planName,
      status,
      email.trim(),
      name.trim(),
      password,
      confirmPassword
    );

    if (result.success) {
      // Check if this is an existing user
      if (result.isExistingUser) {
        // Show login form with message
        setIsShowingLoginForm(true);
        setUpgradeMessage(result.message || '');
        setSubmitting(false);
        toast.success('Subscription Updated!', {
          description: result.message,
        });
        return;
      }

      // New user - show success and redirect
      toast.success('Success!', {
        description: result.message || 'Account created successfully!',
      });

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to create account',
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            Verifying your payment...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-[#F0FDF4]" style={{ backgroundImage: 'url(/assets/bg-public.png)' }}>
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <AlertCircle className="size-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-900 mb-2">
            Session Error
          </h1>
          <p className="text-red-700 mb-6">{error}</p>
          <Button
            onClick={() => router.push('/pricing')}
            className="w-full"
          >
            Return to Pricing
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0FDF4] p-4" style={{ backgroundImage: 'url(/assets/bg-public.png)' }}>
        <div className="max-w-md w-full bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertCircle className="size-12 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-yellow-900 mb-2">
            No Session Data
          </h1>
          <p className="text-yellow-700 mb-6">
            Unable to retrieve session information. Please try again.
          </p>
          <Button
            onClick={() => router.push('/pricing')}
            className="w-full"
          >
            Return to Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-[#F0FDF4]" style={{ backgroundImage: 'url(/assets/bg-public.png)' }}>
      <div className="max-w-md w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="size-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="size-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isShowingLoginForm ? 'Subscription Updated!' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {isShowingLoginForm
              ? 'Please log in to access your updated subscription'
              : 'Complete your account setup to access your leads'}
          </p>
        </div>

        {/* Upgrade/Downgrade Alert */}
        {isShowingLoginForm && upgradeMessage && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900">
              {upgradeMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Registration/Login Form */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter your email"
                required
                disabled={submitting || isShowingLoginForm}
              />
            </div>

            {/* Name - Only show for registration */}
            {!isShowingLoginForm && (
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter your full name"
                  required
                  disabled={submitting}
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter your password"
                required
                disabled={submitting}
              />
              {!isShowingLoginForm && (
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and
                  number
                </p>
              )}
            </div>

            {/* Confirm Password - Only show for registration */}
            {!isShowingLoginForm && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Confirm your password"
                  required
                  disabled={submitting}
                />
              </div>
            )}

            {/* Password Error */}
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}

            {/* Subscription Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <span className="font-semibold">Plan:</span>{' '}
                {sessionData.planName === 'diamond-lead'
                  ? 'Diamond Lead Club (DLC+)'
                  : 'Dollar Lead Club (DLC)'}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Your subscription is active and ready to use!
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {isShowingLoginForm ? 'Logging In...' : 'Creating Account...'}
                </>
              ) : (
                isShowingLoginForm ? 'Log In & Access Dashboard' : 'Complete Setup & Access Dashboard'
              )}
            </Button>

            {/* Forgot Password Link - Only show for login */}
            {isShowingLoginForm && (
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        {!isShowingLoginForm && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            By completing setup, you agree to our Terms of Service and Privacy
            Policy
          </p>
        )}
      </div>
    </div>
  );
}
