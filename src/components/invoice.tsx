
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GenerateInvoiceOutput } from '@/ai/flows/generate-invoice-flow';

interface InvoiceProps {
  invoice: GenerateInvoiceOutput;
}

export function Invoice({ invoice }: InvoiceProps) {
    const formatCurrency = (amount: number, currencyCode: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(amount);
    };
    
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
      });
    }

  return (
    <Card className="text-sm">
      <CardHeader>
        <CardTitle className="text-base">Invoice {invoice.invoiceNumber}</CardTitle>
        <CardDescription>To: {invoice.tenantName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
            <div className="flex justify-between">
                <span>Property:</span>
                <span className="font-medium text-right">{invoice.propertyAddress}</span>
            </div>
            <div className="flex justify-between">
                <span>Invoice Date:</span>
                <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="flex justify-between">
                <span>Due Date:</span>
                <span className="font-medium">{formatDate(invoice.dueDate)}</span>
            </div>
        </div>
        <Separator />
         <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount, invoice.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Separator />
        <div className="flex justify-end">
             <div className="grid gap-2 w-full sm:w-1/2">
                <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>{invoice.notes}</p>
      </CardFooter>
    </Card>
  );
}
