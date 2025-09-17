
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { FileClock, Building, Home, User, WifiOff } from 'lucide-react';
import type { AuditLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const entityIcons: Record<AuditLog['entityType'], React.ReactNode> = {
    Property: <Building className="h-4 w-4" />,
    Unit: <Home className="h-4 w-4" />,
    Tenant: <User className="h-4 w-4" />,
    Manager: <User className="h-4 w-4" />,
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/audit-logs');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch audit logs.');
            }
            const data = await response.json();
            setLogs(data);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const renderContent = () => {
        if (loading) {
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Manager</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-60 text-center text-destructive p-4">
                    <WifiOff className="h-12 w-12 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Failed to Load Audit Logs</h3>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchLogs} variant="outline">Retry</Button>
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="font-medium">{log.managerName}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
                                    {entityIcons[log.entityType]}
                                    {log.entityType}
                                </Badge>
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
                <FileClock className="h-8 w-8" />
                <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
            </div>
            <Card>
                <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>
                    A chronological log of all important actions taken within your account.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}
