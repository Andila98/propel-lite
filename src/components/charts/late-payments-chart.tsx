
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import type { DashboardData } from "@/lib/types"

interface LatePaymentsChartProps {
  data: DashboardData['latePaymentData']
}

export function LatePaymentsChart({ data }: LatePaymentsChartProps) {
  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Late Payment Trends</CardTitle>
                <CardDescription>Number of late rent payments over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    No payment data available.
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Late Payment Trends</CardTitle>
        <CardDescription>
          Number of late rent payments over the last 6 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-48 w-full">
          <BarChart accessibilityLayer data={data}>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltipContent />
            <Bar dataKey="latePayments" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
