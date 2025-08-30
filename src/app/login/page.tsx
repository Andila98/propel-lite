
"use client";

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropelLiteLogo, GoogleIcon } from '@/components/icons/logo';
import { useAuth, type User } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const handleRedirect = (user: User) => {
    if (user.role === 'tenant') {
        router.push('/tenant-portal');
    } else {
        router.push('/dashboard');
    }
  }

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const { user } = await login(email, password);
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        handleRedirect(user);
    } catch (error: any) {
        toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }, [email, password, router, toast, login]);
  
  const handleSocialLogin = async () => {
    setIsSocialLoading(true);
    try {
        const { user } = await loginWithGoogle();
        toast({
            title: `Welcome, ${user.name}!`,
            description: "You've successfully signed in.",
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <fieldset disabled={isLoading || isSocialLoading} className="grid gap-4">
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
                <div className="grid gap-2 relative">
                    <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm underline"
                    >
                        Forgot your password?
                    </Link>
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
                        className="absolute right-3 top-[2.25rem] text-muted-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <Button type="submit" className="w-full">
                   {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
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
                    Login with Google
                </Button>
            </fieldset>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
