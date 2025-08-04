
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function LandlordWelcomePage() {
  const router = useRouter();
  // In a real app, you'd get the landlord's name from your auth context/session.
  const landlordName = "Alex"; 

  const handleContinue = () => {
    router.push('/onboarding/add-property');
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
              Let’s get your rental business set up — we’ll help you add properties, configure payments, and invite tenants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button size="lg" onClick={handleContinue}>
              Let's Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
