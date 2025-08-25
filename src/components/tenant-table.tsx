
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import type { Tenant, Property } from '@/lib/types';
import { AnimatedDeleteIcon } from './icons/animated-delete-icon';
import { AnimatedEditIcon } from './icons/animated-edit-icon';

export function TenantTable({ tenants, properties }: { tenants: Tenant[], properties: Property[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const getPropertyDetails = (tenant: Tenant) => {
    const property = properties.find(p => p.id === tenant.propertyId);
    if (!property) return { address: 'N/A', unitNumber: 'N/A' };
    const unit = property.units.find(u => u.id === tenant.currentUnitId);
    return {
      address: property.address,
      unitNumber: unit?.unitNumber || 'N/A',
    };
  }

  const handleViewDetails = (tenantId: string) => {
    router.push(`/tenants/${tenantId}`);
  };

  const handleEdit = (tenantId: string) => {
    router.push(`/tenants/${tenantId}/edit`);
  };
  
  const handleDelete = () => {
    if (!tenantToDelete) return;
    // In a real app, you'd make an API call to delete the tenant.
    console.log(`Deleting tenant: ${tenantToDelete.id}`);
    toast({
      title: "Tenant Deleted",
      description: `${tenantToDelete.name} has been removed from your records.`,
    });
    setTenantToDelete(null);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Rent Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => {
            const { address, unitNumber } = getPropertyDetails(tenant);
            return (
              <TableRow 
                  key={tenant.id} 
                  onClick={() => handleViewDetails(tenant.id)} 
                  className="cursor-pointer"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={tenant.avatarUrl} alt={tenant.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{tenant.name}</span>
                  </div>
                </TableCell>
                <TableCell>{address}</TableCell>
                <TableCell>
                  <Badge variant="outline">{unitNumber}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={tenant.rentStatus === 'Paid' ? "default" : "destructive"}>
                    {tenant.rentStatus}
                  </Badge>
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
                      <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleViewDetails(tenant.id)}}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleEdit(tenant.id)}}>
                        <AnimatedEditIcon />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {e.stopPropagation(); setTenantToDelete(tenant)}}
                      >
                         <AnimatedDeleteIcon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      
       <AlertDialog open={!!tenantToDelete} onOpenChange={(isOpen) => !isOpen && setTenantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {tenantToDelete?.name}
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
