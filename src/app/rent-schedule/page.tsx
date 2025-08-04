
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
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function RentSchedulePage() {
  const { tenants, loading: tenantsLoading } = useTenants();
  const { properties, loading: propertiesLoading } = useProperties();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const rentDueDate = 1; // Assuming rent is due on the 1st

  const rentStatusByDay = useMemo(() => {
    if (tenantsLoading || propertiesLoading) return {};

    const statuses: Record<string, { paid: any[], overdue: any[] }> = {};
    const interval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };

    eachDayOfInterval(interval).forEach(day => {
      if (getDay(day) === rentDueDate) {
        const dayKey = day.toISOString().split('T')[0];
        statuses[dayKey] = { paid: [], overdue: [] };

        tenants.forEach(tenant => {
          const property = properties.find(p => p.id === tenant.propertyId);
          if (tenant.rentStatus === 'Paid') {
            statuses[dayKey].paid.push({ ...tenant, propertyAddress: property?.address });
          } else {
            statuses[dayKey].overdue.push({ ...tenant, propertyAddress: property?.address });
          }
        });
      }
    });

    return statuses;
  }, [tenants, properties, currentDate, tenantsLoading, propertiesLoading]);

  const modifiers = useMemo(() => {
    const paidDays: Date[] = [];
    const overdueDays: Date[] = [];
    const upcomingDays: Date[] = [];

    for (const dayStr in rentStatusByDay) {
        const day = new Date(dayStr);
        const status = rentStatusByDay[dayStr];
        if (status.overdue.length > 0) {
            overdueDays.push(day);
        } else if (status.paid.length > 0) {
            paidDays.push(day);
        } else {
            upcomingDays.push(day);
        }
    }
    
    return {
      paid: paidDays,
      overdue: overdueDays,
      upcoming: upcomingDays,
    };
  }, [rentStatusByDay]);

  const modifiersStyles = {
    paid: {
      backgroundColor: 'var(--chart-1)',
      color: 'white',
    },
    overdue: {
      backgroundColor: 'var(--destructive)',
      color: 'white',
    },
    upcoming: {
      borderColor: 'var(--chart-2)',
    },
    selected: {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
    }
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };
  
  const selectedDayStatus = selectedDay ? rentStatusByDay[selectedDay.toISOString().split('T')[0]] : null;

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
                Visualize monthly rent payment statuses for all tenants.
              </CardDescription>
            </div>
             <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Calendar
                month={currentDate}
                onMonthChange={setCurrentDate}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                onDayClick={handleDayClick}
                selected={selectedDay}
              />
              <div className="flex justify-center space-x-4 mt-4 text-sm">
                  <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={modifiersStyles.paid}></div> Paid</div>
                  <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={modifiersStyles.overdue}></div> Overdue</div>
                  <div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full border-2" style={modifiersStyles.upcoming}></div> Upcoming</div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {selectedDay ? `Status for ${selectedDay.toLocaleDateString()}` : "Select a day to see details"}
              </h3>
              {selectedDayStatus && (
                <div className="space-y-4">
                  {selectedDayStatus.overdue.length > 0 && (
                    <div>
                      <h4 className="font-medium text-destructive">Overdue</h4>
                      <ul className="space-y-2 mt-2">
                        {selectedDayStatus.overdue.map(tenant => (
                          <li key={tenant.id} className="flex justify-between items-center text-sm">
                            <Link href={`/tenants/${tenant.id}`} className="hover:underline">{tenant.name}</Link>
                            <Badge variant="destructive">Overdue</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                   {selectedDayStatus.paid.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600">Paid</h4>
                      <ul className="space-y-2 mt-2">
                        {selectedDayStatus.paid.map(tenant => (
                          <li key={tenant.id} className="flex justify-between items-center text-sm">
                             <Link href={`/tenants/${tenant.id}`} className="hover:underline">{tenant.name}</Link>
                            <Badge variant="default">Paid</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                   {(selectedDayStatus.paid.length === 0 && selectedDayStatus.overdue.length === 0) && (
                      <p className="text-muted-foreground text-sm">No payment information for this day.</p>
                   )}
                </div>
              )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
