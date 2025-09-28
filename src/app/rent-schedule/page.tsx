
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
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  PlusCircle, 
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Tenant, Property, Payment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type TenantWithDetails = Tenant & { propertyAddress?: string; propertyCurrency?: string; balance: number };
type Reminder = { id: string; scheduledFor: string; reminderType: string; tenantId: string };

const StatusIndicator = ({ status, size = "sm" }: { status: Tenant['rentStatus'], size?: "sm" | "md" }) => {
  const statusConfig = {
    'Paid': { variant: 'success-gradient' as const, icon: CheckCircle2 },
    'Overdue': { variant: 'destructive-gradient' as const, icon: AlertTriangle },
    'Partially Paid': { variant: 'warning-gradient' as const, icon: Clock },
    'Advance': { variant: 'info-gradient' as const, icon: TrendingUp }
  } as const;

  const config = statusConfig[status];
  const Icon = config.icon;
  const dotSize = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  return (
    <div className={cn("flex items-center gap-2", size === "md" && "p-2 rounded-lg border bg-card/50")}>
      <Badge variant={config.variant} className={cn("p-0 rounded-full", dotSize)} />
      {size === "md" && <Icon className="h-4 w-4" />}
    </div>
  );
};

const DayCell = ({ day, statuses, reminders }: { day: Date, statuses: TenantWithDetails[], reminders: Reminder[] }) => {
  const overdueCount = statuses.filter(t => t.rentStatus === 'Overdue').length;
  const paidCount = statuses.filter(t => t.rentStatus === 'Paid').length;
  const partialCount = statuses.filter(t => t.rentStatus === 'Partially Paid').length;
  const advanceCount = statuses.filter(t => t.rentStatus === 'Advance').length;
  const hasReminder = reminders.length > 0;
  const hasRentDue = statuses.length > 0;
  const isRentDueDay = day.getDate() === 1;
  
  return (
    <div className={cn(
      "flex flex-col h-full p-2 text-xs text-left relative overflow-hidden transition-all duration-200",
      isRentDueDay && "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary",
      hasRentDue && "hover:shadow-md hover:scale-105"
    )}>
      <div className="flex justify-between items-start mb-1">
        <span className={cn("font-medium", isRentDueDay ? "text-primary text-sm" : "text-foreground")}>{format(day, 'd')}</span>
        <div className="flex items-center gap-1">
          {hasReminder && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
          {isRentDueDay && <CalendarIcon className="h-3 w-3 text-primary" />}
        </div>
      </div>
      
      <div className="flex-grow space-y-1">
        {hasRentDue && (
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">{statuses.length} tenant{statuses.length !== 1 ? 's' : ''}</p>
            <div className="flex flex-wrap gap-1">
              {paidCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Paid" />
                  <span className="text-green-600 font-medium">{paidCount}</span>
                </div>
              )}
              {overdueCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Overdue" />
                  <span className="text-destructive font-medium">{overdueCount}</span>
                </div>
              )}
              {partialCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Partially Paid" />
                  <span className="text-yellow-600 font-medium">{partialCount}</span>
                </div>
              )}
              {advanceCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Advance" />
                  <span className="text-blue-600 font-medium">{advanceCount}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {hasReminder && !hasRentDue && (
          <div className="flex items-center gap-1 text-green-500">
            <Clock className="h-3 w-3" />
            <span>Reminder</span>
          </div>
        )}
      </div>
    </div>
  );
};


const StatsCard = ({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
       {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
    </CardContent>
  </Card>
);

export default function RentSchedulePage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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
      } catch (error: unknown) {
        const typedError = error as Error;
        toast({ title: "Error", description: `Could not load schedule data: ${typedError.message}`, variant: "destructive" });
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const eventDataByDay = useMemo(() => {
    if (dataLoading) return {} as Record<string, { statuses: TenantWithDetails[], reminders: Reminder[] }>;
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
              const paymentDate = new Date(p.date as string);
              return paymentDate.getMonth() === currentDate.getMonth() && 
                     paymentDate.getFullYear() === currentDate.getFullYear() && 
                     p.type === 'Rent';
            })
            .reduce((acc, p) => acc + p.amount, 0);

          const balance = rentAmount - paymentsThisMonth;
          let status: Tenant['rentStatus'] = 'Overdue';
          if (balance <= 0) status = paymentsThisMonth > rentAmount ? 'Advance' : 'Paid';
          else if (paymentsThisMonth > 0 && balance > 0) status = 'Partially Paid';

          const tenantWithDetails = {
            ...tenant,
            rentStatus: status,
            propertyAddress: property?.address,
            propertyCurrency: property?.currency,
            balance
          };

          if (filterStatus !== "all" && status.toLowerCase().replace(/ /g, '') !== filterStatus.toLowerCase().replace(/ /g, '')) {
            return;
          }
          
          if (searchTerm && !tenant.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return;
          }

          events[dayKey].statuses.push(tenantWithDetails);
        });
      }
      
      events[dayKey].reminders = (reminders || []).filter(r => isSameDay(new Date(r.scheduledFor), day));
    });
    return events;
  }, [tenants, properties, payments, reminders, currentDate, dataLoading, rentDueDate, filterStatus, searchTerm]);

  const stats = useMemo(() => {
    const allStatuses = Object.values(eventDataByDay).flatMap(day => day.statuses);
    const totalTenants = allStatuses.length;
    const paidCount = allStatuses.filter(t => t.rentStatus === 'Paid').length;
    const overdueCount = allStatuses.filter(t => t.rentStatus === 'Overdue').length;
    const totalRevenue = allStatuses.reduce((acc, t) => {
      const property = properties.find(p => p.id === t.propertyId);
      const unit = property?.units.find(u => u.id === t.currentUnitId);
      return acc + (unit?.rent || 0);
    }, 0);

    return { totalTenants, paidCount, overdueCount, totalRevenue };
  }, [eventDataByDay, properties]);

  const handleDayClick = (day: Date) => setSelectedDay(day);
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedDayEvents = selectedDayKey ? eventDataByDay[selectedDayKey] : null;

  const renderStatusBadge = (status: Tenant['rentStatus']) => {
    const statusMap = {
      'Paid': 'success-gradient' as const,
      'Overdue': 'destructive-gradient' as const,
      'Partially Paid': 'warning-gradient' as const,
      'Advance': 'info-gradient' as const
    };
    const variant = statusMap[status];
    return <Badge variant={variant} className="text-white">{status}</Badge>;
  };

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-[600px] lg:col-span-2" />
            <Skeleton className="h-[600px] lg:col-span-1" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Tenants" value={stats.totalTenants} icon={Users} trend={`${stats.totalTenants} tenants with rent due`} />
          <StatsCard title="Paid This Month" value={stats.paidCount} icon={CheckCircle2} trend={`${((stats.paidCount / stats.totalTenants) * 100 || 0).toFixed(1)}% paid`} color="text-green-600 dark:text-green-400" />
          <StatsCard title="Overdue" value={stats.overdueCount} icon={AlertTriangle} trend={stats.overdueCount > 0 ? "Needs attention" : "All caught up!"} color="text-destructive dark:text-red-400" />
          <StatsCard title="Expected Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} trend="This month" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xl font-bold text-foreground">{format(currentDate, 'MMMM yyyy')}</span>
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Rent due on 1st</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-6">
              <Calendar
                month={currentDate} 
                onMonthChange={setCurrentDate} 
                onDayClick={handleDayClick} 
                selected={selectedDay}
                className="p-4"
                classNames={{
                  table: 'w-full border-collapse',
                  head_row: 'flex mb-4',
                  head_cell: 'w-full text-center font-semibold text-muted-foreground text-sm py-2',
                  row: 'flex w-full mt-2',
                  cell: 'h-32 flex-1 text-center text-sm p-1 relative',
                  day: 'h-full w-full p-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring hover:shadow-lg transition-all duration-200 border border-border',
                  day_selected: 'ring-2 ring-ring ring-offset-2 bg-primary/10 text-primary-foreground border-primary',
                  day_today: 'bg-accent text-accent-foreground shadow-lg',
                  day_outside: 'text-muted-foreground',
                  day_disabled: 'text-muted-foreground opacity-50',
                }}
                components={{ 
                  DayContent: ({ date }) => (
                    <DayCell 
                      day={date} 
                      statuses={eventDataByDay[format(date, 'yyyy-MM-dd')]?.statuses || []} 
                      reminders={eventDataByDay[format(date, 'yyyy-MM-dd')]?.reminders || []} 
                    />
                  )
                }}
              />
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t pt-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><StatusIndicator status="Paid" size="sm" /><span className="font-medium">Paid</span></div>
                <div className="flex items-center gap-2"><StatusIndicator status="Overdue" size="sm" /><span className="font-medium">Overdue</span></div>
                <div className="flex items-center gap-2"><StatusIndicator status="Partially Paid" size="sm" /><span className="font-medium">Partial</span></div>
                <div className="flex items-center gap-2"><StatusIndicator status="Advance" size="sm" /><span className="font-medium">Advance</span></div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
                <Link href="/reminders"><Button><PlusCircle className="mr-2 h-4 w-4" /> New Reminder</Button></Link>
              </div>
            </CardFooter>
          </Card>
          
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold">Filters & Search</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status Filter</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partiallypaid">Partially Paid</SelectItem>
                      <SelectItem value="advance">Advance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Search Tenants</Label>
                  <Input placeholder="Type tenant name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-[400px]">
              <CardContent className="p-6">
                {!selectedDayEvents || (selectedDayEvents.statuses.length === 0 && selectedDayEvents.reminders.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center pt-16">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4"><CalendarIcon className="h-10 w-10 text-muted-foreground" /></div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Select a day</h3>
                    <p className="text-sm text-muted-foreground">Click on any day in the calendar to see details.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{selectedDay ? format(selectedDay, 'PPP') : "Select a day"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDayEvents.statuses.length} tenant{selectedDayEvents.statuses.length !== 1 ? 's' : ''} 
                        {selectedDayEvents.reminders.length > 0 && ` • ${selectedDayEvents.reminders.length} reminder${selectedDayEvents.reminders.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    
                    {selectedDayEvents.statuses.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" />Rent Status</h4>
                        <div className="space-y-3">
                          {selectedDayEvents.statuses.map(tenant => (
                            <div key={tenant.id} className="p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <Link href={`/tenants/${tenant.id}`} className="font-medium text-primary hover:underline">{tenant.name}</Link>
                                  <p className="text-xs text-muted-foreground">{tenant.propertyAddress}</p>
                                </div>
                                {renderStatusBadge(tenant.rentStatus)}
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Balance:</span>
                                <span className={cn("font-semibold", tenant.balance > 0 ? "text-destructive" : "text-green-600")}>
                                  {formatCurrency(tenant.balance, tenant.propertyCurrency)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedDayEvents.reminders.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Clock className="h-4 w-4" />Scheduled Reminders</h4>
                        <div className="space-y-3">
                          {selectedDayEvents.reminders.map(reminder => {
                            const tenant = tenants.find(t => t.id === reminder.tenantId);
                            return (
                              <div key={reminder.id} className="p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-foreground capitalize">{reminder.reminderType.replace('Due', ' Due')}</p>
                                    <p className="text-xs text-muted-foreground">{tenant?.name || 'N/A'}</p>
                                  </div>
                                  <Badge variant="secondary">Scheduled</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">Rent Schedule</h2>
          <p className="text-muted-foreground mt-1">Monitor rent payments and manage tenant reminders</p>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
