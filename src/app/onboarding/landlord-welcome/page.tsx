
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Sparkles, PlayCircle } from 'lucide-react';
import { clearOnboardingData } from '@/hooks/use-onboarding-form';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Stepper } from '@/components/ui/stepper';
import { useAuth } from '@/hooks/use-auth';
import { completeOnboarding } from './actions';

const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];


export default function LandlordWelcomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const landlordName = user?.name || "there"; 

  useEffect(() => {
    // Clear any partial onboarding data if the user lands here.
    clearOnboardingData();
  }, []);

  const handleContinue = () => {
    router.push('/onboarding/add-property');
  };

  const handleQuickStart = async () => {
    toast({
      title: "Quick Start Initialized!",
      description: "We're setting up your account with sample data.",
    });

    const result = await completeOnboarding();

    if (result.error) {
       toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    
    // For this prototype, we just navigate to the end of onboarding.
    // The dashboard already loads mock data if the DB is empty.
    router.push('/onboarding/complete');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Stepper steps={onboardingSteps} currentStep={0} />
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Rocket className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Welcome to RentEase, {landlordName}!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground px-6">
              Let’s get your rental business set up. You can add your properties manually or use our Quick Start to explore with sample data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="aspect-video w-full max-w-xl mx-auto rounded-lg overflow-hidden relative group cursor-pointer bg-muted">
                <Image 
                    src="https://placehold.co/1280x720.png"
                    alt="Onboarding video thumbnail"
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="app interface screenshot"
                />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <PlayCircle className="h-16 w-16 text-white/80 group-hover:scale-110 transition-transform" />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={handleContinue}>
                Start Manual Setup
                </Button>
                <Button size="lg" variant="outline" onClick={handleQuickStart}>
                <Sparkles className="mr-2 h-4 w-4" />
                Quick Start with Sample Data
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
