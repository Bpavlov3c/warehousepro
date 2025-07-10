"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle, Package, ShoppingCart } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

interface ImportResult {
  success: boolean
  message: string
  count?: number
  errors?: string[]
}

interface ImportProgress {
  current: number
  total: number
  status: string
}

// Helper function to normalize date formats
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0]

  // Try different date formats
  const formats = [
    // ISO format (already correct)
    /^\d{4}-\d{2}-\d{2}$/,
    // US format MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // European format DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ]

  // If already in ISO format, return as-is
  if (formats[0].test(dateStr)) {
    return dateStr
  }

  // Try to parse other formats
  let date: Date | null = null

  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, first, second, year] = slashMatch
    // Assume MM/DD/YYYY if first number > 12, otherwise try both
    if (Number.parseInt(first) > 12) {
      // Must be DD/MM/YYYY
      date = new Date(Number.parseInt(year), Number.parseInt(second) - 1, Number.parseInt(first))
    } else if (Number.parseInt(second) > 12) {
      // Must be MM/DD/YYYY
      date = new Date(Number.parseInt(year), Number.parseInt(first) - 1, Number.parseInt(second))
    } else {
      // Ambiguous - assume MM/DD/YYYY (US format)
      date = new Date(Number.parseInt(year), Number.parseInt(first) - 1, Number.parseInt(second))
    }
  }

  // Try DD-MM-YYYY
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch && !date) {
    const [, day, month, year] = dashMatch
    date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  }

  // If we couldn't parse it, try the built-in Date parser
  if (!date) {
    date = new Date(dateStr)
  }

  // Validate the date
  if (!date || isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Please use YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY format.`)
  }

  // Return in ISO format
  return date.toISOString().split("T")[0]
}

export default function ImportPage() {
  const [importType, setImportType] = useState<"inventory" | "purchase-orders" | "shopify-orders">("inventory")
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress>({ current: 0, total: 0, status: "" })
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setResult(null)
    } else {
      alert("Please select a valid CSV file")
    }
  }

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
      if (values.length === headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })
        rows.push(row)
      }
    }

    return rows
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress({ current: 0, total: 0, status: "Reading file..." })
    setResult(null)

    try {
      const csvText = await file.text()
      const rows = parseCSV(csvText)

      if (rows.length === 0) {
        throw new Error("No valid data found in CSV file")
      }

      setProgress({ current: 0, total: rows.length, status: "Processing data..." })

      let importResult: ImportResult

      switch (importType) {
        case "inventory":
          importResult = await importInventory(rows)
          break
        case "purchase-orders":
          importResult = await importPurchaseOrders(rows)
          break
        case "shopify-orders":
          importResult = await importShopifyOrders(rows)
          break
        default:
          throw new Error("Invalid import type")
      }

      setResult(importResult)
    } catch (error) {
      console.error("Import error:", error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      })
    } finally {
      setImporting(false)
      setProgress({ current: 0, total: 0, status: "" })
    }
  }

  const importInventory = async (rows: any[]): Promise<ImportResult> => {
    const errors: string[] = []
    let successCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress({
        current: i + 1,
        total: rows.length,
        status: `Processing inventory item ${i + 1}/${rows.length}...`,
      })

      try {
        // Validate required fields
        if (!row.sku || !row.product_name || !row.quantity || !row.unit_cost) {
          errors.push(`Row ${i + 1}: Missing required fields (sku, product_name, quantity, unit_cost)`)
          continue
        }

        await supabaseStore.addManualInventory({
          sku: row.sku,
          name: row.product_name,
          quantity: Number.parseInt(row.quantity) || 0,
          unitCost: Number.parseFloat(row.unit_cost) || 0,
        })

        successCount++
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return {
      success: errors.length === 0,
      message: `Imported ${successCount} inventory items${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  const importPurchaseOrders = async (rows: any[]): Promise<ImportResult> => {
    const errors: string[] = []
    let successCount = 0

    // Group rows by PO number to handle multi-line POs
    const poGroups = new Map<string, any[]>()

    rows.forEach((row, index) => {
      if (!row.po_number) {
        errors.push(`Row ${index + 1}: Missing po_number`)
        return
      }

      if (!poGroups.has(row.po_number)) {
        poGroups.set(row.po_number, [])
      }
      poGroups.get(row.po_number)!.push({ ...row, rowIndex: index + 1 })
    })

    let currentPO = 0
    const totalPOs = poGroups.size

    for (const [poNumber, poRows] of poGroups) {
      currentPO++
      setProgress({
        current: currentPO,
        total: totalPOs,
        status: `Processing PO ${poNumber} (${currentPO}/${totalPOs})...`,
      })

      try {
        // Use first row for PO header data
        const headerRow = poRows[0]

        // Validate required header fields
        if (!headerRow.supplier_name && !headerRow.supplier) {
          errors.push(`PO ${poNumber}: Missing supplier_name/supplier`)
          continue
        }

        // Collect all items for this PO
        const items = []
        let hasItemErrors = false

        for (const row of poRows) {
          // Validate required item fields
          if (!row.sku || !row.product_name || !row.quantity || !row.unit_cost) {
            errors.push(
              `PO ${poNumber}, Row ${row.rowIndex}: Missing required item fields (sku, product_name, quantity, unit_cost)`,
            )
            hasItemErrors = true
            continue
          }

          items.push({
            sku: row.sku,
            product_name: row.product_name,
            quantity: Number.parseInt(row.quantity) || 0,
            unit_cost: Number.parseFloat(row.unit_cost) || 0,
          })
        }

        // Skip this PO if there were item errors
        if (hasItemErrors || items.length === 0) {
          continue
        }

        // Create the PO with all items
        await supabaseStore.createPurchaseOrder({
          supplier_name: headerRow.supplier_name || headerRow.supplier,
          po_date: normalizeDate(headerRow.po_date || headerRow.date),
          status: (headerRow.status as any) || "Pending",
          delivery_cost: Number.parseFloat(headerRow.delivery_cost || headerRow.shipping_cost || "0"),
          notes: headerRow.notes || "",
          items,
        })

        successCount++
      } catch (error) {
        errors.push(`PO ${poNumber}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return {
      success: errors.length === 0,
      message: `Imported ${successCount} purchase orders${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  const importShopifyOrders = async (rows: any[]): Promise<ImportResult> => {
    const errors: string[] = []
    let successCount = 0

    // Group rows by order number to handle multi-line orders
    const orderGroups = new Map<string, any[]>()

    rows.forEach((row, index) => {
      if (!row.order_number) {
        errors.push(`Row ${index + 1}: Missing order_number`)
        return
      }

      if (!orderGroups.has(row.order_number)) {
        orderGroups.set(row.order_number, [])
      }
      orderGroups.get(row.order_number)!.push({ ...row, rowIndex: index + 1 })
    })

    // Convert grouped orders to the format expected by addShopifyOrders
    const ordersToImport = []

    for (const [orderNumber, orderRows] of orderGroups) {
      try {
        // Use first row for order header data
        const headerRow = orderRows[0]

        // Validate required header fields
        if (!headerRow.customer_name || !headerRow.order_date || !headerRow.total_amount) {
          errors.push(`Order ${orderNumber}: Missing required fields (customer_name, order_date, total_amount)`)
          continue
        }

        // Collect all items for this order
        const items = []
        let hasItemErrors = false

        for (const row of orderRows) {
          // Validate required item fields
          if (!row.sku || !row.product_name || !row.quantity || !row.unit_price) {
            errors.push(
              `Order ${orderNumber}, Row ${row.rowIndex}: Missing required item fields (sku, product_name, quantity, unit_price)`,
            )
            hasItemErrors = true
            continue
          }

          items.push({
            sku: row.sku,
            product_name: row.product_name,
            quantity: Number.parseInt(row.quantity) || 0,
            unit_price: Number.parseFloat(row.unit_price) || 0,
            total_price:
              Number.parseFloat(row.total_price) || Number.parseFloat(row.unit_price) * Number.parseInt(row.quantity),
          })
        }

        // Skip this order if there were item errors
        if (hasItemErrors || items.length === 0) {
          continue
        }

        // Create order object
        ordersToImport.push({
          store_id: headerRow.store_id || "imported",
          shopify_order_id: `imported-${orderNumber}`,
          order_number: orderNumber,
          customer_name: headerRow.customer_name,
          customer_email: headerRow.customer_email || "",
          order_date: normalizeDate(headerRow.order_date),
          status: headerRow.status || "fulfilled",
          total_amount: Number.parseFloat(headerRow.total_amount) || 0,
          shipping_cost: Number.parseFloat(headerRow.shipping_cost || "0"),
          tax_amount: Number.parseFloat(headerRow.tax_amount || "0"),
          shipping_address: headerRow.shipping_address || "",
          items,
        })
      } catch (error) {
        errors.push(`Order ${orderNumber}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    // Import all orders at once
    if (ordersToImport.length > 0) {
      try {
        setProgress({
          current: 0,
          total: ordersToImport.length,
          status: "Saving orders to database...",
        })

        await supabaseStore.addShopifyOrders(ordersToImport)
        successCount = ordersToImport.length
      } catch (error) {
        errors.push(`Database error: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return {
      success: errors.length === 0,
      message: `Imported ${successCount} Shopify orders${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  const downloadTemplate = () => {
    let csvContent = ""
    let filename = ""

    switch (importType) {
      case "inventory":
        csvContent = `sku,product_name,quantity,unit_cost
T-565762,Sample T-Shirt,100,21.50
J-123456,Sample Jeans,50,35.00
S-789012,Sample Shoes,25,45.00`
        filename = "inventory_template.csv"
        break

      case "purchase-orders":
        csvContent = `po_number,supplier_name,po_date,delivery_cost,status,notes,sku,product_name,quantity,unit_cost
PO-001,Supplier ABC,2024-01-15,50.00,Pending,Sample PO,T-565762,Sample T-Shirt,100,21.50
PO-001,Supplier ABC,2024-01-15,50.00,Pending,Sample PO,J-123456,Sample Jeans,50,35.00
PO-002,Supplier XYZ,2024-01-16,75.00,Delivered,Another PO,S-789012,Sample Shoes,25,45.00`
        filename = "purchase_orders_template.csv"
        break

      case "shopify-orders":
        csvContent = `order_number,order_date,customer_name,customer_email,total_amount,tax_amount,shipping_cost,store_id,store_name,sku,product_name,quantity,unit_price,total_price
1001,2024-01-15,John Doe,john@example.com,128.50,8.50,10.00,store1,Main Store,T-565762,Sample T-Shirt,1,110.00,110.00
1002,2024-01-16,Jane Smith,jane@example.com,185.75,15.75,20.00,store1,Main Store,J-123456,Sample Jeans,1,150.00,150.00
1002,2024-01-16,Jane Smith,jane@example.com,185.75,15.75,20.00,store1,Main Store,S-789012,Sample Shoes,1,35.00,35.00`
        filename = "shopify_orders_template.csv"
        break
    }

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getImportIcon = () => {
    switch (importType) {
      case "inventory":
        return <Package className="h-5 w-5" />
      case "purchase-orders":
        return <FileText className="h-5 w-5" />
      case "shopify-orders":
        return <ShoppingCart className="h-5 w-5" />
      default:
        return <Upload className="h-5 w-5" />
    }
  }

  const getImportDescription = () => {
    switch (importType) {
      case "inventory":
        return "Import inventory items with SKU, product name, quantity, and unit cost"
      case "purchase-orders":
        return "Import purchase orders with supplier info and line items. Multiple rows with same PO number will be grouped into one PO with multiple items."
      case "shopify-orders":
        return "Import Shopify orders with customer info and line items. Multiple rows with same order number will be grouped into one order with multiple items."
      default:
        return "Select an import type to get started"
    }
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          {getImportIcon()}
          <h1 className="text-lg font-semibold">Data Import</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Import Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Import Type</CardTitle>
            <CardDescription>Choose what type of data you want to import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card
                className={`cursor-pointer transition-colors ${
                  importType === "inventory" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setImportType("inventory")}
              >
                <CardContent className="flex items-center space-x-3 p-4">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Inventory Items</h3>
                    <p className="text-sm text-muted-foreground">Import stock items</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  importType === "purchase-orders" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setImportType("purchase-orders")}
              >
                <CardContent className="flex items-center space-x-3 p-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Purchase Orders</h3>
                    <p className="text-sm text-muted-foreground">Import POs with items</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  importType === "shopify-orders" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setImportType("shopify-orders")}
              >
                <CardContent className="flex items-center space-x-3 p-4">
                  <ShoppingCart className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Shopify Orders</h3>
                    <p className="text-sm text-muted-foreground">Import order data</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{getImportDescription()}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Select a CSV file to import your {importType.replace("-", " ")} data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importing}
                  className="w-full max-w-md"
                />
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Import Progress */}
        {importing && (
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
              <CardDescription>Processing your data...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.status}</span>
                  <span>
                    {progress.current}/{progress.total}
                  </span>
                </div>
                <Progress
                  value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Import {result.success ? "Completed" : "Failed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <Label>Errors:</Label>
                  <Textarea
                    value={result.errors.join("\n")}
                    readOnly
                    className="h-32 text-sm font-mono"
                    placeholder="No errors"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            size="lg"
            className="flex items-center gap-2 px-8"
          >
            <Upload className="h-5 w-5" />
            {importing ? "Importing..." : `Import ${importType.replace("-", " ")}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
