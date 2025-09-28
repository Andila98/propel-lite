
"use client";

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AnimatedDeleteIcon } from './icons/animated-delete-icon';

interface DeleteTenantButtonProps {
    tenantId: string;
    tenantName: string;
    onDeleted: () => void;
    asChild?: boolean;
    children?: React.ReactNode;
}

export function DeleteTenantButton({ tenantId, tenantName, onDeleted, asChild, children }: DeleteTenantButtonProps) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/tenants/${tenantId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete tenant.');
            }

            toast({
                title: "Tenant Deleted",
                description: `${tenantName} has been removed from your records.`,
            });
            setIsAlertOpen(false);
            onDeleted();

        } catch (err: unknown) {
            const typedError = err as Error;
            console.error("Delete tenant error:", typedError);
            toast({
                title: "Error Deleting Tenant",
                description: typedError.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
                {asChild ? children : (
                    <Button variant="destructive">
                        <AnimatedDeleteIcon /> Delete Tenant
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {tenantName} and all associated data, including their login account.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleDelete}
                    >
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Continue"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
