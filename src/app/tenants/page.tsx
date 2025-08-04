
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
import type { PropertyManager } from '@/lib/types';
import { useProperties } from '@/hooks/use-properties';

export default function TenantsPage() {
  const { properties } = useProperties();
  const tenants = []; // Replace with useTenants hook

  // In a real app, you'd get the current user's role from your auth context/session.
  // We'll simulate a "Full Manager" role for demonstration.
  const currentUserRole: PropertyManager['accessLevel'] = 'Full Manager';

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
        {/* According to the permissions, Limited Staff have view-only access to tenants */}
        {currentUserRole === 'Full Manager' && (
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
          <TenantTable tenants={tenants} properties={properties} />
        </CardContent>
      </Card>
    </div>
  );
}
