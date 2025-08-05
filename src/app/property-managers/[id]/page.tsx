
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { PropertyManager, Permission } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, ShieldCheck, CheckCircle, XCircle, Building } from 'lucide-react';
import { PropertyTable } from '@/components/property-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AnimatedEditIcon } from '@/components/icons/animated-edit-icon';
import { AnimatedDeleteIcon } from '@/components/icons/animated-delete-icon';
import { AnimatedBackIcon } from '@/components/icons/animated-back-icon';
import { useProperties } from '@/hooks/use-properties';
import { permissionLabels } from '@/lib/types';
import { useManagers } from '@/hooks/use-managers';


export default function PropertyManagerDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  const managerId = id as string;
  const { managers } = useManagers();
  const manager = managers.find(m => m.id === managerId);
  const { properties } = useProperties();

  if (!manager) {
    return <div>Loading...</div>;
  }
  
  const managedProperties = properties.filter(p => manager.propertiesManaged.includes(p.id));

  const handleDelete = () => {
    console.log(`Deleting manager: ${manager.id}`);
    toast({
      title: "Manager Deleted",
      description: `${manager.name} has been removed from your records.`,
    });
    router.push('/property-managers');
  };
  
  const activePermissions = Object.entries(manager.permissions)
    .filter(([, value]) => value)
    .map(([key]) => permissionLabels[key as Permission]);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/property-managers">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <AnimatedBackIcon />
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
        <div className="flex items-center gap-2">
            <Link href={`/property-managers/${manager.id}/edit`}>
                 <Button variant="outline">
                    <AnimatedEditIcon /> Edit
                </Button>
            </Link>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <AnimatedDeleteIcon /> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this manager and all associated data.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6">
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
            </CardContent>
          </Card>
           <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/> Permissions</CardTitle>
                  <CardDescription>This manager has the following permissions:</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {activePermissions.map(permission => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{permission}</span>
                        </div>
                    ))}
                    {activePermissions.length === 0 && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span>No permissions assigned.</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle  className="flex items-center gap-2"><Building className="h-5 w-5"/> Managed Properties</CardTitle>
              <CardDescription>Properties assigned to {manager.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyTable properties={managedProperties} tenants={[]} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
