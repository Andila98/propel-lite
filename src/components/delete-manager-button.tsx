
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

interface DeleteManagerButtonProps {
    managerId: string;
    managerName: string;
    onDeleted: () => void;
}

export function DeleteManagerButton({ managerId, managerName, onDeleted }: DeleteManagerButtonProps) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/managers/${managerId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete manager.');
            }

            toast({
                title: "Manager Deleted",
                description: `${managerName} has been removed from your records.`,
            });
            onDeleted(); 

        } catch (err: unknown) {
            const typedError = err as Error;
            console.error("Delete manager error:", typedError);
            toast({
                title: "Error Deleting Manager",
                description: typedError.message,
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
                    This action cannot be undone. This will permanently delete {managerName}
                    and their login account.
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
