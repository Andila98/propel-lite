
"use client";

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { PropelLiteLogo, GoogleIcon } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth, type User } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const RegisterSchema = z.object({
    displayName: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
      resolver: zodResolver(RegisterSchema),
  });
  
  const { register, handleSubmit, formState: { errors } } = form;

  const handleRedirect = (user: User) => {
    if (user.role === 'tenant') {
        router.push('/tenant-portal');
    } else if (!user.profileComplete) {
        router.push('/onboarding/landlord-welcome');
    } else {
        router.push('/dashboard');
    }
  }

  const handleRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
          let errorData = { error: 'Failed to create account due to a server error.' };
          try {
            errorData = await response.json();
          } catch (e) {
            console.error("Failed to parse error response as JSON.", e);
          }
          throw new Error(errorData.error || 'Failed to create account.');
        }
        
        toast({
            title: "Account Created!",
            description: "Your landlord account has been successfully created. Please log in.",
        });
        router.push('/login');

    } catch (error: any) {
        toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSocialLogin = async () => {
    setIsSocialLoading(true);
    try {
        const { user } = await loginWithGoogle();
        toast({
            title: `Welcome, ${user.name}!`,
            description: "You've successfully signed up.",
        });
        handleRedirect(user);
    } catch (error: any) {
         toast({
            title: "Social Login Failed",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsSocialLoading(false);
    }
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
             <div className="mb-4 flex justify-center">
                <PropelLiteLogo className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Enter your details below to create your landlord account.
            </CardDescription>
          </CardHeader>
          <CardContent>
           <form onSubmit={handleSubmit(handleRegister)}>
              <fieldset disabled={isLoading || isSocialLoading} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="John Doe"
                      autoComplete="name"
                      {...register("displayName")}
                    />
                    {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      {...register("email")}
                    />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
                <div className="grid gap-2 relative">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[2.25rem] text-muted-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" type="button" onClick={handleSocialLogin}>
                    {isSocialLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                    Sign up with Google
                </Button>
              </fieldset>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline text-accent">
              Sign in
            </Link>
          </div>
          </CardContent>
      </Card>
    </div>
  );
}
