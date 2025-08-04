
"use client";

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useTenants } from '@/hooks/use-tenants';
import { useProperties } from '@/hooks/use-properties';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Tenant, Property } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type TenantWithDetails = Tenant & { propertyAddress?: string; propertyCurrency?: string; balance: number };

export default function RentSchedulePage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const { properties, loading: propertiesLoading } = useProperties();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const rentDueDate = 1; // Assuming rent is due on the 1st of the month

  const formatCurrency = (amount: number, currencyCode: string = 'KES') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const rentStatusByDay = useMemo(() => {
    if (tenantsLoading || propertiesLoading) return {};

    const statuses: Record<string, TenantWithDetails[]> = {};
    const interval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };

    eachDayOfInterval(interval).forEach(day => {
        // We only care about the due date, which we assume is the 1st
        if (day.getDate() === rentDueDate) {
            const dayKey = format(day, 'yyyy-MM-dd');
            statuses[dayKey] = [];

            tenants.forEach(tenant => {
                const property = properties.find(p => p.id === tenant.propertyId);
                const rentAmount = property?.rent || 0;
                
                const paymentsThisMonth = tenant.paymentHistory
                    .filter(p => {
                        const paymentDate = new Date(p.date);
                        return paymentDate.getMonth() === currentDate.getMonth() && paymentDate.getFullYear() === currentDate.getFullYear() && p.type === 'Rent';
                    })
                    .reduce((acc, p) => acc + p.amount, 0);

                const balance = rentAmount - paymentsThisMonth;
                
                let status: Tenant['rentStatus'] = 'Overdue';
                if (balance <= 0) {
                    status = paymentsThisMonth > rentAmount ? 'Advance' : 'Paid';
                } else if (paymentsThisMonth > 0 && balance > 0) {
                    status = 'Partially Paid';
                }

                statuses[dayKey].push({ 
                    ...tenant, 
                    rentStatus: status, // Override status based on calculation
                    propertyAddress: property?.address,
                    propertyCurrency: property?.currency,
                    balance
                });
            });
        }
    });

    return statuses;
  }, [tenants, properties, currentDate, tenantsLoading, propertiesLoading, rentDueDate]);

  const modifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {
        paid: [],
        overdue: [],
        partiallyPaid: [],
        advance: [],
        due: [],
    };
    for (const dayStr in rentStatusByDay) {
        const day = new Date(`${dayStr}T00:00:00`); // Ensure correct date object without timezone issues
        const tenantsOnDay = rentStatusByDay[dayStr];
        
        const hasOverdue = tenantsOnDay.some(t => t.rentStatus === 'Overdue');
        const hasPartiallyPaid = tenantsOnDay.some(t => t.rentStatus === 'Partially Paid');
        const hasAdvance = tenantsOnDay.some(t => t.rentStatus === 'Advance');
        const allPaid = tenantsOnDay.every(t => t.rentStatus === 'Paid' || t.rentStatus === 'Advance');
        
        modifiers.due.push(day);

        if (hasOverdue) {
            modifiers.overdue.push(day);
        } else if (hasPartiallyPaid) {
             modifiers.partiallyPaid.push(day);
        } else if (hasAdvance) {
            modifiers.advance.push(day);
        } else if (allPaid && tenantsOnDay.length > 0) {
             modifiers.paid.push(day);
        }
    }
    
    return modifiers;
  }, [rentStatusByDay]);

  const modifiersStyles = {
    paid: { backgroundColor: 'var(--chart-1)', color: 'white' },
    overdue: { backgroundColor: 'var(--destructive)', color: 'white' },
    partiallyPaid: { backgroundColor: 'var(--chart-4)', color: 'white' },
    advance: { backgroundColor: 'var(--chart-2)', color: 'white' },
    due: { borderColor: 'var(--primary)' },
    selected: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };
  
  const selectedDayStatus = selectedDay ? rentStatusByDay[format(selectedDay, 'yyyy-MM-dd')] : null;

  const renderStatusPill = (status: Tenant['rentStatus']) => {
      const statusMap = {
        'Paid': 'default',
        'Overdue': 'destructive',
        'Partially Paid': 'secondary',
        'Advance': 'outline',
      } as const;
      return <Badge variant={statusMap[status]}>{status}</Badge>;
  }

  const renderContent = () => {
    if (tenantsLoading || propertiesLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[320px] w-full" />
        </div>
      );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Calendar
                month={currentDate}
                onMonthChange={setCurrentDate}
                modifiers={modifiers}
                modifiersClassNames={modifiersStyles}
                onDayClick={handleDayClick}
                selected={selectedDay}
                className="rounded-md border"
              />
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-sm">
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={modifiersStyles.paid}></div> Paid</div>
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={modifiersStyles.overdue}></div> Overdue</div>
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={modifiersStyles.partiallyPaid}></div> Partial</div>
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={modifiersStyles.advance}></div> Advance</div>
                  <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full border" style={modifiersStyles.due}></div> Due Date</div>
              </div>
            </div>
            <div className="border rounded-lg p-4 h-[350px] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">
                {selectedDay ? `Status for ${format(selectedDay, 'PPP')}` : "Select a day to see details"}
              </h3>
              {selectedDayStatus ? (
                <div className="space-y-4">
                  {selectedDayStatus.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedDayStatus.map(tenant => (
                          <li key={tenant.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                            <div>
                                <Link href={`/tenants/${tenant.id}`} className="font-medium hover:underline">{tenant.name}</Link>
                                <p className="text-xs text-muted-foreground">{tenant.propertyAddress}</p>
                            </div>
                            <div className="text-right">
                                {renderStatusPill(tenant.rentStatus)}
                                <p className="text-xs text-muted-foreground mt-1">
                                    Balance: {formatCurrency(tenant.balance, tenant.propertyCurrency)}
                                </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm pt-4 text-center">No rent due on this day.</p>
                  )}
                </div>
              ) : (
                 <p className="text-muted-foreground text-sm pt-4 text-center">
                    {selectedDay ? "No rent due on this day." : "Select a day from the calendar."}
                </p>
              )}
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Monthly Overview</CardTitle>
              <CardDescription>
                Visualize monthly rent payment statuses for all tenants. Rent is due on the 1st.
              </CardDescription>
            </div>
             <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
