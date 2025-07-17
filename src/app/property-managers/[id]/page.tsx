
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { mockPropertyManagers, mockProperties } from '@/lib/mock-data';
import type { PropertyManager } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react';
import { PropertyTable } from '@/components/property-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PropertyManagerDetailPage({ params }: { params: { id: string } }) {
  const manager = mockPropertyManagers.find((m) => m.id === params.id);

  if (!manager) {
    notFound();
  }

  const [accessLevel, setAccessLevel] = useState(manager.accessLevel);
  
  const managedProperties = mockProperties.filter(p => manager.propertiesManaged.includes(p.id));

  const handleAccessLevelChange = (newLevel: "Admin" | "Standard") => {
    // In a real app, you would also make an API call to save this change.
    setAccessLevel(newLevel);
    // You could show a toast notification here to confirm the change.
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
       <div className="flex items-center gap-4">
        <Link href="/property-managers">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Managers</span>
          </Button>
        </Link>
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarImage src={manager.avatarUrl} alt={manager.name} data-ai-hint="person portrait" />
                <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{manager.name}</h2>
                <p className="text-sm text-muted-foreground">Property Manager</p>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{manager.email}</span>
              </div>
               <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{manager.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm flex items-center gap-2">
                  <span>Access Level: </span>
                   <Select value={accessLevel} onValueChange={handleAccessLevelChange}>
                        <SelectTrigger className="w-[120px] h-8">
                            <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Standard">Standard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Managed Properties</CardTitle>
                    <CardDescription>Properties assigned to {manager.name}.</CardDescription>
                </Header>
                <CardContent>
                    <PropertyTable properties={managedProperties} tenants={[]} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
