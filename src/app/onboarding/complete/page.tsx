
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { completeOnboarding } from '../actions';
import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);

  // This action marks the user's profile as complete on the backend.
  useEffect(() => {
    async function finalize() {
        setLoading(true);
        const state = await completeOnboarding();
        if (state.error) {
            toast({
                title: "Error",
                description: `Could not finalize onboarding: ${state.error}`,
                variant: "destructive",
            });
        } else if (state.success) {
            toast({
                title: "Setup Complete!",
                description: "You're all set and ready to go.",
            });
            await refreshUser();
        }
        setLoading(false);
    }
    finalize();
  }, [toast, refreshUser]);


  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="mx-auto max-w-2xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={4} />
        <Card className="w-full text-center">
            <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <CheckCircle2 className="h-8 w-8" />}
            </div>
            <CardTitle className="text-3xl">
                {loading ? "Finalizing Setup..." : "Setup Complete!"}
            </CardTitle>
            <CardDescription className="text-lg">
                {loading ? "Please wait while we apply the final settings." : "You're all set and ready to go."}
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="mb-6 text-muted-foreground">
                You can now manage your properties, track payments, and communicate with tenants from your dashboard.
            </p>
             <Button size="lg" onClick={() => router.push('/dashboard')} disabled={loading}>
                Go to Dashboard
             </Button>
            </CardContent>
        </Card>
       </div>
    </div>
  );
}

    