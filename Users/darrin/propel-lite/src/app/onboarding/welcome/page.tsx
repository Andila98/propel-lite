
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Rocket, User, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Stepper } from '@/components/ui/stepper';

const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];

export default function WelcomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<'landlord' | 'tenant' | null>(null);

  const handleContinue = () => {
    if (role === 'landlord') {
      router.push('/onboarding/landlord-welcome');
    } else if (role === 'tenant') {
      // For now, tenant onboarding can lead to a simplified portal or complete page.
      // We will redirect to the tenant portal for this example.
      toast({
        title: "Welcome, Tenant!",
        description: "You're being redirected to your portal.",
      });
      router.push('/tenant-portal');
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a role to continue.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
         <div className="hidden sm:block">
            <Stepper steps={onboardingSteps} currentStep={-1} />
        </div>
        <Card className="w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Rocket className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Welcome to RentEase!</CardTitle>
            <CardDescription className="text-lg">
              Let's get your account set up. First, tell us who you are.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">Select your account type to get started.</p>
            <Button size="lg" onClick={() => router.push('/onboarding/landlord-welcome')}>
              I'm a Landlord
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
