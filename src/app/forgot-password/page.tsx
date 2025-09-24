
"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2 } from 'lucide-react';

const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset link.');
      }
      
      toast({
        title: "Check Your Email",
        description: result.message,
      });

      setIsSuccess(true);

    } catch (error: any) {
       toast({
        title: "Error",
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
              <PropelLiteLogo className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold">Forgot your password?</h1>
            <p className="text-balance text-muted-foreground">
              {isSuccess 
                ? "A password reset link has been sent to your email address (if it exists in our system)."
                : "No problem. Enter your email and we'll send you a link to reset it."
              }
            </p>
          </div>
          {!isSuccess ? (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
                 {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          ) : (
             <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Didn't receive an email? Check your spam folder or try again.
                </p>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="underline text-accent">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://picsum.photos/seed/forgot-password/1080/1920"
          alt="Abstract pattern"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          data-ai-hint="serene abstract pattern"
        />
      </div>
    </div>
  );
}
