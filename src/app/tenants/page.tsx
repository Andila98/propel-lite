
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { TenantTable } from '@/components/tenant-table';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenants } from '@/hooks/use-tenants';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TenantsPage() {
  const { user } = useAuth();
  const { tenants, properties, tenantsMeta, loading, error, refresh } = useTenants();
  
  const canAddTenants = user?.role === 'landlord' || (user?.role === 'manager' && user?.permissions?.canAddTenants);

  const renderSkeleton = () => (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-full mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
      <Button onClick={refresh} variant="outline">
        Retry
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Tenants Yet</h3>
        <p className="text-muted-foreground text-center mb-6">
          Start by adding tenants to your properties to begin managing your rental business.
        </p>
        {canAddTenants && (
          <Link href="/tenants/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Tenant
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  const renderStats = () => {
    if (!tenantsMeta) return null;
    
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantsMeta.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              Across all properties
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tenantsMeta.activeTenants}</div>
            <p className="text-xs text-muted-foreground">
              Paid or in advance
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{tenantsMeta.overdueTenants}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenantsMeta.totalTenants > 0 
                ? ((tenantsMeta.activeTenants / tenantsMeta.totalTenants) * 100).toFixed(1)
                : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              On-time payments
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Tenants</h2>
        {canAddTenants && tenants.length > 0 && (
          <Link href="/tenants/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </Link>
        )}
      </div>

      {loading && renderSkeleton()}
      
      {error && !loading && renderError()}
      
      {!loading && !error && tenants.length === 0 && renderEmptyState()}
      
      {!loading && !error && tenants.length > 0 && (
        <>
          {renderStats()}
          
          <Card>
            <CardHeader>
              <CardTitle>All Tenants</CardTitle>
              <CardDescription>
                A list of all tenants across your properties.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantTable tenants={tenants} properties={properties} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
