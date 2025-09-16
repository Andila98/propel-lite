
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AnimatedDeleteIcon } from './icons/animated-delete-icon';

interface DeleteTenantButtonProps {
    tenantId: string;
    tenantName: string;
    onDeleted: () => void;
}

export function DeleteTenantButton({ tenantId, tenantName, onDeleted }: DeleteTenantButtonProps) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

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
            onDeleted();

        } catch (err: any) {
            console.error("Delete tenant error:", err);
            toast({
                title: "Error Deleting Tenant",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                >
                    <AnimatedDeleteIcon />
                    Delete
                </DropdownMenuItem>
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
