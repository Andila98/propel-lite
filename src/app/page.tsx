
"use client";

import { Home, Banknote, Building2, UserCheck, Activity, UserCog } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedUsersIcon } from '@/components/icons/animated-users-icon';
import { useProperties } from '@/hooks/use-properties';
import { Button } from '@/components/ui/button';
import { mockTenants } from '@/lib/mock-data';
import type { Payment } from '@/lib/types';
import { startOfWeek, startOfMonth, startOfQuarter, isWithinInterval, subDays } from 'date-fns';

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
  const { properties, loading: propertiesLoading } = useProperties();
  const [timeFilter, setTimeFilter] = useState('month');
  const tenants = mockTenants; // Replace with useTenants hook later
  const managers = []; // Replace with useManagers hook later
  const activities = []; // Replace with useActivities hook later
  
  useEffect(() => {
    console.log("Frontend: DashboardPage component mounted.");
  }, []);

  const allPayments: Payment[] = useMemo(() => 
      tenants.flatMap(tenant => tenant.paymentHistory),
    [tenants]
  );

  const filteredRevenue = useMemo(() => {
    const now = new Date();
    let interval: Interval;

    switch (timeFilter) {
      case 'week':
        interval = { start: startOfWeek(now), end: now };
        break;
      case 'quarter':
        interval = { start: startOfQuarter(now), end: now };
        break;
      case 'month':
      default:
        interval = { start: startOfMonth(now), end: now };
        break;
    }

    return allPayments.reduce((acc, payment) => {
        const paymentDate = new Date(payment.date);
        if (isWithinInterval(paymentDate, interval)) {
            return acc + payment.amount;
        }
        return acc;
    }, 0);
  }, [allPayments, timeFilter]);


  const totalRent = properties.reduce((acc, p) => acc + p.rent, 0);
  const occupiedProperties = tenants.map(t => t.propertyId);
  const occupancyRate = properties.length > 0 ? (occupiedProperties.length / properties.length) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Landlord Dashboard</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/properties">
          <Card className="hover:shadow-lg transition-shadow bg-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Properties
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {propertiesLoading ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{properties.length}</div>}
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
              <AnimatedUsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
              <p className="text-xs text-muted-foreground">
                Across all properties
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Card className="bg-primary/90 text-primary-foreground hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Banknote className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
               <div className="text-2xl font-bold">Ksh{filteredRevenue.toLocaleString()}</div>
              <div className="flex gap-2 text-xs text-primary-foreground/80 mt-2">
                <Button size="sm" variant={timeFilter === 'week' ? 'secondary' : 'ghost'} onClick={() => setTimeFilter('week')} className="h-6 px-2 text-xs">Week</Button>
                <Button size="sm" variant={timeFilter === 'month' ? 'secondary' : 'ghost'} onClick={() => setTimeFilter('month')} className="h-6 px-2 text-xs">Month</Button>
                <Button size="sm" variant={timeFilter === 'quarter' ? 'secondary' : 'ghost'} onClick={() => setTimeFilter('quarter')} className="h-6 px-2 text-xs">Quarter</Button>
              </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            {propertiesLoading ? <Skeleton className="h-7 w-16"/> : <div className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</div>}
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
            {propertiesLoading ? <Skeleton className="h-80 w-full" /> : <PropertiesCarousel properties={properties} />}
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

    