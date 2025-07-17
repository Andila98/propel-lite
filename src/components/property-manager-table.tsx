
"use client";

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

export function PropertyManagerTable({ managers }: { managers: PropertyManager[] }) {
  const router = useRouter();

  const handleRowClick = (managerId: string) => {
    // router.push(`/property-managers/${managerId}`);
    // TODO: Implement manager detail page
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {managers.map((manager) => (
          <TableRow key={manager.id} onClick={() => handleRowClick(manager.id)} className="cursor-pointer">
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={manager.avatarUrl} alt={manager.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{manager.name}</span>
              </div>
            </TableCell>
            <TableCell>{manager.email}</TableCell>
            <TableCell>{manager.phone}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
