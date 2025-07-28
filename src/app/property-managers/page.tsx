
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { mockPropertyManagers } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { PropertyManagerTable } from '@/components/property-manager-table';

export default function PropertyManagersPage() {
  const managers = mockPropertyManagers;

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
          <PropertyManagerTable managers={managers} />
        </CardContent>
      </Card>
    </div>
  );
}
