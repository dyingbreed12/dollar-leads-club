import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CompleteRegistrationForm } from './complete-registration-form';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">
          Loading registration form...
        </p>
      </div>
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CompleteRegistrationForm />
    </Suspense>
  );
}
