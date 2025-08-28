
"use client";

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, CalendarDays, MessageSquare, Smile, Meh, Frown, Loader2, BrainCircuit } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Tenant, Property, Payment, Message } from '@/lib/types';
import { AnimatedEditIcon } from '@/components/icons/animated-edit-icon';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatThread } from '@/components/chat-thread';
import { predictNextPayment } from '@/ai/flows/predict-payment-flow';


function SentimentAnalysis({ tenantId }: { tenantId: string }) {
    const [sentiment, setSentiment] = useState<{ sentiment: string, summary: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSentiment = async () => {
            if (!tenantId) return;
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/tenants/${tenantId}/sentiment`);
                const data = await response.json();
                if (response.ok) {
                    setSentiment(data);
                } else {
                    throw new Error(data.error || 'Failed to fetch sentiment');
                }
            } catch (err: any) {
                console.error("Failed to fetch sentiment", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSentiment();
    }, [tenantId]);

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
                {loading && (
                     <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                {sentiment && !loading && !error && (
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
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getPrediction() {
            if (!tenantId) return;
            setLoading(true);
            try {
                const result = await predictNextPayment({ tenantId, currentStatus });
                setPrediction(result);
            } catch (error) {
                console.error("Prediction Error:", error);
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

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    async function fetchData() {
        if (!tenantId) return;
        setLoading(true);
        try {
            const [tenantRes, paymentsRes] = await Promise.all([
                fetch(`/api/tenants/${tenantId}`),
                fetch(`/api/tenants/${tenantId}/payments`),
            ]);

            if (!tenantRes.ok) throw new Error('Failed to fetch tenant details.');
            const tenantData: Tenant = await tenantRes.json();
            setTenant(tenantData);

            if (!paymentsRes.ok) throw new Error('Failed to fetch payment history.');
            const paymentsData: Payment[] = await paymentsRes.json();
            setPayments(paymentsData);
            
            if (tenantData.propertyId) {
                 const propertyRes = await fetch(`/api/properties/${tenantData.propertyId}`);
                 if (!propertyRes.ok) throw new Error('Failed to fetch property details.');
                 const propertyData: Property = await propertyRes.json();
                 setProperty(propertyData);
            }

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [tenantId, toast]);


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }
  
  if (!tenant) {
    return <div>Tenant or property not found.</div>;
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
        const response = await fetch(`/api/tenants/${tenantId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete tenant.');
        }
        toast({
            title: "Tenant Deleted",
            description: `${tenant.name} has been removed from your records.`,
        });
        router.push('/tenants');
        router.refresh();
    } catch(err: any) {
        toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setDeleting(false);
    }
  };
  
  const getRentStatus = (payments: Payment[], rent: number) => {
    if (!payments || !rent) return 'Overdue';
    const paidThisMonth = payments
      .filter(p => new Date(p.date as string).getMonth() === new Date().getMonth())
      .reduce((sum, p) => sum + p.amount, 0);

    if (paidThisMonth >= rent) return 'Paid';
    if (paidThisMonth > 0) return 'Partially Paid';
    return 'Overdue';
  }
  
  const unit = property?.units.find(u => u.id === tenant.currentUnitId);
  const rentAmount = unit?.rent || 0;
  const rentStatus = getRentStatus(payments, rentAmount);


  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      'Paid': 'default',
      'Overdue': 'destructive',
      'Partially Paid': 'secondary',
      'Advance': 'outline',
    } as const;
    return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
  }

  const formatCurrency = (amount: number, currencyCode: string = 'KES') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const formatDate = (dateValue: any) => {
      if (!dateValue) return 'N/A';
      // Handle both Firestore Timestamp objects and date strings
      const date = dateValue.seconds ? new Date(dateValue.seconds * 1000) : new Date(dateValue);
      return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
      });
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
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <AnimatedDeleteIcon /> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        tenant and all associated data, including their login account.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {deleting ? <Loader2 className="animate-spin" /> : "Continue"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                        <span className="font-medium">{formatDate(tenant.leaseStart)} to {formatDate(tenant.leaseEnd)}</span>
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
                       {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : (
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
                                {payments.map((payment) => (
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
