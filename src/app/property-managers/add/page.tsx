
"use client"

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { Loader2, Copy } from 'lucide-react';

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

        const link = `${window.location.origin}/onboarding/accept-invite?token=${result.token}`;
        setInvitationLink(link);

        toast({
            title: "Invitation Sent!",
            description: "An invitation link has been generated. Share it with the manager.",
        });

    } catch (error: any) {
        toast({
            title: "Failed to Send Invite",
            description: error.message,
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4">
            <Link href="/property-managers">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <AnimatedBackIcon />
                    <span className="sr-only">Back to Property Managers</span>
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Invite New Manager</h2>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Send Invitation</CardTitle>
            <CardDescription>Enter the email of the manager you wish to invite. They will receive a link to set up their account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Manager's Email</Label>
                  <Input id="email" type="email" {...register("email")} autoComplete="email" placeholder="manager@example.com" />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invite
                    </Button>
                </div>
            </form>

            {invitationLink && (
                <div className="space-y-2 pt-4">
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
    </div>
  );
}
