'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { updatePaymentMethodAction } from '@/actions/subscription.actions';

// Initialize Stripe with error handling
const getStripePromise = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
    return null;
  }

  return loadStripe(publishableKey);
};

const stripePromise = getStripePromise();

interface UpdatePaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Payment Form Component (wrapped in Stripe Elements)
 */
function PaymentForm({ clientSecret, onSuccess, onCancel }: UpdatePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the SetupIntent
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/billing`,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Failed to process payment method');
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method) {
        // Update payment method in backend
        const result = await updatePaymentMethodAction(
          setupIntent.payment_method as string
        );

        if (!result.success) {
          setError(result.error || 'Failed to update payment method');
          setIsProcessing(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError('Failed to process payment method');
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element */}
      <div className="rounded-lg border bg-card p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: {
                address: {
                  country: 'auto',
                },
              },
            },
          }}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <AlertDescription>
            Payment method updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || isProcessing || success}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : success ? (
            'Updated!'
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Update Payment Method
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing || success}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * UpdatePaymentForm Component (Main Export)
 *
 * Wrapper component that provides Stripe Elements context
 * Uses Stripe Payment Element for secure card input
 */
export function UpdatePaymentForm(props: UpdatePaymentFormProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if Stripe is properly configured
  if (!stripePromise) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0F172A',
            colorBackground: '#ffffff',
            colorText: '#0F172A',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentForm {...props} />
    </Elements>
  );
}
