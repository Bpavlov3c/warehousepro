"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

interface ImportResult {
  success: number
  errors: number
  total: number
  errorMessages: string[]
}

interface ValidationError {
  row: number
  field: string
  value: string
  message: string
}

export default function ImportPage() {
  const [importType, setImportType] = useState<"purchase-orders" | "inventory" | "shopify-orders">("purchase-orders")
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setResult(null)
      setValidationErrors([])
    } else {
      alert("Please select a valid CSV file")
    }
  }

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "") {
      throw new Error("Date is required")
    }

    // Try different date formats
    const formats = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}$/,
      // US format
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      // European format
      /^\d{1,2}\.\d{1,2}\.\d{4}$/,
      // UK format
      /^\d{1,2}-\d{1,2}-\d{4}$/,
    ]

    let parsedDate: Date | null = null

    // Try ISO format first
    if (formats[0].test(dateStr)) {
      parsedDate = new Date(dateStr + "T00:00:00.000Z")
    }
    // Try US format (MM/DD/YYYY)
    else if (formats[1].test(dateStr)) {
      const [month, day, year] = dateStr.split("/")
      parsedDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    }
    // Try European format (DD.MM.YYYY)
    else if (formats[2].test(dateStr)) {
      const [day, month, year] = dateStr.split(".")
      parsedDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    }
    // Try UK format (DD-MM-YYYY)
    else if (formats[3].test(dateStr)) {
      const [day, month, year] = dateStr.split("-")
      parsedDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    }

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      throw new Error(
        `Invalid date format: ${dateStr}. Expected formats: YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY, or DD-MM-YYYY`,
      )
    }

    // Return in ISO format for PostgreSQL
    return parsedDate.toISOString().split("T")[0]
  }

  const validateRow = (row: any, rowIndex: number, type: string): ValidationError[] => {
    const errors: ValidationError[] = []

    if (type === "purchase-orders") {
      // Required fields validation
      if (!row.po_number?.trim()) {
        errors.push({
          row: rowIndex,
          field: "po_number",
          value: row.po_number || "",
          message: "PO Number is required",
        })
      }

      if (!row.supplier?.trim()) {
        errors.push({
          row: rowIndex,
          field: "supplier",
          value: row.supplier || "",
          message: "Supplier is required",
        })
      }

      // Date validation
      try {
        if (row.po_date) {
          normalizeDate(row.po_date)
        }
      } catch (error) {
        errors.push({
          row: rowIndex,
          field: "po_date",
          value: row.po_date || "",
          message: (error as Error).message,
        })
      }

      // Numeric validation
      if (row.total_amount && Number.isNaN(Number.parseFloat(row.total_amount))) {
        errors.push({
          row: rowIndex,
          field: "total_amount",
          value: row.total_amount,
          message: "Total amount must be a valid number",
        })
      }

      if (row.delivery_cost && Number.isNaN(Number.parseFloat(row.delivery_cost))) {
        errors.push({
          row: rowIndex,
          field: "delivery_cost",
          value: row.delivery_cost,
          message: "Delivery cost must be a valid number",
        })
      }

      // Status validation
      const validStatuses = ["Pending", "Ordered", "Delivered", "Cancelled"]
      if (row.status && !validStatuses.includes(row.status)) {
        errors.push({
          row: rowIndex,
          field: "status",
          value: row.status,
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        })
      }
    } else if (type === "inventory") {
      // Required fields validation
      if (!row.sku?.trim()) {
        errors.push({
          row: rowIndex,
          field: "sku",
          value: row.sku || "",
          message: "SKU is required",
        })
      }

      if (!row.product_name?.trim()) {
        errors.push({
          row: rowIndex,
          field: "product_name",
          value: row.product_name || "",
          message: "Product name is required",
        })
      }

      // Numeric validation
      if (row.in_stock && Number.isNaN(Number.parseInt(row.in_stock))) {
        errors.push({
          row: rowIndex,
          field: "in_stock",
          value: row.in_stock,
          message: "In stock must be a valid integer",
        })
      }

      if (row.unit_cost && Number.isNaN(Number.parseFloat(row.unit_cost))) {
        errors.push({
          row: rowIndex,
          field: "unit_cost",
          value: row.unit_cost,
          message: "Unit cost must be a valid number",
        })
      }
    } else if (type === "shopify-orders") {
      // Required fields validation
      if (!row.order_number?.trim()) {
        errors.push({
          row: rowIndex,
          field: "order_number",
          value: row.order_number || "",
          message: "Order number is required",
        })
      }

      // Date validation
      try {
        if (row.order_date) {
          normalizeDate(row.order_date)
        }
      } catch (error) {
        errors.push({
          row: rowIndex,
          field: "order_date",
          value: row.order_date || "",
          message: (error as Error).message,
        })
      }

      // Numeric validation
      if (row.total_amount && Number.isNaN(Number.parseFloat(row.total_amount))) {
        errors.push({
          row: rowIndex,
          field: "total_amount",
          value: row.total_amount,
          message: "Total amount must be a valid number",
        })
      }
    }

    return errors
  }

  const handleImport = async () => {
    if (!file) {
      alert("Please select a file to import")
      return
    }

    setImporting(true)
    setProgress(0)
    setResult(null)
    setValidationErrors([])

    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1)

      console.log("Import headers:", headers)
      console.log("Total rows to process:", rows.length)

      let successCount = 0
      let errorCount = 0
      const errorMessages: string[] = []
      const allValidationErrors: ValidationError[] = []

      for (let i = 0; i < rows.length; i++) {
        const values = rows[i].split(",").map((v) => v.trim().replace(/"/g, ""))
        const rowData: any = {}

        headers.forEach((header, index) => {
          rowData[header] = values[index] || ""
        })

        // Validate row
        const rowErrors = validateRow(rowData, i + 2, importType) // +2 because of header and 0-based index
        if (rowErrors.length > 0) {
          allValidationErrors.push(...rowErrors)
          errorCount++
          errorMessages.push(`Row ${i + 2}: ${rowErrors.map((e) => e.message).join(", ")}`)
          continue
        }

        try {
          if (importType === "purchase-orders") {
            // Parse items if they exist
            let items: any[] = []
            if (rowData.items) {
              try {
                items = JSON.parse(rowData.items)
              } catch {
                // If items is not JSON, create a single item
                items = [
                  {
                    sku: rowData.sku || "",
                    product_name: rowData.product_name || "",
                    quantity: Number.parseInt(rowData.quantity) || 1,
                    unit_cost: Number.parseFloat(rowData.unit_cost) || 0,
                  },
                ]
              }
            }

            const poData = {
              po_number: rowData.po_number,
              supplier: rowData.supplier,
              po_date: rowData.po_date ? normalizeDate(rowData.po_date) : new Date().toISOString().split("T")[0],
              total_amount: Number.parseFloat(rowData.total_amount) || 0,
              delivery_cost: Number.parseFloat(rowData.delivery_cost) || 0,
              status: rowData.status || "Pending",
              notes: rowData.notes || "",
              items,
            }

            await supabaseStore.createPurchaseOrder(poData)
          } else if (importType === "inventory") {
            const inventoryData = {
              sku: rowData.sku,
              product_name: rowData.product_name,
              in_stock: Number.parseInt(rowData.in_stock) || 0,
              unit_cost: Number.parseFloat(rowData.unit_cost) || 0,
              location: rowData.location || "",
              category: rowData.category || "",
            }

            await supabaseStore.createInventoryItem(inventoryData)
          } else if (importType === "shopify-orders") {
            // Parse items if they exist
            let items: any[] = []
            if (rowData.items) {
              try {
                items = JSON.parse(rowData.items)
              } catch {
                // If items is not JSON, create a single item
                items = [
                  {
                    sku: rowData.sku || "",
                    product_name: rowData.product_name || "",
                    quantity: Number.parseInt(rowData.quantity) || 1,
                    total_price: Number.parseFloat(rowData.item_total) || 0,
                  },
                ]
              }
            }

            const orderData = {
              order_number: rowData.order_number,
              order_date: rowData.order_date
                ? normalizeDate(rowData.order_date)
                : new Date().toISOString().split("T")[0],
              customer_name: rowData.customer_name || "",
              customer_email: rowData.customer_email || "",
              total_amount: Number.parseFloat(rowData.total_amount) || 0,
              tax_amount: Number.parseFloat(rowData.tax_amount) || 0,
              shipping_cost: Number.parseFloat(rowData.shipping_cost) || 0,
              store_id: rowData.store_id || "default",
              store_name: rowData.store_name || "Default Store",
              items,
            }

            await supabaseStore.createShopifyOrder(orderData)
          }

          successCount++
        } catch (error) {
          console.error(`Error importing row ${i + 2}:`, error)
          errorCount++
          errorMessages.push(`Row ${i + 2}: ${(error as Error).message}`)
        }

        // Update progress
        setProgress(((i + 1) / rows.length) * 100)
      }

      setResult({
        success: successCount,
        errors: errorCount,
        total: rows.length,
        errorMessages: errorMessages.slice(0, 10), // Show first 10 errors
      })

      setValidationErrors(allValidationErrors.slice(0, 20)) // Show first 20 validation errors

      console.log("Import completed:", { successCount, errorCount, total: rows.length })
    } catch (error) {
      console.error("Import error:", error)
      alert(`Import failed: ${(error as Error).message}`)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    let csvContent = ""
    let filename = ""

    if (importType === "purchase-orders") {
      csvContent = `po_number,supplier,po_date,total_amount,delivery_cost,status,notes,sku,product_name,quantity,unit_cost
PO-001,Supplier ABC,2024-01-15,1500.00,50.00,Pending,Sample PO,T-565762,Sample T-Shirt,100,21.50
PO-002,Supplier XYZ,2024-01-16,2000.00,75.00,Delivered,Another PO,J-123456,Sample Jeans,50,35.00`
      filename = "purchase_orders_template.csv"
    } else if (importType === "inventory") {
      csvContent = `sku,product_name,in_stock,unit_cost,location,category
T-565762,Sample T-Shirt,150,21.50,Warehouse A,Clothing
J-123456,Sample Jeans,75,35.00,Warehouse B,Clothing
S-789012,Sample Shoes,25,45.00,Warehouse A,Footwear`
      filename = "inventory_template.csv"
    } else if (importType === "shopify-orders") {
      csvContent = `order_number,order_date,customer_name,customer_email,total_amount,tax_amount,shipping_cost,store_id,store_name,sku,product_name,quantity,item_total
1001,2024-01-15,John Doe,john@example.com,125.50,10.50,15.00,store1,Main Store,T-565762,Sample T-Shirt,2,100.00
1002,2024-01-16,Jane Smith,jane@example.com,185.75,15.75,20.00,store1,Main Store,J-123456,Sample Jeans,1,150.00`
      filename = "shopify_orders_template.csv"
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Data Import</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Import Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Import Configuration</CardTitle>
              <CardDescription>Select the type of data you want to import and upload your CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-type">Import Type</Label>
                <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase-orders">Purchase Orders</SelectItem>
                    <SelectItem value="inventory">Inventory Items</SelectItem>
                    <SelectItem value="shopify-orders">Shopify Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">CSV File</Label>
                <Input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={importing} />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                    <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={!file || importing} className="flex-1">
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Import Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Import Instructions</CardTitle>
              <CardDescription>Guidelines for preparing your CSV file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">File Format Requirements:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• File must be in CSV format (.csv)</li>
                    <li>• First row should contain column headers</li>
                    <li>• Use UTF-8 encoding for special characters</li>
                    <li>• Maximum file size: 10MB</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Date Format:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• YYYY-MM-DD (recommended)</li>
                    <li>• MM/DD/YYYY (US format)</li>
                    <li>• DD.MM.YYYY (European format)</li>
                    <li>• DD-MM-YYYY (UK format)</li>
                  </ul>
                </div>

                {importType === "purchase-orders" && (
                  <div>
                    <h4 className="font-medium mb-2">Purchase Orders:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Required: po_number, supplier</li>
                      <li>• Status: Pending, Ordered, Delivered, Cancelled</li>
                      <li>• Amounts in BGN (лв)</li>
                      <li>• Items can be JSON array or individual columns</li>
                    </ul>
                  </div>
                )}

                {importType === "inventory" && (
                  <div>
                    <h4 className="font-medium mb-2">Inventory Items:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Required: sku, product_name</li>
                      <li>• in_stock must be integer</li>
                      <li>• unit_cost in BGN (лв)</li>
                      <li>• Optional: location, category</li>
                    </ul>
                  </div>
                )}

                {importType === "shopify-orders" && (
                  <div>
                    <h4 className="font-medium mb-2">Shopify Orders:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Required: order_number</li>
                      <li>• Amounts in BGN (лв)</li>
                      <li>• Items can be JSON array or individual columns</li>
                      <li>• Optional: customer info, store details</li>
                    </ul>
                  </div>
                )}

                <Button variant="outline" onClick={downloadTemplate} className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>Summary of the import operation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{result.success}</p>
                    <p className="text-sm text-muted-foreground">Successful imports</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                    <p className="text-sm text-muted-foreground">Failed imports</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{result.total}</p>
                    <p className="text-sm text-muted-foreground">Total rows processed</p>
                  </div>
                </div>
              </div>

              {result.errors > 0 && result.errorMessages.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Import Errors ({result.errors} total):</p>
                      {result.errorMessages.map((error, index) => (
                        <p key={index} className="text-sm">
                          • {error}
                        </p>
                      ))}
                      {result.errorMessages.length < result.errors && (
                        <p className="text-sm text-muted-foreground">
                          ... and {result.errors - result.errorMessages.length} more errors
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Validation Errors</CardTitle>
              <CardDescription>Data validation issues found during import</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {validationErrors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Row {error.row}:</span>
                      <span className="text-muted-foreground ml-1">
                        {error.field} = "{error.value}" - {error.message}
                      </span>
                    </div>
                  </div>
                ))}
                {validationErrors.length >= 20 && (
                  <p className="text-sm text-muted-foreground">... and more validation errors</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
