import { Home, Users, Banknote, Building2, UserCheck, Activity, UserCog } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockProperties, mockTenants, mockPropertyManagers, mockActivities } from '@/lib/mock-data';
import type { Property, Tenant, PropertyManager, ActivityItem } from '@/lib/types';
import { PropertyTable } from '@/components/property-table';
import { TenantTable } from '@/components/tenant-table';

export default function DashboardPage() {
  const properties = mockProperties;
  const tenants = mockTenants;
  const managers = mockPropertyManagers;
  const activities = mockActivities;

  const totalRent = properties.reduce((acc, p) => acc + p.rent, 0);
  const occupiedProperties = tenants.map(t => t.propertyId);
  const occupancyRate = (occupiedProperties.length / properties.length) * 100;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Landlord Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/properties">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Properties
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{properties.length}</div>
              <p className="text-xs text-muted-foreground">
                Managed properties
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/tenants">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tenants
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
              <p className="text-xs text-muted-foreground">
                Across all properties
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="#">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total expected monthly income
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="#">
          <Card className="hover:bg-card/90 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                Percentage of properties occupied
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyTable properties={properties.slice(0, 5)} tenants={tenants} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates on your properties and tenants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivities activities={activities} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantTable tenants={tenants} properties={properties} />
          </CardContent>
        </Card>
        <Link href="/property-managers">
            <Card className="hover:bg-card/90 hover:shadow-md transition-all h-full">
              <CardHeader>
                <CardTitle>Property Managers</CardTitle>
              </CardHeader>
              <CardContent>
                <PropertyManagerList managers={managers} />
              </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  );
}

function PropertyManagerList({ managers }: { managers: PropertyManager[] }) {
  return (
    <div className="space-y-6">
      {managers.map((manager) => (
        <div key={manager.id} className="flex items-center">
          <Avatar className="h-9 w-9">
             <AvatarImage src={manager.avatarUrl} alt={manager.name} data-ai-hint="person portrait" />
            <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{manager.name}</p>
            <p className="text-sm text-muted-foreground">{manager.email}</p>
          </div>
          <div className="ml-auto font-medium">{manager.phone}</div>
        </div>
      ))}
    </div>
  );
}

function RecentActivities({ activities }: { activities: ActivityItem[] }) {
  const ICONS: { [key: string]: React.ReactElement } = {
    'new-tenant': <UserCheck className="h-4 w-4" />,
    'rent-paid': <Banknote className="h-4 w-4" />,
    'lease-ending': <Home className="h-4 w-4" />,
  };
  return (
     <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
             {ICONS[activity.type]}
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm">{activity.description}</p>
            <p className="text-xs text-muted-foreground">{activity.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
