"use client"

import { useState, useEffect, useCallback } from "react"
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
  Loader2,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  MapPin,
  Bell,
  Zap,
  Eye,
  Star
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'
import type { DashboardData } from "@/lib/types"
import { LatePaymentsChart } from "@/components/charts/late-payments-chart"
import { PaymentMethodsChart } from "@/components/charts/payment-methods-chart"
import { Button } from "@/components/ui/button"

const safeToFixed = (value: number | undefined | null, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0';
  }
  return value.toFixed(decimals);
};

const safeCurrency = (value: number | undefined | null, currency = 'USD') => {
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(0);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
};

const safePercentage = (value: number | undefined | null) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0';
  }
  return (value * 100).toFixed(1);
};


function MetricCard({ title, value, change, icon: Icon, trend, color = "primary", className = "" }: { title: string, value: string, change: number, icon: React.ElementType, trend: string, color?: string, className?: string }) {
  const isPositive = change > 0
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
  
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{Math.abs(change)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">{trend}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function AiInsightsCard({ summary, anomalies }: { summary: string, anomalies: any[] }) {
  return (
    <Card className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/10 border-purple-500/20 group hover:shadow-2xl transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
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

function PropertyShowcase({ properties }: { properties: any[] }) {
  if (!properties || properties.length === 0) return <Card className="lg:col-span-2 flex items-center justify-center h-full"><p className="text-muted-foreground">No properties to display.</p></Card>;
  
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
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
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
                <div className="text-sm font-medium">{safeToFixed((property.units.filter(u => u.isOccupied).length / property.units.length) * 100)}%</div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-12 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                      style={{ width: `${(property.units.filter(u => u.isOccupied).length / property.units.length) * 100}%` }}
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
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("month")

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const fetchedData: DashboardData = await response.json();
      setData(fetchedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderContent = () => {
    if (loading) {
      return <DashboardSkeleton />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive">
          <WifiOff className="h-12 w-12 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Could Not Load Dashboard</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
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
            trend="vs last month"
            icon={Building2}
            color="purple"
          />
          <MetricCard
            title="Active Tenants"
            value={String(data.totalTenants)}
            change={5.1}
            trend="vs last month"
            icon={Users}
            color="pink"
          />
          <MetricCard
            title="Monthly Revenue"
            value={safeCurrency(data.totalRevenue, 'KES')}
            change={parseFloat(safePercentage(data.revenueChange))}
            trend="vs last month"
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="Occupancy Rate"
            value={`${safeToFixed(data.occupancyRate, 1)}%`}
            change={-2.3}
            trend="vs last month"
            icon={TrendingUp}
            color="blue"
          />
        </div>

        {/* AI Insights and Quick Stats */}
        <div className="grid gap-6 lg:grid-cols-3">
          <AiInsightsCard summary={data.aiSummary!} anomalies={data.anomalyAlerts} />
          
          <Card className="hover:shadow-lg transition-all duration-300 group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-200 group/item">
                  <span className="text-sm font-medium">Add New Property</span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transform translate-x-0 group-hover/item:translate-x-1 transition-all duration-200" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-200 group/item">
                  <span className="text-sm font-medium">Generate Reports</span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transform translate-x-0 group-hover/item:translate-x-1 transition-all duration-200" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-200 group/item">
                  <span className="text-sm font-medium">Review Maintenance</span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transform translate-x-0 group-hover/item:translate-x-1 transition-all duration-200" />
                </button>
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
          
          <Card className="hover:shadow-lg transition-all duration-300">
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
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your properties.
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
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse lg:col-span-1">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
