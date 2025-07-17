import { Home, Users, Banknote, Building2 } from 'lucide-react';
import Image from 'next/image';
import {
  Card,
  CardContent,
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
import { Badge } from '@/components/ui/badge';
import { mockProperties, mockTenants } from '@/lib/mock-data';
import type { Property, Tenant } from '@/lib/types';

export default function DashboardPage() {
  const properties = mockProperties;
  const tenants = mockTenants;

  const totalRent = properties.reduce((acc, p) => acc + p.rent, 0);
  const occupiedProperties = tenants.map(t => t.propertyId);
  const occupancyRate = (occupiedProperties.length / properties.length) * 100;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Landlord Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Properties
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">
              Managed properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tenants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total expected monthly income
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              Percentage of properties occupied
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyTable properties={properties} tenants={tenants} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantTable tenants={tenants} properties={properties} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PropertyTable({ properties, tenants }: { properties: Property[], tenants: Tenant[] }) {
  const isOccupied = (propertyId: string) => tenants.some(t => t.propertyId === propertyId);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Details</TableHead>
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
            <TableCell>{prop.address}</TableCell>
            <TableCell>{prop.bedrooms}bd / {prop.bathrooms}ba</TableCell>
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

function TenantTable({ tenants, properties }: { tenants: Tenant[], properties: Property[] }) {
  const getPropertyAddress = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.address || 'N/A';
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Rent Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell>{tenant.name}</TableCell>
            <TableCell>{getPropertyAddress(tenant.propertyId)}</TableCell>
            <TableCell>
              <Badge variant={tenant.rentStatus === 'Paid' ? "default" : "destructive"}>
                {tenant.rentStatus}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
