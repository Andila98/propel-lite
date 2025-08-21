
"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropelLiteLogo } from '@/components/icons/logo';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link.');
      }
      
      toast({
        title: "Check your email",
        description: data.message,
      });
      setIsSubmitted(true);

    } catch (error: any) {
      toast({
        title: "Request Failed",
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
            <h1 className="text-3xl font-bold">Forgot your password?</h1>
             <p className="text-balance text-muted-foreground">
              {isSubmitted 
                ? "A password reset link has been sent to your email if an account exists."
                : "No problem. Enter your email address and we'll send you a link to reset it."
              }
            </p>
          </div>
          {!isSubmitted ? (
            <form onSubmit={handleResetRequest}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
                    </Button>
                </div>
            </form>
            ) : (
            <div className="text-center text-sm text-muted-foreground">
                If you don&apos;t see the email, please check your spam folder.
            </div>
            )}
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="underline">
                Back to Login
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
          data-ai-hint="serene modern interior"
        />
      </div>
    </div>
  );
}
