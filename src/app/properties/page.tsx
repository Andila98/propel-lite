
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PropertyTable } from '@/components/property-table';
import { firestore } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';
// Note: We are assuming a simplified permission model for now.
// In a real app, you would get the current user's role from a session.
const currentUserRole = 'Full Manager';

async function getProperties(): Promise<Property[]> {
  const propertiesSnapshot = await firestore.collection('properties').get();
  if (propertiesSnapshot.empty) {
    return [];
  }
  const properties = await Promise.all(propertiesSnapshot.docs.map(async (doc) => {
    const propertyData = doc.data() as Property;
    
    // Fetch units for each property
    const unitsSnapshot = await doc.ref.collection('units').get();
    const units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() })) as Unit[];
    
    return {
      id: doc.id,
      ...propertyData,
      units: units,
      createdAt: propertyData.createdAt ? (propertyData.createdAt as any).toDate() : new Date(),
    };
  }));

  return properties;
}

export default async function PropertiesPage() {
  const properties = await getProperties();

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
          <PropertyTable properties={properties} />
        </CardContent>
      </Card>
    </div>
  );
}
