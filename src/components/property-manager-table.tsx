
"use client";

import React from 'react';
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
import { MoreHorizontal, Eye, ShieldCheck } from 'lucide-react';
import { AnimatedEditIcon } from './icons/animated-edit-icon';
import { DeleteManagerButton } from './delete-manager-button';

interface PropertyManagerTableProps {
    managers: PropertyManager[];
    onManagerDeleted: () => void;
}

export const PropertyManagerTable = React.memo(function PropertyManagerTable({ managers, onManagerDeleted }: PropertyManagerTableProps) {
  const router = useRouter();
  
  const handleViewDetails = (managerId: string) => {
    router.push(`/property-managers/${managerId}`);
  };

  const handleEdit = (managerId: string) => {
    router.push(`/property-managers/${managerId}/edit`);
  };

  return (
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
                  <DeleteManagerButton managerId={manager.id} managerName={manager.name} onDeleted={onManagerDeleted} />
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
