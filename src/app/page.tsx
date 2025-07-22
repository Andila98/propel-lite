
"use client";

import { Home, Users, Banknote, Building2, UserCheck, Activity, UserCog } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockProperties, mockTenants, mockPropertyManagers, mockActivities } from '@/lib/mock-data';
import type { Property, Tenant, PropertyManager, ActivityItem } from '@/lib/types';
import { TenantTable } from '@/components/tenant-table';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import React, { useEffect } from 'react';
import { BedDouble, Bath } from 'lucide-react';

export default function DashboardPage() {
  const properties = mockProperties;
  const tenants = mockTenants;
  const managers = mockPropertyManagers;
  const activities = mockActivities;

  useEffect(() => {
    console.log("Frontend: DashboardPage component mounted.");
  }, []);

  const totalRent = properties.reduce((acc, p) => acc + p.rent, 0);
  const occupiedProperties = tenants.map(t => t.propertyId);
  const occupancyRate = (occupiedProperties.length / properties.length) * 100;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Landlord Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/properties">
          <Card className="hover:shadow-lg transition-shadow bg-background">
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
        </Link>
        <Link href="/tenants">
          <Card className="hover:shadow-lg transition-shadow bg-secondary/50">
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
        </Link>
        <Link href="/payments">
            <Card className="bg-primary/90 text-primary-foreground hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
                <Banknote className="h-4 w-4 text-primary-foreground/80" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Ksh{totalRent.toLocaleString()}</div>
                <p className="text-xs text-primary-foreground/80">
                Total expected monthly income
                </p>
            </CardContent>
            </Card>
        </Link>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</div>
            <p className="text-xs text-primary-foreground/80">
              Percentage of properties occupied
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Properties Showcase</CardTitle>
            <CardDescription>A look at your managed properties.</CardDescription>
          </CardHeader>
          <CardContent>
            <PropertiesCarousel properties={properties} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates on your properties and tenants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivities activities={activities} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantTable tenants={tenants} properties={properties} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Property Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyManagerList managers={managers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PropertiesCarousel({ properties }: { properties: Property[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  )

  return (
    <Carousel 
      opts={{ loop: true }}
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
     >
      <CarouselContent>
        {properties.map((property) => (
          <CarouselItem key={property.id}>
              <Card className="overflow-hidden group">
                <Link href={`/properties/${property.id}`} className="block">
                  <div className="relative h-64 w-full">
                    <Image
                      src={property.imageUrl}
                      alt={property.address}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      data-ai-hint="apartment building"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <CardHeader className="absolute bottom-0 text-white">
                    <CardTitle className="text-xl">{property.address}</CardTitle>
                    <CardDescription className="text-primary-foreground/80 capitalize">{property.propertyType}</CardDescription>
                  </CardHeader>
                </Link>
                <CardFooter className="bg-muted/50 p-4 flex justify-between text-sm">
                   <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-muted-foreground" />
                        <span>{property.bedrooms} Beds</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        <span>{property.bathrooms} Baths</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <Banknote className="h-4 w-4 text-muted-foreground" />
                         <span>Ksh{property.rent.toLocaleString()}/mo</span>
                    </div>
                </CardFooter>
              </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function PropertyManagerList({ managers }: { managers: PropertyManager[] }) {
  const router = useRouter();

  const handleRowClick = (managerId: string) => {
    router.push(`/property-managers/${managerId}`);
  };
  return (
    <div className="space-y-6">
      {managers.map((manager) => (
        <div key={manager.id} className="flex items-center cursor-pointer" onClick={() => handleRowClick(manager.id)}>
          <Avatar className="h-9 w-9">
             <AvatarImage src={manager.avatarUrl} alt={manager.name} data-ai-hint="person portrait" />
            <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{manager.name}</p>
            <p className="text-sm text-muted-foreground">{manager.email}</p>
          </div>
          <div className="ml-auto font-medium">{manager.phone}</div>
        </div>
      ))}
    </div>
  );
}

function RecentActivities({ activities }: { activities: ActivityItem[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  const ICONS: { [key: string]: React.ReactElement } = {
    'new-tenant': <UserCheck className="h-4 w-4" />,
    'rent-paid': <Banknote className="h-4 w-4" />,
    'lease-ending': <Home className="h-4 w-4" />,
  };
  return (
     <Carousel 
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
     >
      <CarouselContent>
        {activities.map((activity) => (
          <CarouselItem key={activity.id}>
            <div className="p-1">
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {ICONS[activity.type]}
                    </div>
                  <div className="text-center">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

    