
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
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import type { Tenant, Property, Payment, MaintenanceRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Mail, Receipt } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getReceiptAction, emailReceiptAction, type ReceiptState } from '../payments/actions';
import { Receipt as ReceiptComponent } from '@/components/receipt';

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

function MaintenanceRequestForm({ tenant }: { tenant: Tenant }) {
    const { toast } = useToast();
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description) {
            toast({ title: 'Error', description: 'Please provide a description of the issue.', variant: 'destructive' });
            return;
        }

        setLoading(true);

        const requestData = {
          description: description,
        }

        try {
          const response = await fetch('/api/maintenance', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit request');
          }
           toast({
              title: 'Request Submitted!',
              description: 'Your maintenance request has been sent.',
          });
           // Reset form
          setDescription('');
          setImageFile(null);
          setImagePreview(null);
          setIsDialogOpen(false);
        } catch (err: any) {
          toast({ title: 'Submission Failed', description: err.message, variant: 'destructive'});
        } finally {
          setLoading(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" className="w-full">Report an Issue</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Maintenance Request</DialogTitle>
                    <DialogDescription>Report an issue with your unit. Uploading a photo helps us diagnose it faster.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <Label htmlFor="issue-description">Description of Issue</Label>
                        <Textarea 
                            id="issue-description" 
                            name="issue-description" 
                            placeholder="e.g., The kitchen sink is leaking." 
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="issue-image">Upload Image (Optional)</Label>
                        <Input id="issue-image" type="file" accept="image/*" onChange={handleFileChange} />
                    </div>
                    {imagePreview && (
                        <div className="w-full aspect-video relative rounded-md overflow-hidden bg-muted">
                            <Image src={imagePreview} alt="Issue preview" fill objectFit="contain" />
                        </div>
                    )}
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Request'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}


export default function TenantPortalPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [receiptState, setReceiptState] = useState<{ loading: boolean; result: ReceiptState | null; currentPaymentId?: string }>({
    loading: false,
    result: null,
  });
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);


  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        // User object from Auth context has the tenantId (which is the user.uid)
        const tenantRes = await fetch(`/api/tenants/${user.uid}`);
        if (!tenantRes.ok) throw new Error('Failed to fetch your details.');
        const tenantData: Tenant = await tenantRes.json();
        setTenant(tenantData);

        const [propertyRes, paymentsRes] = await Promise.all([
          fetch(`/api/properties/${tenantData.propertyId}`),
          fetch(`/api/tenants/${tenantData.id}/payments`)
        ]);

        if (!propertyRes.ok) throw new Error('Failed to fetch property details.');
        if (!paymentsRes.ok) throw new Error('Failed to fetch payments.');
        
        setProperty(await propertyRes.json());
        setPayments(await paymentsRes.json());

      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive"});
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, toast]);
  
  const handleGenerateReceipt = async (tenantId: string, paymentId: string) => {
    setReceiptState({ loading: true, result: null, currentPaymentId: paymentId });
    setIsReceiptOpen(true);

    const result = await getReceiptAction({ tenantId, paymentId });
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    
    setReceiptState({ loading: false, result, currentPaymentId: paymentId });
  }

  const handleEmailReceipt = async () => {
    if (!receiptState.result?.receipt || !receiptState.currentPaymentId || !tenant) return;
    toast({ title: "Sending...", description: "Emailing your receipt." });
    const result = await emailReceiptAction({ tenantId: tenant.id, paymentId: receiptState.currentPaymentId });
    if (result.error) {
      toast({ title: "Error", description: `Failed to email receipt: ${result.error}`, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Receipt has been sent to your email." });
    }
  };

  const handleDownloadPdf = () => {
    if (receiptState.result?.pdf && receiptState.result?.receipt) {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${receiptState.result.pdf}`;
      link.download = `Receipt-${receiptState.result.receipt.receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!tenant || !property) {
    return <div className="p-8">Could not load your portal data. Please contact support.</div>;
  }
  
  const getRentStatus = (payments: Payment[], rent: number) => {
    if (!payments || !rent) return 'Overdue';
    const paidThisMonth = payments
      .filter(p => new Date(p.date as any).getMonth() === new Date().getMonth())
      .reduce((sum, p) => sum + p.amount, 0);

    if (paidThisMonth >= rent) return 'Paid';
    if (paidThisMonth > 0) return 'Partially Paid';
    return 'Overdue';
  }
  
  const unit = property.units.find(u => u.id === tenant.currentUnitId);
  const rentAmount = unit?.rent || 0;
  const rentStatus = getRentStatus(payments, rentAmount);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Welcome, {tenant.name}</h2>
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
              <span>{formatCurrency(rentAmount, property.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lease Start</span>
              <span>{formatDate(tenant.leaseStart as any)}</span>
            </div>
             <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lease End</span>
              <span>{formatDate(tenant.leaseEnd as any)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rent Status</span>
              <span className={cn(
                  "font-semibold",
                  rentStatus === 'Paid' && 'text-green-600',
                  rentStatus === 'Overdue' && 'text-destructive',
                  rentStatus === 'Partially Paid' && 'text-yellow-600',
                  rentStatus === 'Advance' && 'text-blue-600',
              )}>{rentStatus}</span>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="w-full">Make a Payment</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Make a Payment</DialogTitle>
                        <DialogDescription>
                            Select your preferred payment method.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Button variant="outline" className="justify-start gap-4 p-6">
                            <MpesaIcon />
                            Pay with M-Pesa
                        </Button>
                        <Button variant="outline" className="justify-start gap-4 p-6">
                            <StripeIcon />
                            Pay with Card (Stripe)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <MaintenanceRequestForm tenant={tenant} />
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount, property.currency)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-right">
                       <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateReceipt(payment.tenantId, payment.id)}
                            disabled={receiptState.loading && receiptState.currentPaymentId === payment.id}
                        >
                            {receiptState.loading && receiptState.currentPaymentId === payment.id 
                                ? <Loader2 className="h-4 w-4 animate-spin" /> 
                                : <Receipt className="h-4 w-4" />
                            }
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Your Receipt</DialogTitle>
                <DialogDescription>
                    Here is the receipt for your transaction.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {receiptState.loading && <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                {receiptState.result?.receipt && <ReceiptComponent receipt={receiptState.result.receipt} />}
                {receiptState.result?.error && <p className="text-destructive">{receiptState.result.error}</p>}
            </div>
             <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                <Button onClick={handleDownloadPdf} disabled={!receiptState.result?.pdf} variant="outline"><Download className="mr-2 h-4 w-4" /> Download</Button>
                <Button onClick={handleEmailReceipt} disabled={!receiptState.result?.receipt}><Mail className="mr-2 h-4 w-4" /> Email Me</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
