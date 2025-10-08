
"use client";

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, AlertCircle, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';

import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PropelLiteLogo, GoogleIcon } from '@/components/icons/logo';
import { useAuth } from '@/hooks/use-auth';

// Enhanced validation schema
const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(254, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

interface ConnectionStatus {
  isOnline: boolean;
  lastChecked: Date;
}

export default function LoginPage() {
  const { toast } = useToast();
  const { login, loginWithGoogle, error: authError, clearError, status } = useAuth();
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: new Date()
  });

  const isLoading = status === 'loading';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: ""
    },
    mode: "onBlur"
  });

  const { register, handleSubmit, formState: { errors, isValid }, setFocus } = form;

  useEffect(() => {
    const handleOnline = () => setConnectionStatus({ isOnline: true, lastChecked: new Date() });
    const handleOffline = () => setConnectionStatus({ isOnline: false, lastChecked: new Date() });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (errors.email) {
      setFocus('email');
    } else if (errors.password) {
      setFocus('password');
    }
  }, [errors, setFocus]);

  useEffect(() => {
    const unregister = form.watch(() => {
      if (authError) {
        clearError();
      }
    });
    return () => unregister.unsubscribe();
  }, [authError, clearError, form]);


  const handleLogin = useCallback(async (data: LoginFormValues) => {
    if (!connectionStatus.isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await login(data.email, data.password);
      setLoginSuccess(true);
      // Wait for a short period to allow session to propagate and for the user to see the success state
      await new Promise(resolve => setTimeout(resolve, 750));
      // AuthRedirector will handle the navigation
    } catch {
      // The authError state in useAuth is already set.
    }
  }, [login, toast, connectionStatus.isOnline]);
  
  const handleSocialLogin = useCallback(async () => {
    if (!connectionStatus.isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSocialLoading(true);
    
    try {
      await loginWithGoogle();
      setLoginSuccess(true);
      // Wait for a short period to allow session to propagate
      await new Promise(resolve => setTimeout(resolve, 750));
      // AuthRedirector will handle navigation
    } catch {
      // Error handled in useAuth.
    } finally {
      setIsSocialLoading(false);
    }
  }, [loginWithGoogle, toast, connectionStatus.isOnline]);

  const isFormDisabled = isLoading || isSocialLoading || !connectionStatus.isOnline || loginSuccess;

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:grid-cols-5">
      <div className="flex items-center justify-center py-12 xl:col-span-2">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto grid w-[380px] gap-6 p-6 sm:p-0"
        >
          <div className="grid gap-2 text-center">
            <Link href="/" className="mb-4 flex justify-center">
              <PropelLiteLogo className="h-16 w-16" />
            </Link>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              {loginSuccess ? "You're logged in! Redirecting..." : "Enter your credentials to access your dashboard."}
            </p>
          </div>
          
          <div className="grid gap-4">
            {!connectionStatus.isOnline && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  No internet connection. Please check your network and try again.
                </AlertDescription>
              </Alert>
            )}

            {authError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{authError.message}</span>
                </AlertDescription>
              </Alert>
            )}

            {loginSuccess ? (
              <div className="flex flex-col items-center justify-center space-y-4 pt-10">
                <CheckCircle className="h-16 w-16 text-green-500 animate-in fade-in zoom-in-50" />
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(handleLogin)} noValidate>
                <fieldset disabled={isFormDisabled} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      className={errors.email ? "border-destructive" : ""}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-sm text-destructive" role="alert">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm underline hover:text-accent hover:no-underline"
                        tabIndex={isFormDisabled ? -1 : 0}
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                        aria-invalid={errors.password ? "true" : "false"}
                        aria-describedby={errors.password ? "password-error" : undefined}
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={isFormDisabled}
                        tabIndex={isFormDisabled ? -1 : 0}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p id="password-error" className="text-sm text-destructive" role="alert">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isFormDisabled || !isValid}
                  >
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                  </Button>
                  
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    type="button" 
                    onClick={handleSocialLogin}
                    disabled={isFormDisabled}
                  >
                    {isSocialLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in with Google...</> : <><GoogleIcon className="mr-2 h-4 w-4" />Continue with Google</>}
                  </Button>
                </fieldset>
              </form>
            )}
          </div>
          
          {!loginSuccess && (
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link 
                href="/register" 
                className="underline hover:text-accent hover:no-underline"
                tabIndex={isFormDisabled ? -1 : 0}
              >
                Sign up
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              {connectionStatus.isOnline ? (
                <><Wifi className="h-3 w-3 mr-1 text-green-500" /><span>Connected</span></>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1 text-red-500" /><span>Offline</span></>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      <div className="hidden bg-muted lg:block xl:col-span-3">
        <Image
          src="https://picsum.photos/seed/login/1920/1080"
          alt="Abstract pattern of serene, flowing lines."
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          data-ai-hint="serene abstract pattern"
          priority
        />
      </div>
    </div>
  );
}
