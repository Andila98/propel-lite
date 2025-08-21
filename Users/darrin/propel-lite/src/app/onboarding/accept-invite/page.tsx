
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6 text-center">
                    <h1 className="text-3xl font-bold text-destructive">Invalid Invitation</h1>
                    <p className="text-balance text-muted-foreground">
                    The invitation link is missing or invalid. Please use the link provided in the invitation email.
                    </p>
                    <div className="mt-4">
                        <Link href="/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
             <div className="hidden bg-muted lg:block">
                <Image
                src="https://placehold.co/1080x1920.png"
                alt="Image"
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                data-ai-hint="office building lobby"
                />
            </div>
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      toast({
        title: "Account Created!",
        description: "Your manager account has been set up. Please log in.",
      });

      router.push('/login');

    } catch (error: any) {
      console.error("Accept Invite Error:", error);
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
        <div className="flex items-center justify-center py-12">
            <div className="mx-auto grid w-[350px] gap-6">
                <div className="grid gap-2 text-center">
                     <div className="mb-4 flex justify-center">
                        <PropelLiteLogo className="h-12 w-12" />
                    </div>
                    <h1 className="text-3xl font-bold">You're Invited!</h1>
                    <p className="text-balance text-muted-foreground">
                        Complete your account setup to join as a manager.
                    </p>
                </div>
                <form onSubmit={handleAcceptInvite} className="grid gap-4">
                    <div className="grid gap-2">
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
                    <div className="grid gap-2 relative">
                        <Label htmlFor="password">Choose a Password</Label>
                        <Input 
                            id="password" 
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-[2.25rem] text-muted-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Create Account & Join"}
                    </Button>
                </form>
            </div>
        </div>
         <div className="hidden bg-muted lg:block">
            <Image
                src="https://placehold.co/1080x1920.png"
                alt="Image"
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                data-ai-hint="team collaboration office"
            />
        </div>
    </div>
  );
}
