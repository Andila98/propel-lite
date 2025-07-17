
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
import { mockTenants, mockProperties } from '@/lib/mock-data';
import type { Tenant, Property } from '@/lib/types';
import Link from 'next/link';

export default function PaymentsPage() {
  const allPayments = mockTenants.flatMap(tenant => 
    tenant.paymentHistory.map(payment => ({
      ...payment,
      tenantName: tenant.name,
      tenantId: tenant.id,
      propertyId: tenant.propertyId,
      propertyName: mockProperties.find(p => p.id === tenant.propertyId)?.address || 'N/A'
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPayments.map((payment, index) => (
                <TableRow key={index}>
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
                  <TableCell>{payment.method}</TableCell>
                  <TableCell className="text-right font-medium">${payment.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
