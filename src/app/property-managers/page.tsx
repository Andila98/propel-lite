
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
import { PropertyManagerTable } from '@/components/property-manager-table';
import { useManagers } from '@/hooks/use-managers';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertyManagersPage() {
  const { managers, loading, error, refresh } = useManagers();
  
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
        <h2 className="text-3xl font-bold tracking-tight">Property Managers</h2>
        <Link href="/property-managers/add">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Manager
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Property Managers</CardTitle>
          <CardDescription>
            A list of all your property managers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && renderSkeleton()}
          {error && <p className="text-destructive text-center">{error}</p>}
          {!loading && !error && <PropertyManagerTable managers={managers} onManagerDeleted={refresh} />}
        </CardContent>
      </Card>
    </div>
  );
}
