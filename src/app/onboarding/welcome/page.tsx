
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="container mx-auto flex h-full max-w-2xl items-center justify-center p-4">
      <Card className="w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Rocket className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl">Welcome to Propel Lite!</CardTitle>
          <CardDescription className="text-lg">
            Let's get your account set up. It only takes a couple of minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            We'll guide you through adding your first property and tenant.
            This will help you get familiar with the core features of the platform.
          </p>
          <Link href="/onboarding/add-property">
            <Button size="lg">Get Started</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
