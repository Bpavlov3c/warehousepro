"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, CheckCircle, AlertCircle, Download, Settings, Database } from "lucide-react"

export default function ImportData() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setUploadComplete(true)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleDownloadTemplate = () => {
    // Create CSV content with headers
    const csvContent = [
      ["Product ID / SKU", "Product Name", "Quantity Purchased", "Purchase Price", "PO Date", "Delivery Cost"],
      ["WH-001", "Wireless Headphones", "50", "75.00", "2024-01-15", "250.00"],
      ["SW-002", "Smart Watch", "25", "120.00", "2024-01-15", "250.00"],
      ["PC-003", "Phone Case", "100", "15.00", "2024-01-15", "250.00"],
    ]

    // Convert to CSV string
    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    // Create and download file
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "po_template.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleTestConnection = () => {
    console.log("Testing Shopify connection...")
    // Implement connection test
  }

  const handleSaveConfiguration = () => {
    console.log("Saving Shopify configuration...")
    // Implement save logic
  }

  const handleEnableAutoSync = () => {
    console.log("Enabling auto sync...")
  }

  const handleImportHistorical = () => {
    console.log("Importing historical orders...")
  }

  const handleConfigureWebhooks = () => {
    console.log("Configuring webhooks...")
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Import Data</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Tabs defaultValue="purchase-orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="shopify-config">Shopify Config</TabsTrigger>
            <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="purchase-orders" className="space-y-4">
            {/* PO Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Purchase Orders</CardTitle>
                <CardDescription>Import weekly purchase orders via CSV or Excel files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Drop your PO files here</h3>
                    <p className="text-muted-foreground">or click to browse</p>
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {uploadComplete && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Purchase order file uploaded successfully! Processing 45 items.</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Required CSV Format</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Product ID / SKU</p>
                      <p>• Product Name</p>
                      <p>• Quantity Purchased</p>
                      <p>• Purchase Price</p>
                      <p>• PO Date</p>
                      <p>• Delivery Cost</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Sample Template</h4>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Imports */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Imports</CardTitle>
                <CardDescription>History of uploaded purchase orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { file: "PO_Week_03_2024.csv", date: "2024-01-20", items: 45, status: "Success" },
                    { file: "PO_Week_02_2024.xlsx", date: "2024-01-13", items: 38, status: "Success" },
                    { file: "PO_Week_01_2024.csv", date: "2024-01-06", items: 52, status: "Error" },
                  ].map((import_, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{import_.file}</p>
                          <p className="text-sm text-muted-foreground">
                            {import_.date} • {import_.items} items
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {import_.status === "Success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="text-sm">{import_.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shopify-config" className="space-y-4">
            {/* Shopify Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Shopify Store Configuration</CardTitle>
                <CardDescription>Connect your Shopify stores for automatic order syncing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store-name">Store Name</Label>
                    <Input id="store-name" placeholder="My Store" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-url">Store URL</Label>
                    <Input id="store-url" placeholder="mystore.myshopify.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Access Token</Label>
                  <Input id="api-key" type="password" placeholder="shpat_..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                  <Input id="webhook-url" placeholder="https://yourapp.com/webhook" />
                </div>

                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    You'll need to create a private app in your Shopify admin to get the API access token. Required
                    permissions: read_orders, read_products, read_customers.
                  </AlertDescription>
                </Alert>

                <div className="flex space-x-2">
                  <Button onClick={handleTestConnection}>Test Connection</Button>
                  <Button variant="outline" onClick={handleSaveConfiguration}>
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sync Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
                <CardDescription>Configure automatic order synchronization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto Sync</h4>
                    <p className="text-sm text-muted-foreground">Automatically sync orders every hour</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleEnableAutoSync}>
                    Enable
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sync Historical Orders</h4>
                    <p className="text-sm text-muted-foreground">Import orders from the last 30 days</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleImportHistorical}>
                    Import
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Real-time Webhooks</h4>
                    <p className="text-sm text-muted-foreground">Receive instant order notifications</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleConfigureWebhooks}>
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-import" className="space-y-4">
            {/* Bulk Import */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Data Import</CardTitle>
                <CardDescription>Import large datasets and historical data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Historical POs</CardTitle>
                      <CardDescription>Import past purchase orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full bg-transparent">
                        <Database className="h-4 w-4 mr-2" />
                        Import Historical Data
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Product Catalog</CardTitle>
                      <CardDescription>Bulk import product information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full bg-transparent">
                        <Upload className="h-4 w-4 mr-2" />
                        Import Products
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Import Notes</Label>
                  <Textarea id="notes" placeholder="Add notes about this import batch..." rows={3} />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Large imports may take several minutes to process. You'll receive an email notification when
                    complete.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Import Queue */}
            <Card>
              <CardHeader>
                <CardTitle>Import Queue</CardTitle>
                <CardDescription>Monitor ongoing import processes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Historical_POs_2023.csv</p>
                      <p className="text-sm text-muted-foreground">Processing 1,247 records...</p>
                    </div>
                    <div className="text-right">
                      <Progress value={65} className="w-20 mb-1" />
                      <p className="text-xs text-muted-foreground">65%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Product_Catalog_Update.xlsx</p>
                      <p className="text-sm text-muted-foreground">Queued</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Waiting...</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
