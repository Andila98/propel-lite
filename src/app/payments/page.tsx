
"use client";

import { useState, useMemo } from 'react';
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
import { useTenants } from '@/hooks/use-tenants';
import { useProperties } from '@/hooks/use-properties';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function PaymentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receiptResult, setReceiptResult] = useState<ReceiptState | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const { tenants, loading: tenantsLoading } = useTenants();
  const { properties, loading: propertiesLoading } = useProperties();
  
  const allPayments = useMemo(() => {
    return tenants.flatMap(tenant => 
        (tenant.paymentHistory || []).map(payment => ({
            ...payment,
            tenantId: tenant.id,
            tenantName: tenant.name,
            propertyId: tenant.propertyId,
            propertyName: properties.find(p => p.id === tenant.propertyId)?.address || 'N/A'
        }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tenants, properties]);


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

  if (tenantsLoading || propertiesLoading) {
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
                    {renderSkeleton()}
                </CardContent>
            </Card>
        </div>
      )
  }

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
              {allPayments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                     <Link href={`/tenants/${payment.tenantId}`} className="text-primary hover:underline">
                        {payment.tenantName}
                    </Link>
                  </TableCell>
                  <TableCell>
                     <Link href={`/properties/${payment.propertyId}`} className="text-primary hover:underline">
                        {payment.propertyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                      <Badge variant={payment.type === 'Rent' ? 'default' : 'secondary'}>
                        {payment.type}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">Ksh{payment.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReceipt(payment.tenantId, payment.id)}
                    >
                        <ReceiptIcon className="mr-2 h-4 w-4" />
                        Receipt
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

