
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Square, BedDouble, Bath, Home, Camera, WifiOff, Eye, FileText, ImageIcon as GalleryIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProperty } from '@/hooks/use-property';
import { useTenants } from '@/hooks/use-tenants';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedEditIcon } from '@/components/icons/animated-edit-icon';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { useState } from 'react';

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const propertyId = id as string;
  
  const { property, loading, error } = useProperty(propertyId);
  const { tenants } = useTenants();

  const getTenantForUnit = (unitId: string) => {
    return tenants.find(t => t.currentUnitId === unitId);
  }

  const formatCurrency = (amount: number, currencyCode: string = 'KES') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  const handleDelete = async () => {
    try {
        const response = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete property');
        }
        toast({
            title: "Property Deleted",
            description: `The property at ${property.address} has been deleted.`,
        });
        router.push('/properties');
    } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const propertyImage = property.imageUrl;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/properties">
            <Button variant="outline" size="icon" className="h-8 w-8">
                <AnimatedBackIcon />
                <span className="sr-only">Back to Properties</span>
            </Button>
            </Link>
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{property.name}</h2>
                <p className="text-sm text-muted-foreground capitalize">{property.type} at {property.address}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Link href={`/properties/${property.id}/edit`}>
                 <Button variant="outline">
                    <AnimatedEditIcon /> Edit
                </Button>
            </Link>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <AnimatedDeleteIcon /> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        property and all associated units and data.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
             <Card className="overflow-hidden">
                <Image
                    src={propertyImage || "https://placehold.co/800x500.png"}
                    alt={property.name}
                    width={800}
                    height={500}
                    className="w-full object-cover"
                    data-ai-hint="modern apartment exterior"
                />
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>About this property</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{property.description}</p>
                     <div className="grid grid-cols-2 gap-4 text-sm pt-4">
                        <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>Type: <span className="font-semibold capitalize">{property.type}</span></span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-5">
            <Card>
                <CardHeader>
                    <CardTitle>Units</CardTitle>
                    <CardDescription>All units within {property.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Unit</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Rent</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tenant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {property.units.map((unit: Unit) => {
                                const tenant = getTenantForUnit(unit.id);
                                return (
                                    <TableRow key={unit.id}>
                                        <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                                        <TableCell>{unit.size}</TableCell>
                                        <TableCell>{formatCurrency(unit.rent, property.currency)}</TableCell>
                                        <TableCell>
                                            <Badge variant={unit.isOccupied ? 'secondary' : 'outline'}>
                                                {unit.isOccupied ? 'Occupied' : 'Vacant'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {tenant ? (
                                                <Link href={`/tenants/${tenant.id}`} className="flex items-center gap-2 hover:underline">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={tenant.avatarUrl} data-ai-hint="person portrait" />
                                                        <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    {tenant.name}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">N/A</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
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
                        <Skeleton className="h-4 w-48 mt-2" />
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
                <div className="lg:col-span-2">
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="lg:col-span-5">
                    <Skeleton className="h-64 w-full mt-4" />
                </div>
            </div>
        </div>
    )
}
