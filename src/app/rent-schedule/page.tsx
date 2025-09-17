
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Tenant, Property, Payment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type TenantWithDetails = Tenant & { propertyAddress?: string; propertyCurrency?: string; balance: number };
type Reminder = { id: string; scheduledFor: string; reminderType: string; tenantId: string };

const DayCell = ({ day, statuses, reminders }: { day: Date, statuses: TenantWithDetails[], reminders: Reminder[] }) => {
    const overdueCount = statuses.filter(t => t.rentStatus === 'Overdue').length;
    const hasReminder = reminders.length > 0;
    
    return (
        <div className="flex flex-col h-full p-1 text-xs">
            <span>{format(day, 'd')}</span>
            <div className="flex-grow mt-1 space-y-1">
                {statuses.length > 0 && (
                    <div className="text-muted-foreground">
                        <p>{statuses.length} tenants due</p>
                        {overdueCount > 0 && <p className="text-destructive">{overdueCount} overdue</p>}
                    </div>
                )}
                {hasReminder && (
                    <p className="text-primary">{reminders.length} reminder{reminders.length > 1 ? 's' : ''}</p>
                )}
            </div>
        </div>
    );
};

export default function RentSchedulePage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { toast } = useToast();

  const rentDueDate = 1; // Assuming rent is due on the 1st of the month

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

        // Rent due logic
        if (day.getDate() === rentDueDate) {
            tenants.forEach(tenant => {
                const property = properties.find(p => p.id === tenant.propertyId);
                const unit = property?.units.find(u => u.id === tenant.currentUnitId);
                const rentAmount = unit?.rent || 0;
                
                const paymentsThisMonth = payments
                    .filter(p => {
                        if (p.tenantId !== tenant.id) return false;
                        const paymentDate = parseISO(p.date as string);
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
        
        // Reminder logic
        events[dayKey].reminders = reminders.filter(r => isSameDay(parseISO(r.scheduledFor), day));
    });
    return events;
  }, [tenants, properties, payments, reminders, currentDate, dataLoading, rentDueDate]);


  const modifiers = useMemo(() => {
    const mods: Record<string, Date[]> = { paid: [], overdue: [], partiallyPaid: [], advance: [], due: [], reminder: [] };
    for (const dayStr in eventDataByDay) {
        const day = parseISO(dayStr);
        const { statuses, reminders } = eventDataByDay[dayStr];
        
        if(reminders.length > 0) mods.reminder.push(day);

        if(statuses.length > 0) {
            mods.due.push(day);
            const hasOverdue = statuses.some(t => t.rentStatus === 'Overdue');
            const hasPartiallyPaid = statuses.some(t => t.rentStatus === 'Partially Paid');
            const allPaidOrAdvance = statuses.every(t => t.rentStatus === 'Paid' || t.rentStatus === 'Advance');

            if (hasOverdue) mods.overdue.push(day);
            else if (hasPartiallyPaid) mods.partiallyPaid.push(day);
            else if (allPaidOrAdvance) mods.paid.push(day);
        }
    }
    return mods;
  }, [eventDataByDay]);
  
  const modifiersStyles = {
    paid: { backgroundColor: 'var(--chart-1)', color: 'white' },
    overdue: { backgroundColor: 'var(--destructive)', color: 'white' },
    partiallyPaid: { backgroundColor: 'var(--chart-4)', color: 'white' },
    advance: { backgroundColor: 'var(--chart-2)', color: 'white' },
    due: { borderColor: 'var(--primary)' },
    reminder: { border: '2px solid hsl(var(--chart-2))'},
    selected: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }
  };
  
  const handleDayClick = (day: Date) => setSelectedDay(day);
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayEvents = selectedDayKey ? eventDataByDay[selectedDayKey] : null;

  const renderStatusPill = (status: Tenant['rentStatus']) => {
      const statusMap = { 'Paid': 'default', 'Overdue': 'destructive', 'Partially Paid': 'secondary', 'Advance': 'outline' } as const;
      return <Badge variant={statusMap[status]}>{status}</Badge>;
  }

  const renderContent = () => {
    if (dataLoading) {
      return <div className="grid grid-cols-1 lg:grid-cols-5 gap-8"><Skeleton className="h-[400px] lg:col-span-3" /><Skeleton className="h-[400px] lg:col-span-2" /></div>;
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <Calendar
            month={currentDate} onMonthChange={setCurrentDate} modifiers={modifiers} modifiersClassNames={modifiersStyles} onDayClick={handleDayClick} selected={selectedDay}
            className="rounded-md border p-0"
            classNames={{
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'w-full text-muted-foreground rounded-md text-xs font-normal p-2',
              row: 'flex w-full mt-2',
              cell: 'h-24 w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              day: 'h-full w-full p-0 rounded-none bg-transparent hover:bg-accent/50',
            }}
            components={{ DayContent: ({ date }) => <DayCell day={date} statuses={eventDataByDay[format(date, 'yyyy-MM-dd')]?.statuses || []} reminders={eventDataByDay[format(date, 'yyyy-MM-dd')]?.reminders || []} /> }}
          />
           <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-sm">
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{backgroundColor: 'hsl(var(--chart-1))'}}></div> Paid</div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{backgroundColor: 'hsl(var(--destructive))'}}></div> Overdue</div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{backgroundColor: 'hsl(var(--chart-4))'}}></div> Partial</div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{backgroundColor: 'hsl(var(--chart-2))'}}></div> Reminder</div>
                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full border" style={{borderColor: 'hsl(var(--primary))'}}></div> Due Date</div>
            </div>
        </div>
        <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-4">
                <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Search tenants or units..." className="flex-1" />
            </div>
            <div className="border rounded-lg p-4 h-[350px] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">{selectedDay ? `Details for ${format(selectedDay, 'PPP')}` : "Select a day"}</h3>
              {!selectedDayEvents || (selectedDayEvents.statuses.length === 0 && selectedDayEvents.reminders.length === 0) ? (
                <p className="text-muted-foreground text-sm pt-4 text-center">No events for this day.</p>
              ) : (
                <div className="space-y-4">
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
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Rent Schedule</h2>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <CardTitle>Monthly Overview</CardTitle>
              <CardDescription>Visualize monthly rent payment statuses and scheduled reminders.</CardDescription>
            </div>
             <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium">{format(currentDate, 'MMMM yyyy')}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {renderContent()}
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
                <Link href="/reminders">
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> New Reminder</Button>
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
