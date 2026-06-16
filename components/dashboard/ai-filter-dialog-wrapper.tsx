'use client';

import { useState, useEffect } from 'react';
import { AIFilterDialog } from './ai-filter-dialog';

interface AIFilterDialogWrapperProps {
  initialShow: boolean;
}

const STORAGE_KEY = 'ai-filter-dialog-shown';

/**
 * This component shows the AI filter dialog once per user.
 * After being shown or closed once, it will not appear again.
 */
export function AIFilterDialogWrapper({ initialShow }: AIFilterDialogWrapperProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Check if dialog has been shown before
    if (typeof window !== 'undefined') {
      const hasBeenShown = localStorage.getItem(STORAGE_KEY);

      if (!hasBeenShown) {
        // First time - show the dialog
        setIsDialogOpen(true);
        // Mark as shown
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    }
  }, []);

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  return (
    <AIFilterDialog
      isOpen={isDialogOpen}
      onClose={handleClose}
    />
  );
}