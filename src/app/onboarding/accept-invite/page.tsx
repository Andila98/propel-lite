
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropelLiteLogo } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const token = searchParams.get('token');

  if (!token) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">Invalid Invitation</CardTitle>
                    <CardDescription>The invitation link is missing a token. Please use the link provided in the invitation.</CardDescription>
                </CardHeader>
                <CardFooter>
                     <Link href="/login" className="w-full">
                        <Button className="w-full">Go to Login</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          password,
          token,
        }),
      });

      if (!response.ok) {
        let errorData = { error: 'Failed to create account due to a server error.' };
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("Failed to parse error response as JSON.", parseError);
        }
        throw new Error(errorData.error || 'Failed to create account.');
      }

      toast({
        title: "Account Created!",
        description: "Your manager account has been set up. Please log in.",
      });

      router.push('/login');

    } catch (error: unknown) {
      const typedError = error as Error;
      console.error("Accept Invite Error:", typedError);
      toast({
        title: "Registration Failed",
        description: typedError.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <PropelLiteLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Complete Your Account Setup</CardTitle>
          <CardDescription>You&apos;ve been invited to join as a manager. Set your name and password to get started.</CardDescription>
        </CardHeader>
        <form onSubmit={handleAcceptInvite}>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password">Choose a Password</Label>
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
             <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
             </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
