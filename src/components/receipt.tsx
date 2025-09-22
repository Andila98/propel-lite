
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { GenerateReceiptOutput } from '@/lib/schema-types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PropelLiteLogo } from './icons/logo';

interface ReceiptProps {
  receipt: GenerateReceiptOutput;
}

// Make the component a default export to allow dynamic import in the API route
export default function Receipt({ receipt }: ReceiptProps) {
  return (
    <Card className="text-sm border-dashed">
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="p-2 bg-muted rounded-full">
            <PropelLiteLogo className="h-8 w-8" />
        </div>
        <div className="grid gap-0.5">
            <CardTitle className="text-lg">Receipt</CardTitle>
            <CardDescription>Receipt #{receipt.receiptNumber}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant:</span>
                <span className="font-medium">{receipt.tenantName}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium text-right">{receipt.propertyAddress}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="font-medium">{formatDate(receipt.paymentDate)}</span>
            </div>
             <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
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
      <CardFooter className="text-xs text-muted-foreground text-center justify-center">
        <p>{receipt.notes}</p>
      </CardFooter>
    </Card>
  );
}
