
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
import { Progress } from '@/components/ui/progress';

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
      <div className="mx-auto max-w-2xl space-y-4">
        <Progress value={0} className="w-full" />
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
            <RadioGroup 
              onValueChange={(value: 'landlord' | 'tenant') => setRole(value)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <Label 
                htmlFor="landlord"
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                  role === 'landlord' && "border-primary",
                  "cursor-pointer"
                )}
              >
                <RadioGroupItem value="landlord" id="landlord" className="sr-only" />
                <Building className="mb-3 h-8 w-8" />
                <span className="font-bold">I'm a Landlord</span>
                <span className="text-sm text-muted-foreground">I want to manage my properties.</span>
              </Label>
              <Label
                htmlFor="tenant"
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                  role === 'tenant' && "border-primary",
                  "cursor-pointer"
                )}
              >
                <RadioGroupItem value="tenant" id="tenant" className="sr-only" />
                <User className="mb-3 h-8 w-8" />
                <span className="font-bold">I'm a Tenant</span>
                <span className="text-sm text-muted-foreground">I want to view my lease and pay rent.</span>
              </Label>
            </RadioGroup>
            
            <Button size="lg" onClick={handleContinue} disabled={!role}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    