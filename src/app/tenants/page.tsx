
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
import type { PropertyManager, Tenant, Property } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        setLoading(true);
        try {
            const [tenantsRes, propertiesRes] = await Promise.all([
                fetch('/api/tenants'),
                fetch('/api/properties')
            ]);
            
            const tenantsData = await tenantsRes.json();
            const propertiesData = await propertiesRes.json();
            
            setTenants(tenantsData);
            setProperties(propertiesData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);


  const renderSkeleton = () => (
    <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
        ))}
    </div>
  );
  
  const canAddTenants = user?.role === 'landlord' || user?.permissions?.canAddTenants;

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
          {loading ? renderSkeleton() : <TenantTable tenants={tenants} properties={properties} />}
        </CardContent>
      </Card>
    </div>
  );
}
