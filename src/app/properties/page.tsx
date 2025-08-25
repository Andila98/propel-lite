
"use client";

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
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


export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const canAddProperties = user?.role === 'landlord' || user?.permissions?.canAddProperties;

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      try {
        const res = await fetch('/api/properties');
        if (!res.ok) throw new Error("Failed to fetch properties");
        const data = await res.json();
        setProperties(data);
      } catch (err: any) {
        toast({ title: "Error", description: "Could not load properties.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, [toast]);

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
        <h2 className="text-3xl font-bold tracking-tight">Properties</h2>
        {canAddProperties && (
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
          {loading ? renderSkeleton() : <PropertyTable properties={properties} />}
        </CardContent>
      </Card>
    </div>
  );
}
