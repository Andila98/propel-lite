import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockProperties, mockTenants } from '@/lib/mock-data';
import type { Property, Tenant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function PropertiesPage() {
  const properties = mockProperties;
  const tenants = mockTenants;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Properties</h2>
        <Link href="/onboarding/add-property">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Properties</CardTitle>
          <CardDescription>
            A list of all your managed properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyTable properties={properties} tenants={tenants} />
        </CardContent>
      </Card>
    </div>
  );
}

function PropertyTable({
  properties,
  tenants,
}: {
  properties: Property[];
  tenants: Tenant[];
}) {
  const isOccupied = (propertyId: string) =>
    tenants.some((t) => t.propertyId === propertyId);
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
        {properties.map((prop) => (
          <TableRow key={prop.id}>
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
        ))}
      </TableBody>
    </Table>
  );
}
