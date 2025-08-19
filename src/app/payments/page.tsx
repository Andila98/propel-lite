
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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Pie, PieChart, Cell, Tooltip } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { subMonths, format, parseISO } from 'date-fns';

const chartConfig = {
  payments: {
    label: "Payments",
  },
  mpesa: {
    label: "M-Pesa",
    color: "hsl(var(--chart-1))",
  },
  stripe: {
    label: "Stripe",
    color: "hsl(var(--chart-2))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-3))",
  }
} satisfies ChartConfig

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
  
  const { latePaymentData, paymentMethodData } = useMemo(() => {
      const now = new Date();
      const latePayments: Record<string, number> = {};
      const paymentMethods: Record<string, number> = { 'M-Pesa': 0, 'Stripe': 0, 'Card': 0, 'Other': 0 };

      for (let i = 5; i >= 0; i--) {
        const month = subMonths(now, i);
        const monthKey = format(month, 'MMM');
        latePayments[monthKey] = 0;
      }

      payments.forEach(payment => {
          if (payment.type === 'Rent') {
              const paymentDate = parseISO(payment.date as string);
              if (paymentDate.getDate() > 5) { // Assuming rent due on 1st, late after 5th
                  const monthKey = format(paymentDate, 'MMM');
                  if (monthKey in latePayments) {
                      latePayments[monthKey]++;
                  }
              }
          }

          const method = payment.method;
          if (method.toLowerCase().includes('mpesa')) {
              paymentMethods['M-Pesa']++;
          } else if (method.toLowerCase().includes('stripe') || method.toLowerCase().includes('card')) {
              paymentMethods['Stripe']++;
          } else {
              paymentMethods['Other']++;
          }
      });
      
      const latePaymentChartData = Object.entries(latePayments).map(([month, count]) => ({ month, latePayments: count }));
      const paymentMethodChartData = Object.entries(paymentMethods)
        .filter(([,value]) => value > 0)
        .map(([name, value]) => ({ name, value, fill: `var(--color-${name.toLowerCase().replace('-','')})`}));

      return { latePaymentData: latePaymentChartData, paymentMethodData: paymentMethodChartData };

  }, [payments]);

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

  const formatCurrency = (amount: number, currencyCode: string = 'KES') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
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

  const renderAnalytics = () => {
       if (dataLoading) {
           return (
             <div className="grid gap-4 md:grid-cols-2">
                 <Skeleton className="h-64" />
                 <Skeleton className="h-64" />
             </div>
           )
       }
       return (
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Late Payment Trends</CardTitle>
                        <CardDescription>Number of late rent payments over the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-48 w-full">
                           <BarChart accessibilityLayer data={latePaymentData}>
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                <ChartTooltipContent />
                                <Bar dataKey="latePayments" fill="var(--color-payments)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Method Preferences</CardTitle>
                        <CardDescription>Breakdown of how tenants prefer to pay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {paymentMethodData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-48 w-full">
                            <PieChart>
                                    <ChartTooltipContent nameKey="name" />
                                    <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                        {paymentMethodData.map(entry => (
                                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                            </PieChart>
                            </ChartContainer>
                       ) : (
                           <div className="flex items-center justify-center h-48 text-muted-foreground">No payment data available.</div>
                       )}
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
       <div className="space-y-4">
        {renderAnalytics()}
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
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
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

    