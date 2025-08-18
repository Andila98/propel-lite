
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
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PropertyTableProps {
  properties: Property[];
}

export function PropertyTable({ properties }: PropertyTableProps) {
  const router = useRouter();

  const handleRowClick = (propertyId: string) => {
    router.push(`/properties/${propertyId}`);
  };

  const getOccupancyStatus = (property: Property) => {
    if (!property.units || property.units.length === 0) return 'Vacant';
    const isOccupied = property.units.some(unit => unit.isOccupied);
    return isOccupied ? 'Occupied' : 'Vacant';
  };

  const formatCurrency = (amount?: number, currencyCode?: string) => {
    if(amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRentRange = (property: Property) => {
      if (!property.units || property.units.length === 0) return 'N/A';
      if (property.units.length === 1) return formatCurrency(property.units[0].rent, property.currency);

      const rents = property.units.map(u => u.rent);
      const minRent = Math.min(...rents);
      const maxRent = Math.max(...rents);
      return `${formatCurrency(minRent, property.currency)} - ${formatCurrency(maxRent, property.currency)}`;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Rent Range</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((prop) => (
            <TableRow 
              key={prop.id} 
              onClick={() => handleRowClick(prop.id)}
              className="cursor-pointer"
            >
              <TableCell>
                <Image
                  src={prop.imageUrl}
                  alt={prop.address}
                  width={50}
                  height={50}
                  className="rounded-md object-cover"
                  data-ai-hint="apartment building"
                />
              </TableCell>
              <TableCell className="font-medium">{prop.name || prop.address}</TableCell>
              <TableCell className="capitalize">{prop.type}</TableCell>
              <TableCell>{getRentRange(prop)}</TableCell>
              <TableCell>
                {getOccupancyStatus(prop) === 'Occupied' ? (
                  <Badge variant="secondary">Occupied</Badge>
                ) : (
                  <Badge variant="outline">Vacant</Badge>
                )}
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
