
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { PropertyTable } from '@/components/property-table';
import type { PropertyManager } from '@/lib/types';
import { useProperties } from '@/hooks/use-properties';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { mockTenants } from '@/lib/mock-data';

export default function PropertiesPage() {
  const router = useRouter();
  const { properties, loading, error } = useProperties();
  
  // In a real app, you'd fetch tenants from Firestore too
  const tenants = mockTenants; 

  // In a real app, you'd get the current user's role from your auth context/session.
  // We'll simulate a "Full Manager" role for demonstration.
  const currentUserRole: PropertyManager['accessLevel'] = 'Full Manager';

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-[200px] w-full" />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-center text-destructive p-4">
            <WifiOff className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Failed to Load Properties</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      );
    }
    
    if (properties.length === 0) {
        return <p className="text-center text-muted-foreground py-10">No properties found. Add your first one!</p>
    }

    return <PropertyTable properties={properties} tenants={tenants} />;
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Properties</h2>
        {currentUserRole === 'Full Manager' && (
          <Link href="/properties/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </Link>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Properties</CardTitle>
          <CardDescription>
            A list of all your managed properties. Click a row to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
