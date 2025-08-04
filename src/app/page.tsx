
"use client";

import { Home, Banknote, Building2, UserCheck, Activity, UserCog, Trophy } from 'lucide-react';
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
import { useTenants } from '@/hooks/use-tenants';
import { Button } from '@/components/ui/button';
import type { Payment, ActivityItem, Property } from '@/lib/types';
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

// Mock data for AI Anomaly Alerts
const anomalyAlerts: ActivityItem[] = [
    { id: 'alert1', type: 'income-drop', description: "Property '123 Main St' income dropped 40% this month.", date: '2 days ago' },
    { id: 'alert2', type: 'vacancy-rate', description: "Unusual vacancy rate (25%) compared to last quarter (10%).", date: '1 week ago' },
    { id: 'alert3', type: 'income-drop', description: "Maintenance requests for '456 Oak Ave' are up 50% this month.", date: '3 days ago' },
];

export default function DashboardPage() {
  const { properties, loading: propertiesLoading } = useProperties();
  const { tenants, loading: tenantsLoading } = useTenants();
  const [timeFilter, setTimeFilter] = useState('month');
  const managers = []; // Replace with useManagers hook later
  
  useEffect(() => {
    console.log("Frontend: DashboardPage component mounted.");
  }, []);

  const allPayments: (Payment & { propertyId: string })[] = useMemo(() => 
      tenants.flatMap(tenant => 
        (tenant.paymentHistory || []).map(p => ({ ...p, propertyId: tenant.propertyId }))
      ),
    [tenants]
  );

  const { filteredRevenue, topPerformer } = useMemo(() => {
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

    const revenueByProperty: { [key: string]: number } = {};

    const totalRevenue = allPayments.reduce((acc, payment) => {
        const paymentDate = new Date(payment.date);
        if (isWithinInterval(paymentDate, interval)) {
            if (payment.propertyId) {
                revenueByProperty[payment.propertyId] = (revenueByProperty[payment.propertyId] || 0) + payment.amount;
            }
            return acc + payment.amount;
        }
        return acc;
    }, 0);

    let topProperty: (Property & { revenue: number }) | null = null;
    if (Object.keys(revenueByProperty).length > 0) {
        const topPropertyId = Object.entries(revenueByProperty).sort((a, b) => b[1] - a[1])[0][0];
        const propertyDetails = properties.find(p => p.id === topPropertyId);
        if (propertyDetails) {
            topProperty = {
                ...propertyDetails,
                revenue: revenueByProperty[topPropertyId]
            }
        }
    }

    return { filteredRevenue: totalRevenue, topPerformer: topProperty };
  }, [allPayments, timeFilter, properties]);


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
              {tenantsLoading ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{tenants.length}</div>}
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
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performer</CardTitle>
              <CardDescription>
                Highest earning property this {timeFilter}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {propertiesLoading || tenantsLoading ? <Skeleton className="h-24 w-full" /> : (
                topPerformer ? (
                  <Link href={`/properties/${topPerformer.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-500">
                          <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold">{topPerformer.address}</p>
                        <p className="text-lg font-semibold text-primary">Ksh{topPerformer.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="text-center text-muted-foreground p-4">No revenue data for this period.</div>
                )
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>AI Anomaly Alerts</CardTitle>
              <CardDescription>
                Potential issues flagged by our AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivities activities={anomalyAlerts} />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? <Skeleton className="h-64 w-full" /> : <TenantTable tenants={tenants} properties={properties} />}
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
