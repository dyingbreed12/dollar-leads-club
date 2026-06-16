'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';


interface AIFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIFilterDialog({ isOpen, onClose }: AIFilterDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        // Reduced max-width slightly and kept p-0 for tight control
        className="sm:max-w-[600px] p-0 overflow-hidden"
      >

        {/* Customized Header Section - Kept p-4 but title/description condensed below */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 text-center text-white">
          <DialogTitle className="text-lg font-bold mb-1">
            🔥 NEW AI FILTRATION UPDATE 🔥
          </DialogTitle>
          {/* Reduced text size and gap for a more compact indicator list */}
          <DialogDescription className="text-xs font-medium flex flex-wrap justify-center gap-x-2 text-white/90">
            <span>✗ Sold Leads</span>
            <span>•</span>
            <span>✗ On-Market Leads</span>
            <span>•</span>
            <span>✗ Disconnected Numbers</span>
          </DialogDescription>
        </div>

        {/* Body content: Reduced p-6 to p-4 and space-y-4 to space-y-3 */}
        <div className="p-4 space-y-3">
          {/* Condensed Body Text - Text size reduced to xs for a tighter fit */}
          <p className="text-xs text-foreground leading-relaxed">
            <strong className="font-bold">We just launched our brand-new AI Lead Filtration System.</strong> Because of the huge surge in signups and tens of thousands of leads running through our old system, a small number of sold/on-market/disconnected leads slipped through.
          </p>
          <p className="text-xs text-foreground leading-relaxed">
            This update should <strong className="font-bold">dramatically improve filtration and accuracy.</strong>
          </p>

          {/* Support/Replacement Link - Reduced icon size and text size */}
          <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1">
            <Mail className="size-3 flex-shrink-0 mt-[1px]" />
            <span className="flex-1">
              A few may still slip by — if you catch one, email
              <a
                href="mailto:support@dollarleads.com"
                className="font-semibold text-primary underline hover:text-primary/80 transition-colors ml-1 mr-1"
              >
                support@dollarleads.com
              </a>
              and we'll replace it.
            </span>
          </p>

          {/* Video Call to Action - Reduced padding and text size */}
          <div className="bg-primary/10 border border-primary/30 rounded-md p-2 text-center mt-3">
            <p className="text-primary font-semibold text-xs">
              👉 Watch the video for full details
            </p>
          </div>

          {/* YouTube Video Embed - Aspect ratio container remains the same for the video */}
          <div className="relative w-full rounded-lg overflow-hidden border border-border mb-0" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/xUROTn0tK1c?autoplay=1&mute=0"
              title="AI Filtration System Update"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Footer: Reduced padding from p-4 to p-3 */}
        <DialogFooter className="p-3 bg-gray-50 dark:bg-gray-900/50">
          {/* Button kept size lg for prominence */}
          <Button onClick={onClose} className="w-full" size="lg" variant="default">
            GOT IT!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}