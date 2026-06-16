'use client';

import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentMethodCardProps {
  paymentMethod: {
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
      funding?: string;
    };
  } | null;
  onUpdateClick: () => void;
}

/**
 * PaymentMethodCard Component
 *
 * Displays current payment method details (card brand, last 4, expiry)
 * Shows "No payment method" state if none exists
 * Provides button to update payment method
 */
export function PaymentMethodCard({
  paymentMethod,
  onUpdateClick,
}: PaymentMethodCardProps) {
  // Helper to format card brand
  const formatCardBrand = (brand: string): string => {
    const brandMap: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  // Helper to get card brand color
  const getCardBrandColor = (brand: string): string => {
    const colorMap: Record<string, string> = {
      visa: 'text-blue-600',
      mastercard: 'text-orange-600',
      amex: 'text-blue-500',
      discover: 'text-orange-500',
    };
    return colorMap[brand.toLowerCase()] || 'text-gray-600';
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-muted p-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Payment Method</h3>
            {paymentMethod?.card ? (
              <div className="mt-2 space-y-1">
                <p className={`text-sm font-medium ${getCardBrandColor(paymentMethod.card.brand)}`}>
                  {formatCardBrand(paymentMethod.card.brand)}
                </p>
                <p className="text-sm text-muted-foreground">
                  •••• •••• •••• {paymentMethod.card.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {String(paymentMethod.card.exp_month).padStart(2, '0')}/
                  {paymentMethod.card.exp_year}
                </p>
                {paymentMethod.card.funding && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {paymentMethod.card.funding}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No payment method on file
              </p>
            )}
          </div>
        </div>
        <Button onClick={onUpdateClick} variant="outline" size="sm">
          {paymentMethod?.card ? 'Update' : 'Add Card'}
        </Button>
      </div>
    </div>
  );
}
