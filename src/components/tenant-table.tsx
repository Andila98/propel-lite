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
import type { Tenant, Property } from '@/lib/types';

export function TenantTable({ tenants, properties }: { tenants: Tenant[], properties: Property[] }) {
  const getPropertyAddress = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.address || 'N/A';
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Rent Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={tenant.avatarUrl} alt={tenant.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{tenant.name}</span>
              </div>
            </TableCell>
            <TableCell>{getPropertyAddress(tenant.propertyId)}</TableCell>
            <TableCell>
              <Badge variant={tenant.rentStatus === 'Paid' ? "default" : "destructive"}>
                {tenant.rentStatus}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
