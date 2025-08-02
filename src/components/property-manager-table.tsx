
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
import { MoreHorizontal, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatedDeleteIcon } from './icons/animated-delete-icon';
import { AnimatedEditIcon } from './icons/animated-edit-icon';

export function PropertyManagerTable({ managers }: { managers: PropertyManager[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [managerToDelete, setManagerToDelete] = useState<PropertyManager | null>(null);

  const handleViewDetails = (managerId: string) => {
    router.push(`/property-managers/${managerId}`);
  };

  const handleEdit = (managerId: string) => {
    router.push(`/property-managers/${managerId}/edit`);
  };

  const handleDelete = () => {
    if (!managerToDelete) return;
    // In a real app, you'd make an API call to delete the manager.
    console.log(`Deleting manager: ${managerToDelete.id}`);
    toast({
      title: "Manager Deleted",
      description: `${managerToDelete.name} has been removed from your records.`,
    });
    setManagerToDelete(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Access Level</TableHead>
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
              <TableCell>{manager.email}</TableCell>
              <TableCell>
                <Badge variant={manager.accessLevel === 'Full Manager' ? 'default' : 'secondary'}>
                  {manager.accessLevel}
                </Badge>
              </TableCell>
              <TableCell>
                  <Badge variant="outline">{manager.propertiesManaged.length}</Badge>
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
              and all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
