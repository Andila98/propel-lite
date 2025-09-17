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
  Users,
  Moon,
  Sun
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Tenant, Property, Payment } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// NOTE: This file is a dark-theme adapted version of the RentSchedulePage.
// It uses Tailwind's `dark:` variants and adds a small toggle to switch modes by adding/removing the `dark` class on <html>.

type TenantWithDetails = Tenant & { propertyAddress?: string; propertyCurrency?: string; balance: number };
type Reminder = { id: string; scheduledFor: string; reminderType: string; tenantId: string };

const StatusIndicator = ({ status, size = "sm" }: { status: Tenant['rentStatus'], size?: "sm" | "md" }) => {
  const statusConfig = {
    'Paid': { 
      color: 'bg-gradient-to-r from-emerald-500 to-green-500', 
      icon: CheckCircle2, 
      textColor: 'text-emerald-200',
      bgColor: 'bg-emerald-900/40 border-emerald-700'
    },
    'Overdue': { 
      color: 'bg-gradient-to-r from-red-500 to-rose-500', 
      icon: AlertTriangle, 
      textColor: 'text-red-200',
      bgColor: 'bg-red-900/40 border-red-700'
    },
    'Partially Paid': { 
      color: 'bg-gradient-to-r from-amber-500 to-orange-500', 
      icon: Clock, 
      textColor: 'text-amber-200',
      bgColor: 'bg-amber-900/30 border-amber-700'
    },
    'Advance': { 
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500', 
      icon: TrendingUp, 
      textColor: 'text-blue-200',
      bgColor: 'bg-blue-900/30 border-blue-700'
    }
  } as const;

  const config = statusConfig[status];
  const Icon = config.icon;
  const dotSize = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  return (
    <div className={cn("flex items-center gap-2", size === "md" && "p-2 rounded-lg border", config.bgColor)}>
      <div className={cn("rounded-full", dotSize, config.color)} />
      {size === "md" && <Icon className={cn("h-4 w-4", config.textColor)} />}
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
      isRentDueDay && "bg-gradient-to-br from-purple-50 to-pink-50 border-l-2 border-l-purple-400 dark:from-neutral-900 dark:to-neutral-800 dark:border-l-purple-600",
      hasRentDue && "hover:shadow-md hover:scale-105"
    )}>
      <div className="flex justify-between items-start mb-1">
        <span className={cn("font-medium", isRentDueDay ? "text-purple-700 dark:text-purple-300 text-sm" : "text-gray-700 dark:text-gray-200")}>{format(day, 'd')}</span>
        <div className="flex items-center gap-1">
          {hasReminder && <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />}
          {isRentDueDay && <CalendarIcon className="h-3 w-3 text-purple-600 dark:text-purple-300" />}
        </div>
      </div>
      
      <div className="flex-grow space-y-1">
        {hasRentDue && (
          <div className="space-y-1">
            <p className="font-medium text-gray-700 dark:text-gray-300">{statuses.length} tenant{statuses.length !== 1 ? 's' : ''}</p>
            <div className="flex flex-wrap gap-1">
              {paidCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Paid" />
                  <span className="text-emerald-400 font-medium">{paidCount}</span>
                </div>
              )}
              {overdueCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Overdue" />
                  <span className="text-red-400 font-medium">{overdueCount}</span>
                </div>
              )}
              {partialCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Partially Paid" />
                  <span className="text-amber-400 font-medium">{partialCount}</span>
                </div>
              )}
              {advanceCount > 0 && (
                <div className="flex items-center gap-1">
                  <StatusIndicator status="Advance" />
                  <span className="text-blue-400 font-medium">{advanceCount}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {hasReminder && !hasRentDue && (
          <div className="flex items-center gap-1 text-green-400">
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
  icon: any;
  trend?: string;
  color: string;
}) => (
  <div className={cn("p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1", color)}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-300">{title}</p>
        <p className="text-2xl font-bold text-gray-100 dark:text-gray-50">{value}</p>
        {trend && <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{trend}</p>}
      </div>
      <Icon className="h-8 w-8 text-gray-300" />
    </div>
  </div>
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
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const rentDueDate = 1;

  useEffect(() => {
    // Initialize theme from OS preference
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = document.documentElement.classList.contains('dark') || prefersDark;
    setDarkMode(initial);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

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
              const paymentDate = new Date(p.date);
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

          // Apply filters
          if (filterStatus !== "all" && status.toLowerCase().replace(' ', '') !== filterStatus.replace('partial', 'partiallypaid')) {
            return;
          }
          
          if (searchTerm && !tenant.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return;
          }

          events[dayKey].statuses.push(tenantWithDetails);
        });
      }
      
      events[dayKey].reminders = reminders.filter(r => isSameDay(new Date(r.scheduledFor), day));
    });
    return events;
  }, [tenants, properties, payments, reminders, currentDate, dataLoading, rentDueDate, filterStatus, searchTerm]);

  // Calculate stats
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
      'Paid': { variant: 'default' as const, className: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 dark:from-emerald-600 dark:to-emerald-500' },
      'Overdue': { variant: 'destructive' as const, className: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 dark:from-red-600 dark:to-red-500' },
      'Partially Paid': { variant: 'secondary' as const, className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 dark:from-amber-600 dark:to-amber-500' },
      'Advance': { variant: 'outline' as const, className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 dark:from-blue-600 dark:to-blue-500' }
    } as const;
    const config = statusMap[status];
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Tenants"
            value={stats.totalTenants}
            icon={Users}
            trend={`${stats.totalTenants} properties`}
            color="bg-gradient-to-br from-blue-900 to-cyan-900 border-blue-800"
          />
          <StatsCard
            title="Paid This Month"
            value={stats.paidCount}
            icon={CheckCircle2}
            trend={`${((stats.paidCount / stats.totalTenants) * 100 || 0).toFixed(1)}% completion`}
            color="bg-gradient-to-br from-emerald-900 to-green-900 border-emerald-800"
          />
          <StatsCard
            title="Overdue"
            value={stats.overdueCount}
            icon={AlertTriangle}
            trend={stats.overdueCount > 0 ? "Needs attention" : "All caught up!"}
            color={stats.overdueCount > 0 ? "bg-gradient-to-br from-red-900 to-rose-900 border-red-800" : "bg-gradient-to-br from-gray-900 to-slate-900 border-gray-800"}
          />
          <StatsCard
            title="Expected Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            trend="This month"
            color="bg-gradient-to-br from-purple-900 to-pink-900 border-purple-800"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-xl border-0">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all duration-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent dark:from-purple-400 dark:to-pink-400">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all duration-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-800 to-pink-800 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-purple-200" />
                  <span className="text-sm font-medium text-purple-200">Rent due on 1st</span>
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
                  head_cell: 'w-full text-center font-semibold text-gray-300 text-sm py-2',
                  row: 'flex w-full mt-2',
                  cell: 'h-32 flex-1 text-center text-sm p-1 relative',
                  day: 'h-full w-full p-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 hover:shadow-lg transition-all duration-200 border border-gray-700 dark:border-gray-600',
                  day_selected: 'ring-2 ring-purple-500 ring-offset-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white border-purple-500',
                  day_today: 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg',
                  day_outside: 'text-gray-500',
                  day_disabled: 'text-gray-500',
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
            <CardFooter className="flex justify-between items-center border-t pt-6 bg-gradient-to-r from-neutral-900 to-neutral-800">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <StatusIndicator status="Paid" size="md" />
                  <span className="font-medium">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator status="Overdue" size="md" />
                  <span className="font-medium">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator status="Partially Paid" size="md" />
                  <span className="font-medium">Partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator status="Advance" size="md" />
                  <span className="font-medium">Advance</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 hover:text-white transition-all duration-200">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
                <Link href="/reminders">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Reminder
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
          
          <div className="lg:col-span-1 space-y-6">
            {/* Enhanced Filters */}
            <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-lg border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-100">Filters & Search</h3>
                  <Button size="icon" variant="ghost" onClick={() => setDarkMode(v => !v)} aria-label="Toggle dark mode">
                    {darkMode ? <Sun className="h-4 w-4 text-yellow-300" /> : <Moon className="h-4 w-4 text-gray-300" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Status Filter</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partiallypaid">Partial</SelectItem>
                      <SelectItem value="advance">Advance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Search Tenants</label>
                  <Input 
                    placeholder="Type tenant name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Details Panel */}
            <Card className="min-h-[400px] bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-lg border-0">
              <CardContent className="p-6">
                {!selectedDayEvents || (selectedDayEvents.statuses.length === 0 && selectedDayEvents.reminders.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center pt-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-800 to-pink-800 rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="h-10 w-10 text-purple-200" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-2">Select a day to view details</h3>
                    <p className="text-sm text-gray-400">Click on any calendar day to see tenant information and reminders.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-100 mb-1">
                        {selectedDay ? format(selectedDay, 'PPP') : "Select a day"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedDayEvents.statuses.length} tenant{selectedDayEvents.statuses.length !== 1 ? 's' : ''} 
                        {selectedDayEvents.reminders.length > 0 && ` • ${selectedDayEvents.reminders.length} reminder${selectedDayEvents.reminders.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    
                    {selectedDayEvents.statuses.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Rent Status
                        </h4>
                        <div className="space-y-3">
                          {selectedDayEvents.statuses.map(tenant => (
                            <div key={tenant.id} className="p-3 rounded-lg border bg-neutral-900/50 hover:shadow-md transition-all duration-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <Link href={`/tenants/${tenant.id}`} className="font-medium text-gray-100 hover:text-purple-300 transition-colors">
                                    {tenant.name}
                                  </Link>
                                  <p className="text-xs text-gray-400">{tenant.propertyAddress}</p>
                                </div>
                                {renderStatusBadge(tenant.rentStatus)}
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Balance:</span>
                                <span className={cn(
                                  "font-semibold",
                                  tenant.balance > 0 ? "text-red-400" : "text-emerald-400"
                                )}>
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
                        <h4 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Scheduled Reminders
                        </h4>
                        <div className="space-y-3">
                          {selectedDayEvents.reminders.map(reminder => {
                            const tenant = tenants.find(t => t.id === reminder.tenantId);
                            return (
                              <div key={reminder.id} className="p-3 rounded-lg border bg-neutral-900/50 hover:shadow-md transition-all duration-200">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-gray-100 capitalize">
                                      {reminder.reminderType.replace('Due', ' Due')}
                                    </p>
                                    <p className="text-xs text-gray-400">{tenant?.name || 'N/A'}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-gradient-to-r from-green-700 to-emerald-700 text-green-100 border-green-700">
                                    Scheduled
                                  </Badge>
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
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
            Rent Schedule
          </h2>
          <p className="text-gray-400 mt-1">Monitor rent payments and manage tenant reminders</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setDarkMode(v => !v)} aria-label="Toggle dark mode">
            {darkMode ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-gray-300" />}
          </Button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
