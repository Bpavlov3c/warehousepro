"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, DollarSign, Package, ShoppingCart, TrendingUp, TrendingDown, FileText, Store } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const salesData = [
  { month: "Jan", revenue: 45000, profit: 12000, orders: 156 },
  { month: "Feb", revenue: 52000, profit: 15600, orders: 189 },
  { month: "Mar", revenue: 48000, profit: 14400, orders: 167 },
  { month: "Apr", revenue: 61000, profit: 18300, orders: 203 },
  { month: "May", revenue: 55000, profit: 16500, orders: 178 },
  { month: "Jun", revenue: 67000, profit: 20100, orders: 234 },
]

const topProducts = [
  { name: "Wireless Headphones", sold: 234, profit: 5680, margin: "24.3%" },
  { name: "Smart Watch", sold: 189, profit: 4725, margin: "25.0%" },
  { name: "Phone Case", sold: 456, profit: 3648, margin: "8.0%" },
  { name: "Bluetooth Speaker", sold: 123, profit: 2460, margin: "20.0%" },
]

const handleImportPOs = () => {
  // Navigate to import page or open import dialog
  window.location.href = "/import"
}

const handleSyncOrders = () => {
  console.log("Syncing Shopify orders...")
  // Implement sync logic
}

const handleGenerateReport = () => {
  // Navigate to reports page
  window.location.href = "/reports"
}

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-blue-600 transition-colors">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-blue-600 transition-colors">$328,000</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5% from last month
              </span>
            </p>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Click to view detailed revenue breakdown
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-green-600 transition-colors">
              Gross Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-green-600 transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-green-600 transition-colors">$101,400</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.2% from last month
              </span>
            </p>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              30.9% profit margin - Click for profit analysis
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-purple-600 transition-colors">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-purple-600 transition-colors">1,327</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15.3% from last month
              </span>
            </p>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Average order value: $247 - Click to view orders
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-orange-600 transition-colors">
              Inventory Value
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground group-hover:text-orange-600 transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-orange-600 transition-colors">$89,500</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2.1% from last month
              </span>
            </p>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              245 items in stock - Click to manage inventory
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue & Profit Overview</CardTitle>
            <CardDescription>Monthly performance for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
                profit: {
                  label: "Profit",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                  <Bar dataKey="profit" fill="var(--color-profit)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-blue-500 mr-3" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">New PO imported</p>
                  <p className="text-xs text-muted-foreground">PO-2024-001 • 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <ShoppingCart className="h-4 w-4 text-green-500 mr-3" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Shopify orders synced</p>
                  <p className="text-xs text-muted-foreground">45 new orders • 3 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <Package className="h-4 w-4 text-orange-500 mr-3" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Low stock alert</p>
                  <p className="text-xs text-muted-foreground">5 products below threshold</p>
                </div>
              </div>
              <div className="flex items-center">
                <Store className="h-4 w-4 text-purple-500 mr-3" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">New store connected</p>
                  <p className="text-xs text-muted-foreground">Store-B • 1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Top Performing Products
            <Badge variant="secondary" className="ml-2">
              This Month
            </Badge>
          </CardTitle>
          <CardDescription>Products with highest profit margins this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium group-hover:text-green-600 transition-colors">
                    ${product.profit.toLocaleString()}
                  </p>
                  <Badge
                    variant="secondary"
                    className="group-hover:bg-green-100 group-hover:text-green-700 transition-colors"
                  >
                    {product.margin}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
          <CardHeader>
            <CardTitle className="text-base group-hover:text-blue-600 transition-colors">
              Import Purchase Orders
            </CardTitle>
            <CardDescription>Upload weekly PO data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full group-hover:bg-blue-600 transition-colors" onClick={handleImportPOs}>
              <FileText className="h-4 w-4 mr-2" />
              Import POs
            </Button>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Supports CSV, Excel formats
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
          <CardHeader>
            <CardTitle className="text-base group-hover:text-green-600 transition-colors">
              Sync Shopify Orders
            </CardTitle>
            <CardDescription>Get latest order data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-transparent group-hover:bg-green-600 group-hover:text-white transition-colors"
              variant="outline"
              onClick={handleSyncOrders}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sync Orders
            </Button>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Last sync: 2 hours ago
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer group">
          <CardHeader>
            <CardTitle className="text-base group-hover:text-purple-600 transition-colors">Generate Report</CardTitle>
            <CardDescription>Create profit analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-transparent group-hover:bg-purple-600 group-hover:text-white transition-colors"
              variant="outline"
              onClick={handleGenerateReport}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              New Report
            </Button>
            <div className="mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Multiple formats available
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
