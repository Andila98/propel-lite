
"use client";

import { useState, useMemo, useEffect } from 'react';
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
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Tenant, Property, Payment } from '@/lib/types';
import Link from 'next/link';
import { Receipt as ReceiptIcon, Loader2 } from 'lucide-react';
import { getReceiptAction, type ReceiptState } from './actions';
import { Receipt } from '@/components/receipt';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PaymentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receiptResult, setReceiptResult] = useState<ReceiptState | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<(Payment & { tenantName?: string, propertyAddress?: string})[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        setDataLoading(true);
        try {
            const [tenantsRes, propertiesRes, paymentsRes] = await Promise.all([
                fetch('/api/tenants'),
                fetch('/api/properties'),
                fetch('/api/payments')
            ]);

            const tenantsData: Tenant[] = await tenantsRes.json();
            const propertiesData: Property[] = await propertiesRes.json();
            let paymentsData: Payment[] = await paymentsRes.json();

            const paymentsWithDetails = paymentsData.map(p => {
                const tenant = tenantsData.find(t => t.id === p.tenantId);
                const property = propertiesData.find(prop => prop.id === p.propertyId);
                return {
                    ...p,
                    tenantName: tenant?.name,
                    propertyAddress: property?.address,
                    property: property,
                }
            })

            setTenants(tenantsData);
            setProperties(propertiesData);
            setPayments(paymentsWithDetails);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to fetch payment data.", variant: "destructive" });
        } finally {
            setDataLoading(false);
        }
    }
    fetchData();
  }, [toast]);
  

  const handleGenerateReceipt = async (tenantId: string, paymentId: string) => {
    setLoading(true);
    setIsReceiptOpen(true);
    setReceiptResult(null);

    const result = await getReceiptAction({ tenantId, paymentId });
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setReceiptResult(result);
    }

    setLoading(false);
  }
  
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
        <h2 className="text-3xl font-bold tracking-tight">Payments History</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            A chronological list of all payments received from tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataLoading ? renderSkeleton() : (
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
                {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>
                        <Link href={`/tenants/${payment.tenantId}`} className="text-primary hover:underline">
                            {payment.tenantName || 'N/A'}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Link href={`/properties/${payment.propertyId}`} className="text-primary hover:underline">
                            {payment.propertyAddress || 'N/A'}
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
                            disabled={loading}
                        >
                            <ReceiptIcon className="mr-2 h-4 w-4" />
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
                {loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                {receiptResult?.receipt && <Receipt receipt={receiptResult.receipt} />}
                {receiptResult?.error && <p className="text-destructive">{receiptResult.error}</p>}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
