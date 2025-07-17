
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockProperties, mockTenants } from '@/lib/mock-data';
import type { Property, Tenant, Unit } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { DollarSign, Square, BedDouble, Bath, Home, ArrowLeft } from 'lucide-react';

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = mockProperties.find((p) => p.id === params.id);
  const tenant = mockTenants.find((t) => t.propertyId === params.id);

  if (!property) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Properties</span>
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">{property.address}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <Image
                src={property.imageUrl}
                alt={property.address}
                width={800}
                height={500}
                className="rounded-t-lg object-cover"
                data-ai-hint="modern apartment exterior"
              />
            </CardContent>
            <CardHeader>
              <CardTitle>About this property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{property.description}</p>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>Type: <span className="font-semibold capitalize">{property.propertyType}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Rent: <span className="font-semibold">${property.rent.toLocaleString()}/mo</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-muted-foreground" />
                  <span>Size: <span className="font-semibold">{property.squareFootage} sqft</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  <span>Bedrooms: <span className="font-semibold">{property.bedrooms}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <span>Bathrooms: <span className="font-semibold">{property.bathrooms}</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              {tenant ? (
                <div className="space-y-2">
                  <p className="font-semibold">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">Lease: {tenant.leaseStartDate} to {tenant.leaseEndDate}</p>
                  <div className="flex items-center gap-2">
                    <span>Rent Status:</span>
                    <Badge variant={tenant.rentStatus === 'Paid' ? 'default' : 'destructive'}>
                      {tenant.rentStatus}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">This property is currently vacant.</p>
              )}
            </CardContent>
          </Card>

          {property.propertyType === 'apartment' && property.units && (
            <Card>
              <CardHeader>
                <CardTitle>Units</CardTitle>
                <CardDescription>Individual units within this property.</CardDescription>
              </CardHeader>
              <CardContent>
                <UnitTable units={property.units} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function UnitTable({ units }: { units: Unit[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Rent</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit, index) => (
          <TableRow key={index}>
            <TableCell className="capitalize font-medium">{unit.unitType.replace('-', ' ')}</TableCell>
            <TableCell>${unit.rent.toLocaleString()}</TableCell>
            <TableCell>
              {unit.isAvailable ? (
                <Badge variant="outline">Available</Badge>
              ) : (
                <Badge variant="secondary">Occupied</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
