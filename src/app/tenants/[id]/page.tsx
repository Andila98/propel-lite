

"use client";

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, MessageSquare, Smile, Meh, Frown, Loader2, BrainCircuit, MoreVertical } from 'lucide-react';
import React, { useCallback, useEffect } from 'react';
import type { Tenant, Property, Payment } from '@/lib/types';
import { AnimatedEditIcon } from '@/components/icons/animated-edit-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { predictPayment } from '@/ai/flows/predict-payment-flow';
import { formatCurrency, formatDate, fetcher } from '@/lib/utils';
import { useTenants } from '@/hooks/use-tenants';
import { DeleteTenantButton } from '@/components/delete-tenant-button';

const ChatThread = dynamic(
  () => import("@/components/chat-thread").then((mod) => mod.ChatThread),
  {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
);


function SentimentAnalysis({ tenantId }: { tenantId: string }) {
    const { data: sentiment, error, isLoading } = useSWR(`/api/tenants/${tenantId}/sentiment`, fetcher);

    const sentimentIcon = {
        'Positive': <Smile className="h-6 w-6 text-green-500" />,
        'Neutral': <Meh className="h-6 w-6 text-yellow-500" />,
        'Negative': <Frown className="h-6 w-6 text-red-500" />,
    }[sentiment?.sentiment || 'Neutral']

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Sentiment Analysis</CardTitle>
                <CardDescription>Based on recent conversations.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && (
                     <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
                {error && <p className="text-destructive text-sm text-center">{error.info?.error || error.message}</p>}
                {sentiment && !isLoading && !error && (
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                           {sentimentIcon}
                        </div>
                        <div>
                            <p className="font-semibold text-lg">{sentiment.sentiment}</p>
                            <p className="text-sm text-muted-foreground">{sentiment.summary}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function PaymentPrediction({ tenantId, currentStatus }: { tenantId: string, currentStatus: string }) {
    const [prediction, setPrediction] = React.useState<{predictedStatus: string, reasoning: string} | null>(null);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        async function getPrediction() {
            if (!tenantId) return;
            setLoading(true);
            try {
                const result = await predictPayment({ tenantId, currentStatus });
                setPrediction(result);
            } catch (error: unknown) {
                const typedError = error as Error;
                console.error("Prediction Error:", typedError.message);
            } finally {
                setLoading(false);
            }
        }
        getPrediction();
    }, [tenantId, currentStatus]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Payment Prediction</CardTitle>
                <CardDescription>Markov chain analysis of payment history.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
                {prediction && !loading && (
                     <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                           <BrainCircuit className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-lg">Next Status: <span className="text-primary">{prediction.predictedStatus}</span></p>
                            <p className="text-sm text-muted-foreground">{prediction.reasoning}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const tenantId = id as string;

  const { data: tenant, error: tenantError, isLoading: tenantLoading } = useSWR<Tenant>(tenantId ? `/api/tenants/${tenantId}` : null, fetcher);
  const { data: payments, error: paymentsError, isLoading: paymentsLoading } = useSWR<Payment[]>(tenantId ? `/api/tenants/${tenantId}/payments` : null, fetcher);
  const { data: property, error: propertyError, isLoading: propertyLoading } = useSWR<Property>(tenant?.propertyId ? `/api/properties/${tenant.propertyId}` : null, fetcher);

  const { refresh: refreshTenants } = useTenants();
  
  const isLoading = tenantLoading || paymentsLoading || propertyLoading;
  const error = tenantError || paymentsError || propertyError;

  const handleTenantDeleted = useCallback(() => {
    refreshTenants();
    router.push('/tenants');
  }, [refreshTenants, router]);

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error.info?.error || error.message, variant: "destructive" });
    }
  }, [error, toast]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }
  
  if (!tenant) {
    return <div>Tenant or property not found.</div>;
  }
  
  const getRentStatus = (paymentsList: Payment[], rent: number) => {
    if (!paymentsList || !rent) return 'Overdue';
    const paidThisMonth = paymentsList
      .filter(p => new Date(p.date as string).getMonth() === new Date().getMonth())
      .reduce((sum, p) => sum + p.amount, 0);

    if (paidThisMonth >= rent) return 'Paid';
    if (paidThisMonth > 0) return 'Partially Paid';
    return 'Overdue';
  }
  
  const unit = property?.units.find(u => u.id === tenant.currentUnitId);
  const rentAmount = unit?.rent || 0;
  const rentStatus = getRentStatus(payments || [], rentAmount);


  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      'Paid': 'default',
      'Overdue': 'destructive',
      'Partially Paid': 'secondary',
      'Advance': 'outline',
    } as const;
    return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
       <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tenants">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <AnimatedBackIcon />
              <span className="sr-only">Back to Tenants</span>
            </Button>
          </Link>
          <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                  <AvatarImage src={(tenant as any).avatarUrl} alt={tenant.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                  <h2 className="text-3xl font-bold tracking-tight">{tenant.name}</h2>
                  <p className="text-sm text-muted-foreground">Tenant</p>
              </div>
          </div>
        </div>
         <div className="flex items-center gap-2">
            <Link href={`/tenants/${tenant.id}/edit`}>
                 <Button variant="outline">
                    <AnimatedEditIcon /> Edit
                </Button>
            </Link>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   <DropdownMenuLabel>Actions</DropdownMenuLabel>
                   <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} onDeleted={handleTenantDeleted} asChild>
                       <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                            <AnimatedDeleteIcon /> Delete
                       </DropdownMenuItem>
                   </DeleteTenantButton>
                </DropdownMenuContent>
             </DropdownMenu>
        </div>
      </div>
      
       <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{tenant.email}</span>
                  </div>
                   <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{tenant.phone || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Lease Details</CardTitle>
                  <CardDescription>
                    <Link href={`/properties/${property?.id}`} className="text-primary hover:underline">
                        {property?.address} - Unit {unit?.unitNumber}
                    </Link>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Lease Period</span>
                        <span className="font-medium">{formatDate(tenant.leaseStart as unknown as string)} to {formatDate(tenant.leaseEnd as unknown as string)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Rent</span>
                        <span className="font-medium">{formatCurrency(rentAmount, property?.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Rent Status</span>
                        {renderStatusBadge(rentStatus)}
                    </div>
                </CardContent>
              </Card>
              <SentimentAnalysis tenantId={tenant.id} />
              <PaymentPrediction tenantId={tenant.id} currentStatus={rentStatus} />
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Payment History</CardTitle>
                        <CardDescription>Recent payments from {tenant.name}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {paymentsLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments?.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{formatDate(payment.date)}</TableCell>
                                        <TableCell>
                                            <Badge variant={'default'}>
                                                Rent
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatCurrency(payment.amount, property?.currency)}</TableCell>
                                        <TableCell>{payment.method}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                       )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Conversation</CardTitle>
                    <CardDescription>Direct messaging with {tenant.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChatThread tenantId={tenant.id} tenantName={tenant.name} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
