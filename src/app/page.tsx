
"use client";

import { Home, Users, Banknote, Building2, UserCheck, Activity, UserCog } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { mockProperties, mockTenants, mockPropertyManagers, mockActivities } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const PropertiesCarousel = dynamic(() => import('@/components/properties-carousel').then(mod => mod.PropertiesCarousel), { 
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />
});
const RecentActivities = dynamic(() => import('@/components/recent-activities').then(mod => mod.RecentActivities), { 
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />
});
const TenantTable = dynamic(() => import('@/components/tenant-table').then(mod => mod.TenantTable), { 
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />
});
const PropertyManagerList = dynamic(() => import('@/components/property-manager-list').then(mod => mod.PropertyManagerList), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />
});

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
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8">
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
