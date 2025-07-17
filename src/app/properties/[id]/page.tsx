
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
import { DollarSign, Square, BedDouble, Bath, Home, ArrowLeft, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
        <div>
            <h2 className="text-3xl font-bold tracking-tight">{property.address}</h2>
            <p className="text-sm text-muted-foreground capitalize">{property.propertyType}</p>
        </div>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
             <Card className="overflow-hidden">
                <Image
                    src={property.imageUrl}
                    alt={property.address}
                    width={800}
                    height={500}
                    className="w-full object-cover"
                    data-ai-hint="modern apartment exterior"
                />
            </Card>
        </div>

        <div className="lg:col-span-5">
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="gallery">Gallery</TabsTrigger>
                    <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
                    {property.propertyType === 'apartment' && <TabsTrigger value="units">Units</TabsTrigger>}
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                    <Card>
                        <CardContent className="p-6">
                             <Accordion type="multiple" defaultValue={["item-1", "item-2"]} className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger className="text-lg font-semibold">About this property</AccordionTrigger>
                                    <AccordionContent>
                                        <p className="text-muted-foreground pt-2">{property.description}</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger className="text-lg font-semibold">Key Features</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="grid grid-cols-2 gap-4 text-sm pt-2">
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
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="gallery" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Photo Gallery</CardTitle>
                            <CardDescription>A collection of images for this property.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {property.gallery && property.gallery.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {property.gallery.map((url, index) => (
                                        <div key={index} className="overflow-hidden rounded-lg">
                                            <Image
                                                src={url}
                                                alt={`Property image ${index + 1}`}
                                                width={400}
                                                height={300}
                                                className="w-full h-full object-cover aspect-video transition-transform hover:scale-105"
                                                data-ai-hint="apartment interior"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg">
                                    <Camera className="h-8 w-8 mb-2" />
                                    <p>No gallery images have been added for this property yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="occupancy" className="mt-4">
                     <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                            <CardTitle>Current Tenant</CardTitle>
                            </CardHeader>
                            <CardContent>
                            {tenant ? (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                      <AvatarImage src={tenant.avatarUrl} alt={tenant.name} data-ai-hint="person portrait" />
                                      <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-semibold">{tenant.name}</p>
                                      <p className="text-sm text-muted-foreground">{tenant.email}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Lease: {tenant.leaseStartDate} to {tenant.leaseEndDate}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span>Rent Status:</span>
                                        <Badge variant={tenant.rentStatus === 'Paid' ? 'default' : 'destructive'}>
                                        {tenant.rentStatus}
                                        </Badge>
                                    </div>
                                  </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">This property is currently vacant.</p>
                            )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                 {property.propertyType === 'apartment' && property.units && (
                    <TabsContent value="units" className="mt-4">
                        <Card>
                        <CardHeader>
                            <CardTitle>Units</CardTitle>
                            <CardDescription>Individual units within this property.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UnitTable units={property.units} />
                        </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
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
