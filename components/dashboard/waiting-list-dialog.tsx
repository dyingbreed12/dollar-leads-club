'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createWaitingListAction } from '@/actions/waiting-list.actions';

interface WaitingListDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitingListDialog({ isOpen, onClose }: WaitingListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    emailAddress: '',
  });
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({
      firstName: '',
      lastName: '',
      emailAddress: '',
    });

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createWaitingListAction(formData);

      if (result.success) {
        toast.success(result.message || 'Successfully added to waiting list');

        // Reset form before closing
        formRef.current?.reset();

        // Close dialog
        onClose();
      } else {
        // Handle specific field errors
        const errorMessage = result.error || 'Failed to join waiting list';

        // Set field-specific errors based on error message
        if (errorMessage.includes('First name')) {
          setErrors(prev => ({ ...prev, firstName: errorMessage }));
        } else if (errorMessage.includes('Last name')) {
          setErrors(prev => ({ ...prev, lastName: errorMessage }));
        } else if (errorMessage.includes('email') || errorMessage.includes('Email')) {
          setErrors(prev => ({ ...prev, emailAddress: errorMessage }));
        } else {
          // Show generic error as toast
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: 'firstName' | 'lastName' | 'emailAddress') => {
    // Clear error when user starts typing
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        {/* Header Section */}
        <DialogHeader className="bg-gradient-to-r from-green-400 to-green-600 p-6 text-center space-y-2">
          <DialogTitle className="text-2xl font-bold text-white">
            Invite Only
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-white/90">
            Join The Waiting List
          </DialogDescription>
        </DialogHeader>

        {/* Form Section */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* First Name & Last Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="First Name"
                onChange={() => handleInputChange('firstName')}
                className={errors.firstName ? 'border-red-500' : ''}
                disabled={loading}
                required
              />
              {errors.firstName && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded">
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Last Name"
                onChange={() => handleInputChange('lastName')}
                className={errors.lastName ? 'border-red-500' : ''}
                disabled={loading}
                required
              />
              {errors.lastName && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Phone Number & Email Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="Phone Number"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                name="emailAddress"
                type="email"
                placeholder="Email Address"
                onChange={() => handleInputChange('emailAddress')}
                className={errors.emailAddress ? 'border-red-500' : ''}
                disabled={loading}
                required
              />
              {errors.emailAddress && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded">
                  {errors.emailAddress}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'APPLY'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}