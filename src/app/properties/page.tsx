

"use client";

import Link from 'next/link';
import { PlusCircle, Building2, Users, Home, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PropertyTable } from '@/components/property-table';
import type { Property } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PropertiesResponse {
  properties: Property[];
  meta: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
  };
}

export default function PropertiesPage() {
  const [data, setData] = useState<PropertiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const canAddProperties = user?.role === 'landlord' || (user?.role === 'manager' && user?.permissions?.canAddProperties);

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch('/api/properties');
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `Failed to fetch properties (${res.status})`);
        }
        
        const responseData: PropertiesResponse = await res.json();
        
        setData(responseData);
        
      } catch (err: any) {
        console.error('[Properties] Fetch error:', err);
        setError(err.message || 'Failed to load properties');
        toast({ 
          title: "Error", 
          description: "Could not load properties. Please try again.", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchProperties();
  }, [toast]);

  const renderSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
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
      <Button onClick={() => window.location.reload()} variant="outline">
        Retry
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
        <p className="text-muted-foreground text-center mb-6">
          Get started by adding your first property to begin managing your rental business.
        </p>
        {canAddProperties && (
          <Link href="/properties/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  const renderStats = (meta) => {
    if (!meta) return null;
    
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.totalProperties}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.totalUnits}</div>
            <p className="text-xs text-muted-foreground">
              {meta.occupiedUnits} occupied
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meta.occupancyRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const hasProperties = data && data.properties && data.properties.length > 0;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Properties</h2>
        {canAddProperties && hasProperties && (
          <Link href="/properties/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        )}
      </div>
      
      {loading && renderSkeleton()}
      
      {error && !loading && renderError()}
      
      {!loading && !error && !hasProperties && renderEmptyState()}
      
      {!loading && !error && hasProperties && (
        <>
          {renderStats(data.meta)}
          
          <Card>
            <CardHeader>
              <CardTitle>Your Properties</CardTitle>
              <CardDescription>
                A list of all your managed properties. Click a row to view details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyTable properties={data.properties} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
