
"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
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
  UserCheck,
  Banknote,
  Home,
  AlertTriangle,
  Loader2,
  WifiOff,
  Sparkles,
  BarChart,
  TrendingDown,
} from "lucide-react"
import { PropertiesCarousel } from "@/components/properties-carousel"
import { RecentActivities } from "@/components/recent-activities"
import { PropertyManagerList } from "@/components/property-manager-list"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useManagers } from "@/hooks/use-managers"
import { Separator } from "@/components/ui/separator"
import type { DashboardData } from "@/lib/types"
import { LatePaymentsChart } from "@/components/charts/late-payments-chart"
import { PaymentMethodsChart } from "@/components/charts/payment-methods-chart"
import { formatCurrency } from "@/lib/utils"


function AiInsightsCard({ summary }: { summary: string }) {
    return (
        <Card className="lg:col-span-4 bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary"/>
                    AI-Powered Insights
                </CardTitle>
                <CardDescription>{summary}</CardDescription>
            </CardHeader>
        </Card>
    )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState("month")
  const { user } = useAuth()
  const { managers } = useManagers()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/dashboard?timeframe=${timeframe}`)
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch dashboard data.")
        }
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [timeframe])

  const renderContent = () => {
    if (loading) {
      return <DashboardSkeleton />
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-destructive p-4">
          <WifiOff className="h-12 w-12 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Failed to Load Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )
    }
    if (!data) {
      return <p>No data available.</p>
    }

    const revenueChangePercentage = (data.revenueChange * 100).toFixed(1);
    const isRevenueIncrease = data.revenueChange >= 0;

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.aiSummary && <AiInsightsCard summary={data.aiSummary} />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalProperties")}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.totalPropertiesDesc")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalTenants")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.totalTenantsDesc")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalRevenue")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalRevenue)}
            </div>
            <p className={`text-xs ${isRevenueIncrease ? 'text-green-500' : 'text-red-500'}`}>
              {isRevenueIncrease ? '+' : ''}{revenueChangePercentage}% from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.occupancyRate")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.occupancyRate).toFixed(1)}%
            </div>
            <Progress
              value={data.occupancyRate}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
            <LatePaymentsChart data={data.latePaymentData} />
        </div>
        <div className="lg:col-span-2">
            <PaymentMethodsChart data={data.paymentMethodData} />
        </div>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.propertiesShowcase")}</CardTitle>
            <CardDescription>
              {t("dashboard.propertiesShowcaseDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PropertiesCarousel properties={data.properties} />
          </CardContent>
        </Card>

        
        {user?.role === "landlord" && (
          <>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("dashboard.anomalyAlerts")}</CardTitle>
                <CardDescription>
                  {t("dashboard.anomalyAlertsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivities activities={data.anomalyAlerts} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("dashboard.propertyManagers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <PropertyManagerList managers={managers} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col items-start justify-between space-y-2 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h2>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("dashboard.week")}</SelectItem>
              <SelectItem value="month">{t("dashboard.month")}</SelectItem>
              <SelectItem value="quarter">{t("dashboard.quarter")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {renderContent()}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="lg:col-span-4">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-full mt-1" />
          </CardContent>
        </Card>
      ))}
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
