
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PropelLiteLogo } from '@/components/icons/logo';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = async (data) => {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setIsSubmitted(true);
    } catch (error: unknown) {
      const typedError = error as Error & { code?: string };
      console.error('Forgot Password Error:', typedError);
      
      let description = 'An unexpected error occurred. Please try again.';
      if (typedError.code === 'auth/user-not-found') {
        // To prevent user enumeration, we show a generic message even if user doesn't exist
        setIsSubmitted(true);
        return;
      } else if (typedError.message) {
        description = typedError.message;
      }

      toast({
        title: 'Request Failed',
        description,
        variant: 'destructive',
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
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? 'Check your inbox for a password reset link.'
              : "Enter your email to receive a password reset link."
            }
          </CardDescription>
        </CardHeader>
        
        {isSubmitted ? (
             <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                    If an account with this email exists, a link to reset your password has been sent.
                </p>
            </CardContent>
        ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    {...register('email')}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                </Button>
            </CardContent>
            </form>
        )}
        
        <CardFooter className="flex-col items-center gap-2 border-t pt-6">
          <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary">
            <AnimatedBackIcon className="h-4 w-4 mr-1" />
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
