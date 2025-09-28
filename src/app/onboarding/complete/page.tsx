
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { completeOnboarding } from '../actions';
import { useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

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
  const { refreshUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  // This action marks the user's profile as complete on the backend.
  useEffect(() => {
    startTransition(async () => {
        const state = await completeOnboarding();
        if (state.error) {
            toast({
                title: "Onboarding Error",
                description: `Could not finalize onboarding: ${state.error}. Redirecting to add a property.`,
                variant: "destructive",
            });
            // Redirect the user back to the required step if there's an error.
            router.push('/onboarding/add-property');
        } else if (state.success) {
            toast({
                title: "Setup Complete!",
                description: "You're all set and ready to go.",
            });
            // Refresh the user context to get the `profileComplete: true` flag.
            await refreshUser();
        }
    });
  }, [toast, refreshUser, router]);


  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="mx-auto max-w-2xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={4} />
        <Card className="w-full text-center">
            <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                {isPending ? <Loader2 className="h-8 w-8 animate-spin" /> : <CheckCircle2 className="h-8 w-8" />}
            </div>
            <CardTitle className="text-3xl">
                {isPending ? "Finalizing Setup..." : "Setup Complete!"}
            </CardTitle>
            <CardDescription className="text-lg">
                {isPending ? "Please wait while we apply the final settings." : "You're all set and ready to go."}
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="mb-6 text-muted-foreground">
                You can now manage your properties, track payments, and communicate with tenants from your dashboard.
            </p>
             <Button size="lg" onClick={() => router.push('/dashboard')} disabled={isPending}>
                Go to Dashboard
             </Button>
            </CardContent>
        </Card>
       </div>
    </div>
  );
}
