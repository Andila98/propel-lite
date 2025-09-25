"use client";

import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, WifiOff } from 'lucide-react';
import type { MaintenanceRequest } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { fetcher } from '@/lib/utils';

export default function MaintenancePage() {
    const { data: requests, error, isLoading, mutate } = useSWR<MaintenanceRequest[]>('/api/maintenance', fetcher);
    const { toast } = useToast();

    const priorityVariant = (priority?: MaintenanceRequest['priority']): 'destructive-gradient' | 'warning-gradient' | 'info-gradient' | 'default' => {
        switch (priority) {
            case 'High': return 'destructive-gradient';
            case 'Medium': return 'warning-gradient';
            case 'Low': return 'info-gradient';
            default: return 'default';
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Priority</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Description</TableHead>
                             <TableHead>AI Reasoning</TableHead>
                             <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }

        if (error) {
            const errorMessage = error.info?.error || error.message || 'Failed to fetch maintenance requests.';
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
            return (
                 <div className="flex flex-col items-center justify-center h-60 text-center text-destructive p-4">
                    <WifiOff className="h-12 w-12 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Failed to Load Requests</h3>
                    <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
                    <Button onClick={() => mutate()} variant="outline">Retry</Button>
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>AI Reasoning</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests?.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell>
                                <Badge variant={priorityVariant(req.priority)}>
                                    {req.priority || 'N/A'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(req.submittedDate), { addSuffix: true })}
                            </TableCell>
                            <TableCell>{req.tenantName}</TableCell>
                            <TableCell className="max-w-xs truncate">{req.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{req.reasoning}</TableCell>
                            <TableCell>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        {req.status}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Pending</DropdownMenuItem>
                                    <DropdownMenuItem>In Progress</DropdownMenuItem>
                                    <DropdownMenuItem>Completed</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center gap-4">
                <Wrench className="h-8 w-8" />
                <h2 className="text-3xl font-bold tracking-tight">Maintenance Requests</h2>
            </div>
            <Card>
                <CardHeader>
                <CardTitle>Prioritized Task List</CardTitle>
                <CardDescription>
                    A list of all open maintenance requests, prioritized by AI based on urgency.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}
