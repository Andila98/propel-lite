
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function OnboardingCompletePage() {
  return (
    <div className="flex-1 p-4 md:p-8">
       <div className="mx-auto max-w-2xl space-y-4">
        <Progress value={100} className="w-full" />
        <Card className="w-full text-center">
            <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl">Setup Complete!</CardTitle>
            <CardDescription className="text-lg">
                You're all set and ready to go.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="mb-6 text-muted-foreground">
                You can now manage your properties, track payments, and communicate with tenants from your dashboard.
            </p>
            <Link href="/">
                <Button size="lg">Go to Dashboard</Button>
            </Link>
            </CardContent>
        </Card>
       </div>
    </div>
  );
}

    