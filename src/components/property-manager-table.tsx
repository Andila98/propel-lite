
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PropertyManager } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Eye, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatedDeleteIcon } from './icons/animated-delete-icon';
import { AnimatedEditIcon } from './icons/animated-edit-icon';

export function PropertyManagerTable({ managers }: { managers: PropertyManager[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [managerToDelete, setManagerToDelete] = useState<PropertyManager | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleViewDetails = (managerId: string) => {
    router.push(`/property-managers/${managerId}`);
  };

  const handleEdit = (managerId: string) => {
    router.push(`/property-managers/${managerId}/edit`);
  };

  const handleDelete = async () => {
    if (!managerToDelete) return;
    setIsDeleting(true);
    
    try {
        const response = await fetch(`/api/managers/${managerToDelete.id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete manager.');
        }

        toast({
            title: "Manager Deleted",
            description: `${managerToDelete.name} has been removed from your records.`,
        });

        // Refresh the page or update the state to remove the deleted manager from the UI
        router.refresh(); 

    } catch (err: any) {
        console.error("Delete manager error:", err);
        toast({
            title: "Error Deleting Manager",
            description: err.message,
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
        setManagerToDelete(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Properties Managed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager) => (
            <TableRow key={manager.id} onClick={() => handleViewDetails(manager.id)} className="cursor-pointer">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={manager.avatarUrl} alt={manager.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{manager.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">{manager.email}</div>
                <div className="text-sm text-muted-foreground">{manager.phone}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
                    <ShieldCheck className="h-3 w-3" />
                    {Object.values(manager.permissions).filter(Boolean).length} Active
                </Badge>
              </TableCell>
              <TableCell>
                  <Badge variant="secondary">{manager.propertiesManaged.length}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleViewDetails(manager.id)}}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleEdit(manager.id)}}>
                      <AnimatedEditIcon />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {e.stopPropagation(); setManagerToDelete(manager)}}
                    >
                       <AnimatedDeleteIcon />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       <AlertDialog open={!!managerToDelete} onOpenChange={(isOpen) => !isOpen && setManagerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {managerToDelete?.name}
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
    </>
  );
}
