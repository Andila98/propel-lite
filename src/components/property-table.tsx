"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Property, Tenant } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PropertyTableProps {
  properties: Property[];
  tenants: Tenant[];
}

export function PropertyTable({ properties, tenants }: PropertyTableProps) {
  const router = useRouter();

  const isOccupied = (propertyId: string) =>
    tenants.some((t) => t.propertyId === propertyId);

  const handleRowClick = (propertyId: string) => {
    router.push(`/properties/${propertyId}`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Rent</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((prop) => {
          const propertyImage = prop.imageUrl.startsWith('http') ? prop.imageUrl : `${window.location.origin}${prop.imageUrl}`;
          return (
            <TableRow 
              key={prop.id} 
              onClick={() => handleRowClick(prop.id)}
              className="cursor-pointer"
            >
              <TableCell>
                <Image
                  src={propertyImage}
                  alt={prop.address}
                  width={50}
                  height={50}
                  className="rounded-md object-cover"
                  data-ai-hint="apartment building"
                />
              </TableCell>
              <TableCell className="font-medium">{prop.address}</TableCell>
              <TableCell className="capitalize">{prop.propertyType}</TableCell>
              <TableCell>${prop.rent.toLocaleString()}</TableCell>
              <TableCell>
                {isOccupied(prop.id) ? (
                  <Badge variant="secondary">Occupied</Badge>
                ) : (
                  <Badge variant="outline">Vacant</Badge>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );
}