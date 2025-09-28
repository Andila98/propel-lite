
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Loader2, Copy } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';

const onboardingSteps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'add-manager', label: 'Add Manager' },
    { id: 'add-tenant', label: 'Add Tenant' },
    { id: 'complete', label: 'Complete' },
];

const InviteManagerSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
type InviteManagerValues = z.infer<typeof InviteManagerSchema>;


export default function AddPropertyManagerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteManagerValues>({
    resolver: zodResolver(InviteManagerSchema),
  });

  const onSubmit = async (data: InviteManagerValues) => {
    setLoading(true);
    setInvitationLink('');
    try {
        const response = await fetch('/api/auth/invite-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send invitation.');
        }

        setInvitationLink(result.invitationLink);

        toast({
            title: "Invitation Sent!",
            description: "An invitation link has been generated. Share it with the manager.",
        });

    } catch (error: unknown) {
      const typedError = error as Error;
        toast({
            title: "Failed to Send Invite",
            description: typedError.message,
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitationLink);
    toast({ title: "Copied!", description: "Invitation link copied to clipboard." });
  };
  
  const handleNextStep = () => {
    router.push('/onboarding/add-tenant');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <TooltipProvider>
        <div className="mx-auto max-w-2xl space-y-8">
          <Stepper steps={onboardingSteps} currentStep={2} />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Step 3: Add a Property Manager (Optional)</CardTitle>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">A Property Manager can be a staff member or anyone you authorize to help manage your properties. You can set their permissions later.</p>
                    </TooltipContent>
                  </Tooltip>
              </div>
              <CardDescription>Enter the manager&apos;s email to generate an invitation link.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Manager&apos;s Email</Label>
                  <Input id="email" type="email" {...register("email")} autoComplete="email" placeholder="manager@example.com"/>
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
                 <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Invite Link
                </Button>
              </form>

              {invitationLink && (
                <div className="space-y-2 pt-4 border-t mt-4">
                    <Label>Invitation Link (Share with the manager)</Label>
                    <div className="flex gap-2">
                        <Input value={invitationLink} readOnly />
                        <Button variant="outline" size="icon" onClick={copyToClipboard}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
           <div className="flex justify-between">
              <Button variant="ghost" onClick={() => router.push('/onboarding/add-tenant')}>Skip for now</Button>
              <Button onClick={handleNextStep}>Next: Add Tenant</Button>
            </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
