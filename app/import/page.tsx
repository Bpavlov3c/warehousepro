"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, Package, ShoppingCart, CheckCircle, AlertCircle, Download, Info } from "lucide-react"

export default function Import() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  const handleFileUpload = async (file: File, type: string) => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      // Simulate file upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 3000))

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Simulate success/failure
      const success = Math.random() > 0.2 // 80% success rate for demo

      setUploadResult({
        success,
        message: success
          ? `Successfully imported ${type} data from ${file.name}`
          : `Failed to import ${type} data from ${file.name}`,
        details: success
          ? `Processed ${Math.floor(Math.random() * 100) + 10} records successfully`
          : "Please check the file format and try again",
      })
    } catch (error) {
      setUploadResult({
        success: false,
        message: "An error occurred during upload",
        details: "Please try again later",
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setUploadResult(null)
      }, 5000)
    }
  }

  const downloadTemplate = (type: string) => {
    let headers: string[] = []
    let sampleData: string[][] = []

    switch (type) {
      case "inventory":
        headers = ["SKU", "Product Name", "Quantity", "Unit Cost", "Supplier", "Notes"]
        sampleData = [
          ["ABC123", "Sample Product 1", "100", "10.50", "Supplier A", "Sample notes"],
          ["DEF456", "Sample Product 2", "50", "25.00", "Supplier B", ""],
          ["GHI789", "Sample Product 3", "200", "5.75", "Supplier A", "Bulk item"],
        ]
        break
      case "purchase-orders":
        headers = [
          "PO Number",
          "Supplier",
          "Date",
          "SKU",
          "Product Name",
          "Quantity",
          "Unit Cost",
          "Delivery Cost",
          "Notes",
        ]
        sampleData = [
          ["PO-001", "Supplier A", "2024-01-15", "ABC123", "Sample Product 1", "50", "10.50", "25.00", "Rush order"],
          ["PO-001", "Supplier A", "2024-01-15", "GHI789", "Sample Product 3", "100", "5.75", "", ""],
          ["PO-002", "Supplier B", "2024-01-20", "DEF456", "Sample Product 2", "25", "25.00", "15.00", ""],
        ]
        break
      case "orders":
        headers = [
          "Order Number",
          "Customer Name",
          "Customer Email",
          "Date",
          "SKU",
          "Product Name",
          "Quantity",
          "Unit Price",
          "Total",
          "Status",
        ]
        sampleData = [
          [
            "ORD-001",
            "John Doe",
            "john@example.com",
            "2024-01-10",
            "ABC123",
            "Sample Product 1",
            "2",
            "15.00",
            "30.00",
            "fulfilled",
          ],
          [
            "ORD-001",
            "John Doe",
            "john@example.com",
            "2024-01-10",
            "DEF456",
            "Sample Product 2",
            "1",
            "35.00",
            "35.00",
            "fulfilled",
          ],
          [
            "ORD-002",
            "Jane Smith",
            "jane@example.com",
            "2024-01-12",
            "GHI789",
            "Sample Product 3",
            "5",
            "8.00",
            "40.00",
            "pending",
          ],
        ]
        break
    }

    const csvContent = [headers, ...sampleData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${type}_template.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Upload className="h-5 w-5" />
          <span className="hidden sm:inline">Import Data</span>
          <span className="sm:hidden">Import</span>
        </h1>
      </header>

      <div className="flex-1 space-y-6 p-4 pt-6">
        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Import your data using CSV files. Download the templates below to ensure proper formatting. All imports will
            validate data before processing.
          </AlertDescription>
        </Alert>

        {/* Upload Progress */}
        {isUploading && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uploading and processing...</span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            {uploadResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              <div className="space-y-1">
                <p>{uploadResult.message}</p>
                {uploadResult.details && <p className="text-sm text-muted-foreground">{uploadResult.details}</p>}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Sections */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Inventory Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-5 w-5" />
                Inventory
              </CardTitle>
              <CardDescription>Import inventory items with quantities and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inventory-file">CSV File</Label>
                <Input
                  id="inventory-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, "inventory")
                  }}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label>Required Columns</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• SKU (required)</p>
                  <p>• Product Name (required)</p>
                  <p>• Quantity (required)</p>
                  <p>• Unit Cost (required)</p>
                  <p>• Supplier (optional)</p>
                  <p>• Notes (optional)</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate("inventory")}
                className="w-full bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Purchase Orders Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-5 w-5" />
                Purchase Orders
              </CardTitle>
              <CardDescription>Import purchase orders with line items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="po-file">CSV File</Label>
                <Input
                  id="po-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, "purchase-orders")
                  }}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label>Required Columns</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• PO Number (required)</p>
                  <p>• Supplier (required)</p>
                  <p>• Date (required)</p>
                  <p>• SKU (required)</p>
                  <p>• Product Name (required)</p>
                  <p>• Quantity (required)</p>
                  <p>• Unit Cost (required)</p>
                  <p>• Delivery Cost (optional)</p>
                  <p>• Notes (optional)</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate("purchase-orders")}
                className="w-full bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Orders Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ShoppingCart className="h-5 w-5" />
                Orders
              </CardTitle>
              <CardDescription>Import customer orders and line items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orders-file">CSV File</Label>
                <Input
                  id="orders-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, "orders")
                  }}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label>Required Columns</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Order Number (required)</p>
                  <p>• Customer Name (required)</p>
                  <p>• Customer Email (required)</p>
                  <p>• Date (required)</p>
                  <p>• SKU (required)</p>
                  <p>• Product Name (required)</p>
                  <p>• Quantity (required)</p>
                  <p>• Unit Price (required)</p>
                  <p>• Total (required)</p>
                  <p>• Status (optional)</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate("orders")}
                className="w-full bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Bulk Operations</CardTitle>
            <CardDescription>Advanced import options and data management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Import Mode</Label>
                <select className="w-full p-2 border rounded-md text-sm">
                  <option value="append">Append to existing data</option>
                  <option value="update">Update existing records</option>
                  <option value="replace">Replace all data (dangerous)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Validation Level</Label>
                <select className="w-full p-2 border rounded-md text-sm">
                  <option value="strict">Strict (reject on any error)</option>
                  <option value="lenient">Lenient (skip invalid rows)</option>
                  <option value="preview">Preview only (no import)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-notes">Import Notes</Label>
              <Textarea id="import-notes" placeholder="Add notes about this import batch..." rows={3} />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1 bg-transparent">
                <FileText className="h-4 w-4 mr-2" />
                Validate Files
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                <Upload className="h-4 w-4 mr-2" />
                Preview Import
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Imports</CardTitle>
            <CardDescription>History of recent data imports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  type: "Inventory",
                  file: "inventory_2024_01_15.csv",
                  date: "2024-01-15 14:30",
                  status: "Success",
                  records: 150,
                },
                {
                  type: "Purchase Orders",
                  file: "purchase_orders_jan.csv",
                  date: "2024-01-14 09:15",
                  status: "Success",
                  records: 25,
                },
                {
                  type: "Orders",
                  file: "shopify_orders_export.csv",
                  date: "2024-01-13 16:45",
                  status: "Failed",
                  records: 0,
                },
              ].map((import_, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{import_.type}</p>
                    <p className="text-xs text-muted-foreground">{import_.file}</p>
                    <p className="text-xs text-muted-foreground">{import_.date}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      {import_.status === "Success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{import_.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{import_.records} records</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
