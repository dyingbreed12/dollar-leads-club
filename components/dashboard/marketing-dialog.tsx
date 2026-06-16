'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface MarketingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userSubscriptionPlan: string | null;
  userRole: string | null;
}

export function MarketingDialog({
  isOpen,
  onClose,
  userRole,
  userSubscriptionPlan
}: MarketingDialogProps) {
  const [shouldShow, setShouldShow] = useState(false);

useEffect(() => {
  // Check for URL parameter override
  const urlParams = new URLSearchParams(window.location.search);
  const forceShow = urlParams.get('showMarketing') === 'true';

  // Check if dialog has been shown before
  const hasSeenDialog = localStorage.getItem('marketing-dialog-v2-dismissed');

  // Check if user is a free user (role = 'user' and no subscription plan)
  const isFreeUser = userRole === 'user' && (!userSubscriptionPlan || userSubscriptionPlan === '');

  // Show if: free user OR forced via URL parameter OR not previously dismissed
  if (isFreeUser || forceShow || !hasSeenDialog) {
    setShouldShow(true);
  }
}, [userRole, userSubscriptionPlan]);

  const handleClose = () => {
    // Mark dialog as dismissed in localStorage
    localStorage.setItem('marketing-dialog-v2-dismissed', 'true');
    setShouldShow(false);
    onClose();
  };

  return (
    <Dialog open={isOpen && shouldShow} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">

        {/* Customized Header Section */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-center text-white">
          <DialogTitle className="text-lg font-bold mb-1">
            🚨 IMPORTANT ANNOUNCEMENT 🚨
          </DialogTitle>
          <DialogDescription className="text-xs font-medium flex flex-wrap justify-center gap-x-2 text-white/90">
            <span>🛑 V1 Nationwide Leads SOLD OUT</span>
            <span>•</span>
            <span>🔥 V2 Market-Specific Leads Dropping Soon</span>
          </DialogDescription>
        </div>

        {/* Body content */}
        <div className="p-4 space-y-3">
          {/* Main announcements */}
          <div className="space-y-2">
            <p className="text-sm text-foreground leading-relaxed">
              <strong className="font-bold">🛑 V1 Nationwide Leads are officially SOLD OUT!</strong>
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              <strong className="font-bold">🔥 V2 Instant Market-Specific Leads dropping soon.</strong>
            </p>
          </div>

          {/* YouTube Video Embed */}
          <div
            className="relative w-full rounded-lg overflow-hidden border border-border mb-0"
            style={{ paddingBottom: '56.25%' }}
          >
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/fGlmBREBmUU?autoplay=1&mute=0"
              title="V2 Market-Specific Leads Announcement"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Money Back Guarantee highlight */}
        {/* <div className="bg-green-500/10 border border-green-500/30 rounded-md p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Shield className="size-5 text-green-500" />
            <p className="text-green-600 dark:text-green-400 font-semibold text-sm">
              7 Day Money Back Guarantee
            </p>
          </div>
        </div> */}

        {/* Footer */}
        <DialogFooter className="p-3 bg-gray-50 dark:bg-gray-900/50">
          <Button onClick={handleClose} className="w-full" size="lg" variant="default">
            GOT IT!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}