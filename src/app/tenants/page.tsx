
"use client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { TenantTable } from '@/components/tenant-table';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenants } from '@/hooks/use-tenants';

export default function TenantsPage() {
  const { user } = useAuth();
  const { tenants, properties, loading, error } = useTenants();
  
  const canAddTenants = user?.role === 'landlord' || (user?.role === 'manager' && user?.permissions?.canAddTenants);

  const renderSkeleton = () => (
    <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
        ))}
    </div>
  );

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
        {canAddTenants && (
          <Link href="/tenants/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Tenant
            </Button>
          </Link>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            A list of all tenants across your properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && renderSkeleton()}
          {error && <p className="text-destructive text-center">{error}</p>}
          {!loading && !error && <TenantTable tenants={tenants} properties={properties} />}
        </CardContent>
      </Card>
    </div>
  );
}
