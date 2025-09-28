"use client"

import { useCallback } from "react"
import dynamic from "next/dynamic"
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Eye,
  Star
} from "lucide-react"
import type { DashboardData, ActivityItem, Property, Unit } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetcher } from "@/lib/utils";
import React from "react";

const LatePaymentsChart = dynamic(
  () => import("@/components/charts/late-payments-chart").then((mod) => mod.LatePaymentsChart),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[240px]" />
  }
)

const PaymentMethodsChart = dynamic(
  () => import("@/components/charts/payment-methods-chart").then((mod) => mod.PaymentMethodsChart),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[240px]" />
  }
)

const safeToFixed = (value: number | undefined | null, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0';
  }
  return value.toFixed(decimals);
};

const safeCurrency = (value: number | undefined | null, currency = 'USD') => {
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const safePercentage = (value: number | undefined | null) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0';
  }
  return (value * 100).toFixed(1);
};


function MetricCard({ title, value, change, icon: Icon }: { title: string, value: string, change: number, icon: React.ElementType }) {
  const isPositive = change > 0
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
  
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {value}
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{Math.abs(change)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      </CardContent>
    </Card>
  )
}

function AiInsightsCard({ summary, anomalies }: { summary: string, anomalies: ActivityItem[] }) {
  return (
    <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border-primary/20 group hover:shadow-2xl transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-full bg-gradient-to-r from-primary to-accent text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI-Powered Insights
            </span>
            <div className="flex items-center mt-1">
              <div className="h-1 w-1 bg-green-500 rounded-full mr-2 animate-pulse" />
              <span className="text-xs text-muted-foreground">Live Analysis</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{summary || 'AI is analyzing your data...'}</p>
        {anomalies && anomalies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Active Alerts
            </h4>
            {anomalies.slice(0, 2).map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className={`h-2 w-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-orange-500'} animate-pulse`} />
                <div className="flex-1">
                  <p className="text-xs text-foreground/70">{alert.description}</p>
                  <p className="text-xs text-muted-foreground">{alert.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PropertyShowcase({ properties }: { properties: Property[] }) {
  if (!properties || properties.length === 0) return <Card className="lg:col-span-2 flex items-center justify-center h-full"><p className="text-muted-foreground">No properties to display.</p></Card>;
  
  const getOccupancy = (property: Property) => {
    if (!property.units || property.units.length === 0) return 0;
    const occupied = property.units.filter((u: Unit) => u.isOccupied).length;
    return (occupied / property.units.length) * 100;
  }

  return (
    <Card className="lg:col-span-2 overflow-hidden hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Property Portfolio
        </CardTitle>
        <CardDescription>Your top performing properties</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {properties.map((property) => (
            <div key={property.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200 group">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                  {property.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium group-hover:text-primary transition-colors">{property.name}</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.address} • {property.units?.length || 0} units
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{safeToFixed(getOccupancy(property))}%</div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-12 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                      style={{ width: `${getOccupancy(property)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>('/api/dashboard', fetcher);
  const [timeframe, setTimeframe] = React.useState("month")

  const fetchData = useCallback(() => {
    mutate();
  }, [mutate]);

  const renderContent = () => {
    if (isLoading) {
      return <DashboardSkeleton />
    }

    if (error) {
      const typedError = error as { info?: { error: string }, message: string };
      return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive">
          <WifiOff className="h-12 w-12 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Could Not Load Dashboard</h3>
          <p className="text-sm text-muted-foreground mb-4">{typedError.info?.error || typedError.message}</p>
          <Button onClick={fetchData} variant="outline">Retry</Button>
        </div>
      );
    }

    if (!data) {
        return <div className="text-center py-10">No data available.</div>
    }

    return (
      <div className="space-y-6">
        {/* Hero Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Properties"
            value={String(data.totalProperties)}
            change={8.2}
            icon={Building2}
          />
          <MetricCard
            title="Active Tenants"
            value={String(data.totalTenants)}
            change={5.1}
            icon={Users}
          />
          <MetricCard
            title="Monthly Revenue"
            value={safeCurrency(data.totalRevenue, data.properties?.[0]?.currency || 'KES')}
            change={parseFloat(safePercentage(data.revenueChange))}
            icon={DollarSign}
          />
          <MetricCard
            title="Occupancy Rate"
            value={`${safeToFixed(data.occupancyRate, 1)}%`}
            change={-2.3}
            icon={TrendingUp}
          />
        </div>

        {/* AI Insights and Quick Stats */}
        <div className="grid gap-6 lg:grid-cols-3">
          <AiInsightsCard summary={data.aiSummary!} anomalies={data.anomalyAlerts} />
          
           <Card className="hover:shadow-lg transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Rent Collection</span>
                  <span className="font-medium">97.2%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 w-[97.2%] transition-all duration-500" />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Maintenance Response</span>
                  <span className="font-medium">4.8/5</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 w-[96%] transition-all duration-500" />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tenant Satisfaction</span>
                  <span className="font-medium">4.6/5</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-purple-500 w-[92%] transition-all duration-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LatePaymentsChart data={data.latePaymentData} />
          <PaymentMethodsChart data={data.paymentMethodData} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <PropertyShowcase properties={data.properties} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s what&apos;s happening with your properties.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px] bg-card/50 backdrop-blur-sm">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <button className="p-2 rounded-lg bg-card/50 hover:bg-card border border-border/50 transition-all duration-200">
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
           <Card className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
      </div>
       <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
       </div>
    </div>
  )
}
