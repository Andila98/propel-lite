
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockTenants, mockProperties } from '@/lib/mock-data';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Phone, CalendarDays } from 'lucide-react';

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = mockTenants.find((t) => t.id === params.id);
  const property = tenant ? mockProperties.find((p) => p.id === tenant.propertyId) : undefined;

  if (!tenant || !property) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Tenants</span>
          </Button>
        </Link>
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarImage src={tenant.avatarUrl} alt={tenant.name} data-ai-hint="person portrait" />
                <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{tenant.name}</h2>
                <p className="text-sm text-muted-foreground">Tenant</p>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{tenant.email}</span>
              </div>
            </CardContent>
          </Card>
           <Card className="mt-6">
            <CardHeader>
              <CardTitle>Lease Details</CardTitle>
              <CardDescription>
                <Link href={`/properties/${property.id}`} className="text-primary hover:underline">
                    {property.address}
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lease Period</span>
                    <span className="font-medium">{tenant.leaseStartDate} to {tenant.leaseEndDate}</span>
                </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="font-medium">${property.rent.toLocaleString()}</span>
                </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rent Status</span>
                    <Badge variant={tenant.rentStatus === 'Paid' ? 'default' : 'destructive'}>
                        {tenant.rentStatus}
                    </Badge>
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Recent payments from {tenant.name}.</CardDescription>
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
                                    <TableCell>{payment.date}</TableCell>
                                    <TableCell>${payment.amount.toLocaleString()}</TableCell>
                                    <TableCell>{payment.method}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
