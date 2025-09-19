
"use client";

import { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { recordPaymentAction } from '@/app/payments/actions';
import { PaymentFormSchema, type PaymentFormValues } from "@/lib/schemas";
import type { Tenant } from '@/lib/types';
import type { FormState } from '@/app/tenants/actions';


function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Payment
        </Button>
    )
}

interface AddPaymentFormProps {
    tenants: Tenant[];
    onPaymentAdded: () => void;
}

export function AddPaymentForm({ tenants, onPaymentAdded }: AddPaymentFormProps) {
    const { toast } = useToast();
    const initialState: FormState = { success: false };
    const [state, formAction] = useActionState(recordPaymentAction, initialState);

    const { register, control, handleSubmit, formState: { errors } } = useForm<PaymentFormValues>({
        resolver: zodResolver(PaymentFormSchema),
        defaultValues: {
            tenantId: '',
            date: new Date().toISOString().split('T')[0],
            method: 'Mpesa',
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
                <Label htmlFor="tenantId">Tenant</Label>
                <Controller
                    name="tenantId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
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
                    <Label htmlFor="method">Payment Method</Label>
                    <Controller
                        name="method"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
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
                <SubmitButton />
            </div>
        </form>
    );
}
