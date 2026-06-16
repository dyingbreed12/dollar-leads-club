'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toggleLeadAccessAction } from '@/actions/admin.actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeadAccessToggleProps {
  userId: string;
  enabled: boolean;
}

export function LeadAccessToggle({ userId, enabled }: LeadAccessToggleProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    setError(null);

    const result = await toggleLeadAccessAction(userId, checked);

    if (result.success) {
      toast.success(result.message || 'Lead access updated successfully');
    } else {
      setError(result.error || 'Failed to toggle lead access');
    }

    setIsLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Switch
          id="lead-access-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
        <Label htmlFor="lead-access-toggle" className="text-sm font-medium">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </span>
          ) : enabled ? (
            'Enabled'
          ) : (
            'Disabled'
          )}
        </Label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
