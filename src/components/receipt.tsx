
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { GenerateReceiptOutput } from '@/ai/flows/generate-receipt';

interface ReceiptProps {
  receipt: GenerateReceiptOutput;
}

export function Receipt({ receipt }: ReceiptProps) {
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
    <Card className="text-sm border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Receipt {receipt.receiptNumber}</CardTitle>
        <CardDescription>For: {receipt.tenantName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
            <div className="flex justify-between">
                <span>Property:</span>
                <span className="font-medium text-right">{receipt.propertyAddress}</span>
            </div>
            <div className="flex justify-between">
                <span>Payment Date:</span>
                <span className="font-medium">{formatDate(receipt.paymentDate)}</span>
            </div>
             <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">{receipt.paymentMethod}</span>
            </div>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold text-lg">
            <span>Amount Paid</span>
            <span>{formatCurrency(receipt.amountPaid, receipt.currency)}</span>
        </div>
        <Separator />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>{receipt.notes}</p>
      </CardFooter>
    </Card>
  );
}
