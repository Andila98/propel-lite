
"use client";

import React, { useCallback } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Payment, Property, Tenant } from '@/lib/types';
import Link from 'next/link';
import { Receipt as ReceiptIcon, Loader2, PlusCircle, Download, Mail } from 'lucide-react';
import { getReceiptAction, emailReceiptAction, type ReceiptState } from './actions';
import ReceiptComponent from '@/components/receipt';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, fetcher } from '@/lib/utils';
import { AddPaymentForm } from '@/components/add-payment-form';

type PaymentWithDetails = Payment & { tenantName: string; propertyAddress: string; property: Property };

export default function PaymentsPage() {
  const { toast } = useToast();
  const [receiptState, setReceiptState] = React.useState<{ loading: boolean; result: ReceiptState | null; currentPaymentId?: string }>({
    loading: false,
    result: null,
  });
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = React.useState(false);
  
  const { data: payments, error: paymentsError, isLoading: paymentsLoading } = useSWR<PaymentWithDetails[]>('/api/payments', fetcher);
  const { data: tenantsData, error: tenantsError, isLoading: tenantsLoading } = useSWR<{tenants: Tenant[]}>('/api/tenants', fetcher);
  
  const dataLoading = paymentsLoading || tenantsLoading;
  const isError = paymentsError || tenantsError;

  const handleGenerateReceipt = useCallback(async (tenantId: string, paymentId: string) => {
    setReceiptState({ loading: true, result: null, currentPaymentId: paymentId });
    setIsReceiptOpen(true);

    const result = await getReceiptAction({ tenantId, paymentId });
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    
    setReceiptState({ loading: false, result, currentPaymentId: paymentId });
  }, [toast]);
  
  const handleEmailReceipt = useCallback(async (tenantId: string, paymentId: string) => {
    toast({ title: "Sending...", description: "Emailing the receipt to the tenant." });
    const result = await emailReceiptAction({ tenantId, paymentId });
    if (result.error) {
      toast({ title: "Error", description: `Failed to email receipt: ${result.error}`, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Receipt has been emailed to the tenant." });
    }
  }, [toast]);
  
  const handleDownloadPdf = useCallback(() => {
    if (receiptState.result?.pdf && receiptState.result?.receipt) {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${receiptState.result.pdf}`;
      link.download = `Receipt-${receiptState.result.receipt.receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [receiptState.result]);

  const renderSkeleton = () => (
     <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Payments History</h2>
        <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Record a New Payment</DialogTitle>
                    <DialogDescription>
                        Manually enter a payment received from a tenant or bulk upload from a CSV file.
                    </DialogDescription>
                </DialogHeader>
                <AddPaymentForm tenants={tenantsData?.tenants || []} onPaymentAdded={() => setIsAddPaymentOpen(false)} />
            </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            A chronological list of all payments received from tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataLoading ? renderSkeleton() : isError ? <p>Error loading data</p> : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>
                        <Link href={`/tenants/${payment.tenantId}`} className="text-primary hover:underline">
                            {payment.tenantName}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Link href={`/properties/${payment.propertyId}`} className="text-primary hover:underline">
                            {payment.propertyAddress}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Badge variant={payment.type === 'Rent' ? 'default' : 'secondary'}>
                            {payment.type}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.amount, payment.property?.currency)}</TableCell>
                    <TableCell className="text-right">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateReceipt(payment.tenantId, payment.id)}
                            disabled={receiptState.loading && receiptState.currentPaymentId === payment.id}
                        >
                            {receiptState.loading && receiptState.currentPaymentId === payment.id 
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                : <ReceiptIcon className="mr-2 h-4 w-4" />
                            }
                            Receipt
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Generated Receipt</DialogTitle>
                <DialogDescription>
                    AI-generated receipt for the selected transaction.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {receiptState.loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                {receiptState.result?.receipt && <ReceiptComponent receipt={receiptState.result.receipt} />}
                {receiptState.result?.error && <p className="text-destructive">{receiptState.result.error}</p>}
            </div>
             <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
                <Button 
                    onClick={handleDownloadPdf}
                    disabled={!receiptState.result?.pdf}
                    variant="outline"
                >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button 
                    onClick={() => handleEmailReceipt(receiptState.result!.receipt!.tenantName, receiptState.currentPaymentId!)}
                    disabled={!receiptState.result?.receipt}
                >
                    <Mail className="mr-2 h-4 w-4" /> Email to Tenant
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
