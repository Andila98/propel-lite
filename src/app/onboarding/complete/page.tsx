
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { useActionState } from 'react';
import { completeOnboarding } from '../actions';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction] = useActionState(completeOnboarding, { success: false });

  // This action marks the user's profile as complete on the backend.
  useEffect(() => {
    formAction();
  }, [formAction]);

  useEffect(() => {
    if (state.error) {
      toast({
        title: "Error",
        description: `Could not finalize onboarding: ${state.error}`,
        variant: "destructive",
      });
    }
     if (state.success) {
      toast({
        title: "Setup Complete!",
        description: "You're all set and ready to go.",
      });
    }
  }, [state, toast]);

  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="mx-auto max-w-2xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={4} />
        <Card className="w-full text-center">
            <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Setup Complete!</CardTitle>
            <CardDescription className="text-lg">
                You're all set and ready to go.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="mb-6 text-muted-foreground">
                You can now manage your properties, track payments, and communicate with tenants from your dashboard.
            </p>
             <Button size="lg" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
        </Card>
       </div>
    </div>
  );
}
