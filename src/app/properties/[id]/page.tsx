
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { mockTenants } from '@/lib/mock-data';
import type { Tenant, Unit } from '@/lib/types';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Square, BedDouble, Bath, Home, ArrowLeft, Camera, FilePenLine, Trash2, WifiOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProperty } from '@/hooks/use-property';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const propertyId = id as string;
  
  const { property, loading, error } = useProperty(propertyId);
  // Fetch tenant associated with this property
  const tenant = mockTenants.find((t) => t.propertyId === propertyId);

  if (loading) {
    return <PropertyDetailSkeleton />;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-destructive p-4">
            <WifiOff className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Failed to Load Property</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/properties')} className="mt-4">Go to Properties</Button>
        </div>
    );
  }

  if (!property) {
    return <div>Property not found.</div>;
  }

  const handleDelete = () => {
    // In a real app, you would make an API call to delete the property.
    console.log(`Frontend: Deleting property: ${property.id}`);
    toast({
      title: "Property Deleted",
      description: `The property at ${property.address} has been deleted.`,
    });
    router.push('/properties');
  };

  const propertyImage = property.imageUrl.startsWith('http') ? property.imageUrl : `${window.location.origin}${property.imageUrl}`;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/properties">
            <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Properties</span>
            </Button>
            </Link>
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{property.address}</h2>
                <p className="text-sm text-muted-foreground capitalize">{property.propertyType}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Link href={`/properties/${property.id}/edit`}>
                 <Button variant="outline">
                    <FilePenLine className="mr-2 h-4 w-4" /> Edit
                </Button>
            </Link>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        property and all associated data.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
             <Card className="overflow-hidden">
                <Image
                    src={propertyImage}
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
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2">
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-muted-foreground" />
                                                <span>Type: <span className="font-semibold capitalize">{property.propertyType}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                <span>Rent: <span className="font-semibold">Ksh{property.rent.toLocaleString()}/mo</span></span>
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
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg p-4">
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
                                <Link href={`/tenants/${tenant.id}`} className="space-y-4 block hover:bg-muted/50 p-4 rounded-lg">
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
                                </Link>
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
            <TableCell>Ksh{unit.rent.toLocaleString()}</TableCell>
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

function PropertyDetailSkeleton() {
    return (
        <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-24 mt-2" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <Skeleton className="aspect-video w-full" />
                </div>
                <div className="lg:col-span-5">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-96 w-full mt-4" />
                </div>
            </div>
        </div>
    )
}
