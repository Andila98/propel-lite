
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
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { mockTenants } from '@/lib/mock-data';
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
            <TableCell className="font-medium">{prop.address}</TableCell>
            <TableCell className="capitalize">{prop.propertyType}</TableCell>
            <TableCell>Ksh{prop.rent.toLocaleString()}</TableCell>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');

  // In a real app, you'd fetch tenants from Firestore too
  const tenants = mockTenants; 

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const searchMatch = property.address.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = propertyTypeFilter === 'all' || property.propertyType === propertyTypeFilter;
      return searchMatch && typeMatch;
    });
  }, [properties, searchTerm, propertyTypeFilter]);

  // In a real app, you'd get the current user's role from your auth context/session.
  // We'll simulate a "Full Manager" role for demonstration.
  const currentUserRole: PropertyManager['accessLevel'] = 'Full Manager';

  const renderContent = () => {
    if (loading) {
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

    return <PropertyTable properties={filteredProperties} tenants={tenants} />;
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
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="bedsitter">Bedsitter</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
