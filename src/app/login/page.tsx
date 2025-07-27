
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { PropelLiteLogo, GoogleIcon, GithubIcon } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('landlord@example.com');
  const [password, setPassword] = useState('password');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd have auth logic here.
    // We'll simulate a successful login and redirect to onboarding for new users.
    if (email && password) {
       toast({
        title: "Login Successful",
        description: "Redirecting to onboarding...",
      });
      router.push('/onboarding/welcome');
    } else {
      toast({
        title: "Login Failed",
        description: "Please enter email and password.",
        variant: "destructive",
      });
    }
  };
  
  const handleSocialLogin = (provider: string) => {
     toast({
        title: "Coming Soon!",
        description: `${provider} login is not yet implemented.`,
      });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <PropelLiteLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Welcome to RentEase</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
             <Button type="submit" className="w-full">Sign In</Button>
          </CardContent>
        </form>
        
        <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">
              OR
            </span>
        </div>
          
        <CardFooter className="flex flex-col gap-4">
          <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('Google')}>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('GitHub')}>
            <GithubIcon className="mr-2 h-4 w-4" />
            Sign in with GitHub
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
