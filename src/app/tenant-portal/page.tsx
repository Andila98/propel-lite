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

export default function TenantPortalPage() {
  // For demonstration, we'll use the first tenant
  const tenant = mockTenants[0];
  const property = mockProperties.find(p => p.id === tenant.propertyId);

  if (!tenant || !property) {
    return <div>Could not load tenant data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Welcome, {tenant.name}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
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
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Make a Payment</Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
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
                    <Textarea id="issue-description" placeholder="e.g., The kitchen sink is leaking." rows={4} />
                </div>
                <Button>Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
