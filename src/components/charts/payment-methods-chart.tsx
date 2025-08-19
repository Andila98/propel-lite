
"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { DashboardData } from "@/lib/types"

const chartConfig = {
  mpesa: {
    label: "M-Pesa",
    color: "hsl(var(--chart-1))",
  },
  stripe: {
    label: "Stripe",
    color: "hsl(var(--chart-2))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

interface PaymentMethodsChartProps {
  data: DashboardData['paymentMethodData']
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  if (!data || data.length === 0) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Method Preferences</CardTitle>
                <CardDescription>Breakdown of how tenants prefer to pay.</CardDescription>
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
        <CardTitle>Payment Method Preferences</CardTitle>
        <CardDescription>Breakdown of how tenants prefer to pay.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <PieChart>
            <ChartTooltipContent nameKey="name" />
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                 {data.map(entry => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
