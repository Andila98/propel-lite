
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { PropelLiteLogo, GoogleIcon } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-app';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        // Step 1: Create the user on the client-side with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Step 2: Update the user's profile with their display name
        await updateProfile(userCredential.user, { displayName });

        // Step 3: Get the ID token from the newly created and updated user
        const idToken = await userCredential.user.getIdToken(true);

        // Step 4: Send the ID token to the backend to create the Firestore user record and set custom claims
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            // If backend provisioning fails, we should ideally delete the auth user to avoid orphaned accounts
            await userCredential.user.delete();
            throw new Error(data.error || 'Failed to provision account on the server.');
        }

        toast({
            title: "Account Created!",
            description: "Your account has been successfully created. Please log in.",
        });
        router.push('/login');

    } catch (error: any) {
        console.error("Registration Error:", error);
        let errorMessage = "An unexpected error occurred during registration.";
        if (error.code) {
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "This email is already in use by another account.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "The password is too weak. Please use at least 6 characters.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Please enter a valid email address.";
                    break;
                default:
                    errorMessage = error.message;
            }
        } else {
             errorMessage = error.message;
        }

        toast({
            title: "Registration Failed",
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
          <CardTitle className="text-2xl">Create your RentEase account</CardTitle>
          <CardDescription>Get started managing your properties today.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <fieldset disabled={isLoading} className="space-y-4">
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
                  autoComplete="new-password"
                  placeholder="••••••••"
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
               <Button type="submit" className="w-full">
                  {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
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
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign in
            </Link>
          </p>
          <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('Google')}>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Sign up with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
