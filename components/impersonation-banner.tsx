'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';
import { stopImpersonationAction } from '@/actions/impersonation.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ImpersonationBannerProps {
  targetUser: {
    name: string;
    email: string;
  };
  originalAdmin: {
    name: string;
    email: string;
  };
}

export function ImpersonationBanner({
  targetUser,
  originalAdmin,
}: ImpersonationBannerProps) {
  const router = useRouter();
  const [isEnding, setIsEnding] = useState(false);

  async function handleStopImpersonation() {
    setIsEnding(true);
    try {
      const result = await stopImpersonationAction();
      if (result.success) {
        router.push('/admin/users');
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    } finally {
      setIsEnding(false);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">
            Impersonating {targetUser.name} ({targetUser.email}) as{' '}
            {originalAdmin.name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStopImpersonation}
          disabled={isEnding}
          className="text-yellow-900 hover:bg-yellow-600 hover:text-yellow-50"
        >
          {isEnding ? 'Ending...' : 'End Impersonation'}
          <X className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
