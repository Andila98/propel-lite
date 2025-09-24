
"use client"

import { useState, useEffect } from "react"
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
  AlertOctagon,
  Sparkles,
  Loader2,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  Bell,
  Zap,
  Eye,
  Star
} from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts'

// Mock data for demonstration
const mockData = {
  totalProperties: 24,
  totalTenants: 156,
  totalRevenue: 125000,
  revenueChange: 0.12,
  occupancyRate: 94.2,
  properties: [
    { id: 1, name: "Sunset Apartments", location: "Downtown", units: 12, occupancy: 91.7 },
    { id: 2, name: "Oakwood Complex", location: "Suburbs", units: 8, occupancy: 100 },
    { id: 3, name: "Pine Street Lofts", location: "Arts District", units: 6, occupancy: 83.3 }
  ],
  aiSummary: "Revenue is up 12% this month with strong occupancy rates. Consider raising rent at Pine Street Lofts to match market rates.",
  anomalyAlerts: [
    { id: 1, type: "payment", message: "Unusual payment pattern detected in Building A", severity: "high", time: "2h ago" },
    { id: 2, type: "maintenance", message: "Higher than normal maintenance requests", severity: "medium", time: "5h ago" }
  ],
  latePaymentData: [
    { month: 'Jan', payments: 12, late: 2 },
    { month: 'Feb', payments: 15, late: 1 },
    { month: 'Mar', payments: 18, late: 3 },
    { month: 'Apr', payments: 20, late: 1 }
  ],
  paymentMethodData: [
    { method: 'Online', value: 65, color: '#8b5cf6' },
    { method: 'Bank Transfer', value: 25, color: '#ec4899' },
    { method: 'Cash', value: 10, color: '#f59e0b' }
  ]
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

// Safe formatters
const safeToFixed = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.' + '0'.repeat(decimals);
  }
  return value.toFixed(decimals);
};

const safeCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const safePercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0';
  }
  return (value * 100).toFixed(1);
};

function MetricCard({ title, value, change, icon: Icon, trend, color = "primary", className = "" }) {
  const isPositive = change > 0
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
  
  // NOTE: The user provided code uses dynamic class names like `from-${color}/5` which
  // will be purged by Tailwind's JIT compiler. This will be addressed in a later step.
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-full bg-primary/10 text-primary`}>
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

function AiInsightsCard({ summary, anomalies }) {
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
        <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{summary}</p>
        {anomalies && anomalies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              Active Alerts
            </h4>
            {anomalies.slice(0, 2).map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className={`h-2 w-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-orange-500'} animate-pulse`} />
                <div className="flex-1">
                  <p className="text-xs text-foreground/70">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PropertyShowcase({ properties }) {
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
          {properties.map((property, index) => (
            <div key={property.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200 group">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                  {property.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium group-hover:text-primary transition-colors">{property.name}</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.location} • {property.units} units
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{property.occupancy}%</div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-12 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                      style={{ width: `${'\'\'\'${property.occupancy}%\'\'\''}` }}
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

function ChartCard({ title, children, className = "" }) {
  return (
    <Card className={`hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(mockData)
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState("month")

  const renderContent = () => {
    if (loading) {
      return <DashboardSkeleton />
    }

    return (
      <div className="space-y-6">
        {/* Hero Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Properties"
            value={data.totalProperties}
            change={8.2}
            trend="vs last month"
            icon={Building2}
            color="purple"
          />
          <MetricCard
            title="Active Tenants"
            value={data.totalTenants}
            change={5.1}
            trend="vs last month"
            icon={Users}
            color="pink"
          />
          <MetricCard
            title="Monthly Revenue"
            value={safeCurrency(data.totalRevenue)}
            change={parseFloat(safePercentage(data.revenueChange))}
            trend="vs last month"
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="Occupancy Rate"
            value={`${'\'\'\'${safeToFixed(data.occupancyRate, 1)}%\'\'\''}`}
            change={2.3}
            trend="vs last month"
            icon={TrendingUp}
            color="blue"
          />
        </div>

        {/* AI Insights and Quick Stats */}
        <div className="grid gap-6 lg:grid-cols-3">
          <AiInsightsCard summary={data.aiSummary} anomalies={data.anomalyAlerts} />
          
          {/* Quick Actions */}
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

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Payment Trends">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.latePaymentData}>
                  <defs>
                    <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="payments" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPayments)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Payment Methods">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data.paymentMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ method, value }) => `${'\'\'\'${method}: ${value}%\'\'\''}`}
                  >
                    {data.paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }} 
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Property Showcase */}
        <div className="grid gap-6 lg:grid-cols-3">
          <PropertyShowcase properties={data.properties} />
          
          {/* Performance Metrics */}
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
          <Card key={i} className="animate-pulse">
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

    