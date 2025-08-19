
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedEditIcon } from '@/components/icons/animated-edit-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import type { Property, Unit } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Camera, Wand2, Loader2 } from 'lucide-react';
import { DamageAnalysisDialog } from '@/components/damage-analysis-dialog';
import { DeletePropertyButton } from './delete-property-button';
import { useProperty } from '@/hooks/use-property';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';


const formatCurrency = (amount: number, currencyCode: string = 'KES') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount);
  };

export default function PropertyDetailPage() {
  const { id } = useParams();
  const propertyId = id as string;
  const { property, loading: propertyLoading } = useProperty(propertyId);
  const [isDamageDialogOpen, setIsDamageDialogOpen] = useState(false);
  const { user } = useAuth();
  
  const canEdit = user?.role === 'landlord' || user?.permissions?.canEditProperties;
  const canDelete = user?.role === 'landlord' || user?.permissions?.canDeleteProperties;

  if (propertyLoading) {
    return (
       <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <Skeleton className="h-[400px] w-full" />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <div className="lg:col-span-5">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
       </div>
    );
  }

  if (!property) {
    return notFound();
  }

  return (
    <>
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
            {canEdit && (
                <Link href={`/properties/${propertyId}/edit`}>
                    <Button variant="outline">
                        <AnimatedEditIcon /> Edit
                    </Button>
                </Link>
            )}
            {canDelete && (
                <DeletePropertyButton propertyId={propertyId} propertyAddress={property.address} />
            )}
        </div>
      </div>
        
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
             <Card className="overflow-hidden">
                <Image
                    src={property.imageUrl || "https://placehold.co/800x500.png"}
                    alt={property.name || 'Property Image'}
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
                </CardContent>
            </Card>
            <Card className="mt-6 border-primary/20 bg-primary/5">
                <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        AI Tools
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => setIsDamageDialogOpen(true)}>
                        <Camera className="mr-2 h-4 w-4" />
                        Run Damage Analysis
                    </Button>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {property.units.map((unit: Unit) => (
                                    <TableRow key={unit.id}>
                                        <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                                        <TableCell>{unit.size}</TableCell>
                                        <TableCell>{formatCurrency(unit.rent, property.currency || 'KES')}</TableCell>
                                        <TableCell>
                                            <Badge variant={unit.isOccupied ? 'secondary' : 'outline'}>
                                                {unit.isOccupied ? 'Occupied' : 'Vacant'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
    <DamageAnalysisDialog open={isDamageDialogOpen} onOpenChange={setIsDamageDialogOpen} />
    </>
  );
}
