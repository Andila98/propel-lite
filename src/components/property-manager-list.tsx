
"use client";

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PropertyManager } from '@/lib/types';

export function PropertyManagerList({ managers }: { managers: PropertyManager[] }) {
  const router = useRouter();

  const handleRowClick = (managerId: string) => {
    router.push(`/property-managers/${managerId}`);
  };
  
  return (
    <div className="space-y-6">
      {managers.map((manager) => (
        <div key={manager.id} className="flex items-center cursor-pointer" onClick={() => handleRowClick(manager.id)}>
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
