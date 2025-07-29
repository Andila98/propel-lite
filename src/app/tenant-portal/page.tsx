
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { mockTenants, mockProperties } from '@/lib/mock-data';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

const MpesaIcon = () => (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 32C0 14.3269 14.3269 0 32 0C49.6731 0 64 14.3269 64 32C64 49.6731 49.6731 64 32 64C14.3269 64 0 49.6731 0 32Z" fill="#70B843"/>
        <path d="M37.7476 16.6347H26.3551L17.7656 46.592H24.2384L25.9922 40.175H38.1105L39.8643 46.592H46.3371L37.7476 16.6347ZM27.8183 35.302L32.0514 19.8398L36.2845 35.302H27.8183Z" fill="white"/>
    </svg>
)
const StripeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.963 12.3337C11.963 12.3337 12.0289 15.6593 14.673 15.6593C17.317 15.6593 17.2511 12.3337 17.2511 12.3337H11.963Z" fill="#635BFF"/>
        <path d="M7.10309 8.34064C8.32832 7.04289 10.0573 6 12 6C15.3137 6 18 8.68629 18 12C18 14.0538 17.0177 15.8284 15.5492 16.8929C15.5492 16.8929 15.5492 16.8929 15.5493 16.8928C14.0815 17.957 12.3134 18.25 12 18.25C8.68629 18.25 6 15.5637 6 12.25C6 11.2323 6.27988 10.2917 6.75836 9.49078" stroke="#635BFF" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12.0361 8.34082C12.0361 8.34082 11.9702 5.01526 9.32617 5.01526C6.68216 5.01526 6.74805 8.34082 6.74805 8.34082H12.0361Z" fill="#635BFF"/>
    </svg>
)

export default function TenantPortalPage() {
  // For demonstration, we'll use the first tenant
  const tenant = mockTenants[0];
  const property = mockProperties.find(p => p.id === tenant.propertyId);

  // In a real app, this would be fetched from the landlord's settings
  const landlordPaymentSettings = {
      mpesaEnabled: true,
      stripeEnabled: true
  }

  if (!tenant || !property) {
    return <div>Could not load tenant data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Welcome, {tenant.name}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-3 xl:col-span-1">
          <CardHeader>
            <CardTitle>Lease Details</CardTitle>
            <CardDescription>{property.address}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monthly Rent</span>
              <span>Ksh{property.rent.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lease Start</span>
              <span>{new Date(tenant.leaseStartDate).toLocaleDateString()}</span>
            </div>
             <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lease End</span>
              <span>{new Date(tenant.leaseEndDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rent Status</span>
              <span className={`font-semibold ${tenant.rentStatus === 'Paid' ? 'text-green-600' : 'text-destructive'}`}>{tenant.rentStatus}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Make a Payment</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Make a Payment</DialogTitle>
                        <DialogDescription>
                            Select your preferred payment method.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {landlordPaymentSettings.mpesaEnabled && (
                            <Button variant="outline" className="justify-start gap-4 p-6">
                                <MpesaIcon />
                                Pay with M-Pesa
                            </Button>
                        )}
                        {landlordPaymentSettings.stripeEnabled && (
                             <Button variant="outline" className="justify-start gap-4 p-6">
                                <StripeIcon />
                                Pay with Card (Stripe)
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-3 xl:col-span-2">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent transaction records.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.paymentHistory.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                    <TableCell>Ksh{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Maintenance Request</CardTitle>
            <CardDescription>Report an issue with your unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
                <div>
                    <Label htmlFor="issue-description">Description of Issue</Label>
                    <Textarea id="issue-description" name="issue-description" placeholder="e.g., The kitchen sink is leaking." rows={4} />
                </div>
                <Button>Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
