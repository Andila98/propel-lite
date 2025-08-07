
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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('landlord@demo.com');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        // 1. Authenticate with Firebase on the client
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Get the Firebase ID token from the authenticated user
        const idToken = await user.getIdToken();
        const idTokenResult = await user.getIdTokenResult();
        const role = idTokenResult.claims.role || 'tenant';
        
        // 3. Send the ID token to our backend to create a session cookie
        const serverResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!serverResponse.ok) {
            const errorData = await serverResponse.json();
            throw new Error(errorData.error || "Failed to create server session.");
        }

        toast({
            title: "Login Successful",
            description: "Redirecting to your dashboard...",
        });

        // 4. Redirect based on role
        if (role === 'tenant') {
            router.push('/tenant-portal');
        } else {
            router.push('/');
        }

    } catch (error: any) {
        console.error("Login Error:", error);
        let errorMessage = "An unknown error occurred.";
        if (error.code) { // Firebase client-side errors
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password. Please try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many login attempts. Please try again later.';
                    break;
                default:
                    errorMessage = 'Login failed. Please check your credentials.';
            }
        } else { // Server-side or other errors
             errorMessage = error.message;
        }
        toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
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
            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
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
                className="absolute right-3 top-9 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
             <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
             </Button>
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
