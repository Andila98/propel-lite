
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Tenant, Property, Payment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type TenantWithDetails = Tenant & { propertyAddress?: string; propertyCurrency?: string; balance: number };
type Reminder = { id: string; scheduledFor: string; reminderType: string; tenantId: string };

const DayCell = ({ day, statuses, reminders }: { day: Date, statuses: TenantWithDetails[], reminders: Reminder[] }) => {
    const overdueCount = statuses.filter(t => t.rentStatus === 'Overdue').length;
    const hasReminder = reminders.length > 0;
    const hasRentDue = statuses.length > 0;
    
    return (
        <div className="flex flex-col h-full p-2 text-xs text-left">
            <div className="flex justify-between items-start">
                <span>{format(day, 'd')}</span>
                 {hasRentDue && <div className="h-2 w-2 rounded-full bg-destructive mt-1" />}
                {hasReminder && !hasRentDue && <div className="h-2 w-2 rounded-full bg-green-500 mt-1" />}
            </div>
            <div className="flex-grow mt-1 space-y-1 text-muted-foreground">
                {hasRentDue && (
                    <div>
                        <p>{statuses.length} tenants due</p>
                        {overdueCount > 0 && <p className="text-destructive">{overdueCount} overdue</p>}
                    </div>
                )}
                {hasReminder && (
                    <div>
                        <p>Reminder scheduled</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function RentSchedulePage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const rentDueDate = 1;

  useEffect(() => {
    async function fetchData() {
        setDataLoading(true);
        try {
             const [tenantsRes, propertiesRes, paymentsRes, remindersRes] = await Promise.all([
                fetch('/api/tenants'),
                fetch('/api/properties'),
                fetch('/api/payments'),
                fetch('/api/reminders')
            ]);

            const tenantsResponse = await tenantsRes.json();
            const propertiesData = await propertiesRes.json();
            const paymentsData: Payment[] = await paymentsRes.json();
            const remindersData: Reminder[] = await remindersRes.json();
            
            setTenants(tenantsResponse.tenants || []);
            setProperties(propertiesData.properties || []);
            setPayments(paymentsData);
            setReminders(remindersData || []);
        } catch (error) {
            toast({ title: "Error", description: "Could not load schedule data.", variant: "destructive" });
        } finally {
            setDataLoading(false);
        }
    }
    fetchData();
  }, [toast]);

  const eventDataByDay = useMemo(() => {
    if (dataLoading) return {};
    const events: Record<string, { statuses: TenantWithDetails[], reminders: Reminder[] }> = {};
    const interval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };

    eachDayOfInterval(interval).forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        events[dayKey] = { statuses: [], reminders: [] };

        if (day.getDate() === rentDueDate) {
            tenants.forEach(tenant => {
                const property = properties.find(p => p.id === tenant.propertyId);
                const unit = property?.units.find(u => u.id === tenant.currentUnitId);
                const rentAmount = unit?.rent || 0;
                
                const paymentsThisMonth = payments
                    .filter(p => {
                        if (p.tenantId !== tenant.id) return false;
                        const paymentDate = new Date(p.date);
                        return paymentDate.getMonth() === currentDate.getMonth() && paymentDate.getFullYear() === currentDate.getFullYear() && p.type === 'Rent';
                    })
                    .reduce((acc, p) => acc + p.amount, 0);

                const balance = rentAmount - paymentsThisMonth;
                let status: Tenant['rentStatus'] = 'Overdue';
                if (balance <= 0) status = paymentsThisMonth > rentAmount ? 'Advance' : 'Paid';
                else if (paymentsThisMonth > 0 && balance > 0) status = 'Partially Paid';

                events[dayKey].statuses.push({ ...tenant, rentStatus: status, propertyAddress: property?.address, propertyCurrency: property?.currency, balance });
            });
        }
        
        events[dayKey].reminders = reminders.filter(r => isSameDay(new Date(r.scheduledFor), day));
    });
    return events;
  }, [tenants, properties, payments, reminders, currentDate, dataLoading, rentDueDate]);


  const handleDayClick = (day: Date) => setSelectedDay(day);
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayEvents = selectedDayKey ? eventDataByDay[selectedDayKey] : null;

  const renderStatusPill = (status: Tenant['rentStatus']) => {
      const statusMap = { 'Paid': 'default', 'Overdue': 'destructive', 'Partially Paid': 'secondary', 'Advance': 'outline' } as const;
      return <Badge variant={statusMap[status]}>{status}</Badge>;
  }

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-[500px] lg:col-span-2" />
            <Skeleton className="h-[500px] lg:col-span-1" />
        </div>
      );
    }
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-card/50 flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <span className="text-lg font-medium">{format(currentDate, 'MMMM yyyy')}</span>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Rent is due on the 1st.</p>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                    <Calendar
                        month={currentDate} 
                        onMonthChange={setCurrentDate} 
                        onDayClick={handleDayClick} 
                        selected={selectedDay}
                        className="p-0 h-full"
                        classNames={{
                            table: 'w-full border-collapse h-full',
                            head_row: 'flex mb-2',
                            head_cell: 'w-full text-muted-foreground rounded-md text-xs font-normal',
                            row: 'flex w-full mt-2 space-x-2',
                            cell: 'h-28 flex-1 text-center text-sm p-0 relative rounded-md bg-background focus-within:relative focus-within:z-20',
                            day: 'h-full w-full p-0 rounded-md focus:outline-none focus:ring-2 focus:ring-ring',
                            day_selected: 'bg-transparent border-2 border-primary text-primary-foreground',
                            day_today: 'bg-accent text-accent-foreground',
                            day_outside: 'text-muted-foreground opacity-50',
                            day_disabled: 'text-muted-foreground opacity-50',
                        }}
                        components={{ DayContent: ({ date }) => <DayCell day={date} statuses={eventDataByDay[format(date, 'yyyy-MM-dd')]?.statuses || []} reminders={eventDataByDay[format(date, 'yyyy-MM-dd')]?.reminders || []} /> }}
                    />
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-4 mt-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500"></div> Paid</div>
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-destructive"></div> Overdue</div>
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-yellow-500"></div> Partial</div>
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-500"></div> Advance</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
                        <Link href="/reminders">
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Reminder</Button>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
            <div className="lg:col-span-1">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm text-muted-foreground">Filter</span>
                    <Select defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="Search tenants..." className="flex-1" />
                </div>
                <Card className="min-h-[500px]">
                    <CardContent className="p-6">
                        {!selectedDayEvents || (selectedDayEvents.statuses.length === 0 && selectedDayEvents.reminders.length === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
                                <h3 className="text-lg font-semibold text-foreground">Select a day from the calendar to see details</h3>
                                <p className="text-sm">Tip: Use the filter & search to narrow results.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold mb-2">{selectedDay ? `Details for ${format(selectedDay, 'PPP')}` : "Select a day"}</h3>
                                {selectedDayEvents.statuses.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-sm mb-2">Rent Status</h4>
                                        <ul className="space-y-3">
                                        {selectedDayEvents.statuses.map(tenant => (
                                            <li key={tenant.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                                            <div>
                                                <Link href={`/tenants/${tenant.id}`} className="font-medium hover:underline">{tenant.name}</Link>
                                                <p className="text-xs text-muted-foreground">{tenant.propertyAddress}</p>
                                            </div>
                                            <div className="text-right">
                                                {renderStatusPill(tenant.rentStatus)}
                                                <p className="text-xs text-muted-foreground mt-1">Balance: {formatCurrency(tenant.balance, tenant.propertyCurrency)}</p>
                                            </div>
                                            </li>
                                        ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedDayEvents.reminders.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-sm mb-2">Scheduled Reminders</h4>
                                        <ul className="space-y-3">
                                            {selectedDayEvents.reminders.map(reminder => {
                                                const tenant = tenants.find(t => t.id === reminder.tenantId);
                                                return (
                                                    <li key={reminder.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                                                        <div>
                                                            <p className="font-medium capitalize">{reminder.reminderType.replace('Due', ' Due')}</p>
                                                            <p className="text-xs text-muted-foreground">{tenant?.name || 'N/A'}</p>
                                                        </div>
                                                        <Badge variant="secondary">Scheduled</Badge>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Rent Schedule</h2>
      </div>
      {renderContent()}
    </div>
  );
}
