
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, FileUp, Info, Upload } from 'lucide-react';
import { recordPaymentAction, createPaymentsFromCsvAction } from '@/app/payments/actions';
import { PaymentFormSchema, type PaymentFormValues } from "@/lib/schemas";
import type { Tenant } from '@/lib/types';
import type { FormState } from '@/app/tenants/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardDescription } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import Papa from 'papaparse';


function ManualSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Payment
        </Button>
    )
}

interface ManualPaymentFormProps {
    tenants: Tenant[];
    onPaymentAdded: () => void;
}

const ManualPaymentForm = React.memo(function ManualPaymentForm({ tenants, onPaymentAdded }: ManualPaymentFormProps) {
    const { toast } = useToast();
    const initialState: FormState = { success: false };
    const [state, formAction] = useActionState(recordPaymentAction, initialState);

    const { register, control } = useForm<PaymentFormValues>({
        resolver: zodResolver(PaymentFormSchema),
        defaultValues: {
            tenantId: '',
            date: new Date().toISOString().split('T')[0],
            method: 'Mpesa',
            amount: 0,
            notes: '',
        },
    });

    useEffect(() => {
        if (state.success) {
            toast({
                title: "Payment Recorded!",
                description: "The payment has been successfully added.",
            });
            onPaymentAdded();
        }
        if (state.error) {
            toast({
                title: "Error",
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, toast, onPaymentAdded]);
    
    return (
        <form action={formAction} className="grid gap-4 py-4">
            <div>
                <Label htmlFor="tenantId-select">Tenant</Label>
                <Controller
                    name="tenantId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="tenantId-select">
                                <SelectValue placeholder="Select a tenant..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tenants.map((tenant) => (
                                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {state.errors?.tenantId && <p className="text-sm text-destructive mt-1">{state.errors.tenantId[0]}</p>}
            </div>

            <div>
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" {...register('amount')} />
                {state.errors?.amount && <p className="text-sm text-destructive mt-1">{state.errors.amount[0]}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="date">Payment Date</Label>
                    <Input id="date" type="date" {...register('date')} />
                    {state.errors?.date && <p className="text-sm text-destructive mt-1">{state.errors.date[0]}</p>}
                </div>
                <div>
                    <Label htmlFor="method-select">Payment Method</Label>
                     <Controller
                        name="method"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="method-select">
                                    <SelectValue placeholder="Select method..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Mpesa">M-Pesa</SelectItem>
                                    <SelectItem value="Stripe">Stripe</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {state.errors?.method && <p className="text-sm text-destructive mt-1">{state.errors.method[0]}</p>}
                </div>
            </div>
            
            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" {...register('notes')} placeholder="e.g., Early payment for next month" />
                 {state.errors?.notes && <p className="text-sm text-destructive mt-1">{state.errors.notes[0]}</p>}
            </div>
            
            <div className="flex justify-end pt-4">
                <ManualSubmitButton />
            </div>
        </form>
    );
});

interface BulkImportFormProps {
    onImportComplete: () => void;
}

function BulkImportForm({ onImportComplete }: BulkImportFormProps) {
    const { toast } = useToast();
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsBulkLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (result) => {
                const paymentsData = result.data as Record<string, unknown>[];
                if (!paymentsData || paymentsData.length === 0) {
                    toast({ title: "CSV Error", description: "CSV file is empty or invalid.", variant: "destructive" });
                    setIsBulkLoading(false);
                    return;
                }

                const state = await createPaymentsFromCsvAction(paymentsData);

                if (state.success) {
                    toast({
                        title: "Payments Imported!",
                        description: `${state.createdCount} payments have been successfully recorded.`,
                    });
                    onImportComplete();
                } else {
                    toast({
                        title: `Bulk Import Failed: ${state.error}`,
                        description: state.details || "Please check the CSV data and try again.",
                        variant: "destructive",
                        duration: 10000,
                    });
                }
                setIsBulkLoading(false);
            },
            error: (error: unknown) => {
                const typedError = error as Error;
                toast({ title: "CSV Parsing Error", description: typedError.message, variant: "destructive" });
                setIsBulkLoading(false);
            }
        });
    };

    return (
        <TooltipProvider>
            <div className="space-y-4 py-4">
                <CardDescription>
                    Upload a CSV file with tenant payments. Ensure your file has the correct headers.
                </CardDescription>
                <div className="p-6 border-2 border-dashed rounded-lg text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium">Drop a CSV file here or click to upload</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Bulk record payments in one go.</p>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <label htmlFor="csvFile" className="cursor-pointer">
                                {isBulkLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                                ) : (
                                    <><FileUp className="mr-2 h-4 w-4" />Select File</>
                                )}
                                <input id="csvFile" name="csvFile" type="file" accept=".csv" className="sr-only" onChange={handleCsvUpload} disabled={isBulkLoading} />
                            </label>
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Required headers: `tenant_email`, `amount`, `date`, `method`.
                </div>
            </div>
        </TooltipProvider>
    );
}

interface AddPaymentFormProps {
    tenants: Tenant[];
    onPaymentAdded: () => void;
}

export const AddPaymentForm = React.memo(function AddPaymentForm({ tenants, onPaymentAdded }: AddPaymentFormProps) {
    return (
        <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Manual Entry
                </TabsTrigger>
                <TabsTrigger value="bulk">
                    <FileUp className="mr-2 h-4 w-4"/>
                    Bulk Import (CSV)
                </TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
                <ManualPaymentForm tenants={tenants} onPaymentAdded={onPaymentAdded} />
            </TabsContent>
            <TabsContent value="bulk">
                <BulkImportForm onImportComplete={onPaymentAdded} />
            </TabsContent>
        </Tabs>
    );
});
