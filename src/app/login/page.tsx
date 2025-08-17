
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '@/lib/firebase/client-app';
import { useToast } from '@/hooks/use-toast';
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
import { PropelLiteLogo, GoogleIcon } from '@/components/icons/logo';
import { Separator } from '@/components/ui/separator';

type LoginError = {
  code?: string;
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const redirectPath = searchParams.get('redirect') || '/';

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'session_expired') {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, toast, router]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            let errorMessage = 'Login failed. An unexpected error occurred.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
                const textError = await response.text();
                console.error('Failed to parse backend error response as JSON. Received:', textError);
                errorMessage = `Login failed. Server returned status ${response.status}.`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
      
      if (data.role === 'landlord' && !data.profileComplete) {
          router.push('/onboarding/welcome');
      } else if (data.role === 'tenant') {
          router.push('/tenant-portal');
      } else {
          router.push(redirectPath);
      }

    } catch (error) {
        const typedError = error as LoginError & { status?: number };
        console.error("Login page error:", typedError);
        let errorMessage = 'An unexpected error occurred.';
        
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typedError.code) { // Firebase client-side errors
            switch(typedError.code) {
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password. Please try again.';
                    break;
                case 'auth/too-many-requests':
                     errorMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
                     break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                default:
                    errorMessage = "An unknown error occurred. Please try again.";
            }
        }

        toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }, [email, password, router, toast, redirectPath]);
  
  const handleSocialLogin = (provider: string) => {
     toast({
        title: "Coming Soon!",
        description: `${provider} login is not yet implemented.`,
      });
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <PropelLiteLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Welcome back to RentEase</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <fieldset disabled={isLoading} className="space-y-4">
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
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
                </div>
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[3.25rem] -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
               <Button type="submit" className="w-full">
                  {isLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
               </Button>
            </CardContent>
          </fieldset>
        </form>
        
        <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">
              OR
            </span>
        </div>
          
        <CardFooter className="flex flex-col gap-4">
           <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign up
            </Link>
          </p>
          <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('Google')}>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
