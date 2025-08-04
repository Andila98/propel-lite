
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { clearOnboardingData } from '@/hooks/use-onboarding-form';
import { useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function LandlordWelcomePage() {
  const router = useRouter();
  const { toast } = useToast();
  // In a real app, you'd get the landlord's name from your auth context/session.
  const landlordName = "Alex"; 

  useEffect(() => {
    // Clear any partial onboarding data if the user lands here.
    clearOnboardingData();
  }, []);

  const handleContinue = () => {
    router.push('/onboarding/add-property');
  };

  const handleQuickStart = () => {
    // In a real app, this would trigger a backend process
    // to seed the database with sample data for the user.
    toast({
      title: "Quick Start Initialized!",
      description: "We're adding some sample data to your account.",
    });
    // For this prototype, we just navigate to the end of onboarding.
    // The dashboard already loads mock data if the DB is empty.
    router.push('/onboarding/complete');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Progress value={20} className="w-full" />
        <Card className="w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Rocket className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Welcome to RentEase, {landlordName}!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground px-6">
              Let’s get your rental business set up. You can add your properties manually or use our Quick Start to explore with sample data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleContinue}>
              Start Manual Setup
            </Button>
            <Button size="lg" variant="outline" onClick={handleQuickStart}>
              <Sparkles className="mr-2 h-4 w-4" />
              Quick Start with Sample Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
