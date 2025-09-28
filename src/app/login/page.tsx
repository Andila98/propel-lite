
"use client";

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PropelLiteLogo, GoogleIcon } from '@/components/icons/logo';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';

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
  const { login, loginWithGoogle, error: authError, clearError, retryConnection } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: new Date()
  });

  // Form setup with validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: ""
    },
    mode: "onBlur" // Validate on blur for better UX
  });

  const { register, handleSubmit, formState: { errors, isValid }, setFocus } = form;

  // Monitor connection status
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

  // Focus management for accessibility
  useEffect(() => {
    // Focus first input with error, or email field by default
    if (errors.email) {
      setFocus('email');
    } else if (errors.password) {
      setFocus('password');
    }
  }, [errors, setFocus]);

  // Clear auth errors when user starts typing
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

    setIsLoading(true);
    
    try {
      await login(data.email, data.password);
      // Redirect is handled by the useAuth provider
    } catch (error: unknown) {
      // The authError state in useAuth is already set. We don't need to do anything here.
      // The Alert component will display the error.
    } finally {
      setIsLoading(false);
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
      // Redirect is handled by the useAuth provider
    } catch (error: unknown) {
      // Don't show toast for cancelled popup, as the error is handled in useAuth.
    } finally {
      setIsSocialLoading(false);
    }
  }, [loginWithGoogle, toast, connectionStatus.isOnline]);

  const handleRetryConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      await retryConnection();
      toast({
        title: "Connection Restored",
        description: "You can now try logging in again.",
      });
    } catch (error: unknown) {
      // The error is already set in the useAuth hook, no need to toast again.
    } finally {
      setIsLoading(false);
    }
  }, [retryConnection, toast]);

  const isFormDisabled = isLoading || isSocialLoading || !connectionStatus.isOnline;

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
           <div className="grid gap-2 text-center">
            <div className="mb-4 flex justify-center">
              <PropelLiteLogo className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access your dashboard.
            </p>
          </div>
          
          {/* Connection Status Alert */}
          {!connectionStatus.isOnline && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                No internet connection. Please check your connection and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Auth Error Alert */}
          {authError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{authError.message}</span>
                {authError.code === 'CONNECTION_FAILED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetryConnection}
                    className="ml-2 h-auto p-0 text-xs underline"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Retry'}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

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
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                type="button" 
                onClick={handleSocialLogin}
                disabled={isFormDisabled}
              >
                {isSocialLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    Continue with Google
                  </>
                )}
              </Button>
            </fieldset>
          </form>
          
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

          {/* Connection Status Indicator */}
          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              {connectionStatus.isOnline ? (
                <>
                  <Wifi className="h-3 w-3 mr-1 text-green-500" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1 text-red-500" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
       <div className="hidden bg-muted lg:block">
        <Image
          src="https://picsum.photos/seed/login/1080/1920"
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
