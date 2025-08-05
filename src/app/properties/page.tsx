
"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, WifiOff } from 'lucide-react';
import Link from 'next/link';
import type { PropertyManager, Property, Tenant } from '@/lib/types';
import { useProperties } from '@/hooks/use-properties';
import { useTenants } from '@/hooks/use-tenants';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function PropertyTable({ properties, tenants }: { properties: Property[], tenants: Tenant[] }) {
  const router = useRouter();

  const isOccupied = (propertyId: string) =>
    tenants.some((t: any) => t.propertyId === propertyId);
    
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
                src={prop.imageUrl || "https://placehold.co/100x100.png"}
                alt={prop.address}
                width={50}
                height={50}
                className="rounded-md object-cover"
                data-ai-hint="apartment building"
              />
            </TableCell>
            <TableCell className="font-medium">{prop.address}</TableCell>
            <TableCell className="capitalize">{prop.type}</TableCell>
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

export default function PropertiesPage() {
  const { properties, loading, error } = useProperties();
  const { tenants, loading: tenantsLoading } = useTenants();
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const searchMatch = property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = propertyTypeFilter === 'all' || property.type === propertyTypeFilter;
      return searchMatch && typeMatch;
    });
  }, [properties, searchTerm, propertyTypeFilter]);

  // In a real app, you'd get the current user's role from your auth context/session.
  const currentUserRole: PropertyManager['accessLevel'] = 'Full Manager';

  const renderContent = () => {
    if (loading || tenantsLoading) {
      return <Skeleton className="h-[200px] w-full" />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-center text-destructive p-4">
            <WifiOff className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Failed to Load Properties</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      );
    }
    
    if (properties.length === 0 && !loading) {
        return <p className="text-center text-muted-foreground py-10">No properties found. Add your first one!</p>
    }

    return <PropertyTable properties={filteredProperties} tenants={tenants as any[]} />;
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Properties</h2>
        {currentUserRole === 'Full Manager' && (
          <Link href="/properties/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </Link>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Properties</CardTitle>
          <CardDescription>
            A list of all your managed properties. Click a row to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-4 mb-4">
                <Input
                    placeholder="Search by address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="House">House</SelectItem>
                        <SelectItem value="Bedsitter">Bedsitter</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

    