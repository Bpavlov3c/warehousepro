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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, FileText, AlertCircle, CheckCircle, Package, ShoppingCart, Info } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

interface ImportResult {
  success: boolean
  message: string
  details?: string
  processed?: number
  errors?: string[]
}

interface ValidationError {
  row: number
  field: string
  message: string
  value: string
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("purchase-orders")
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResults(null)
      setValidationErrors([])
      setPreviewData([])
      previewFile(selectedFile)
    }
  }

  const previewFile = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        setValidationErrors([
          { row: 0, field: "file", message: "File must contain at least a header and one data row", value: "" },
        ])
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const preview = lines.slice(1, 6).map((line, index) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
        const row: any = { _rowNumber: index + 2 }
        headers.forEach((header, i) => {
          row[header] = values[i] || ""
        })
        return row
      })

      setPreviewData(preview)
      console.log("Preview data:", preview)
    } catch (error) {
      console.error("Error previewing file:", error)
      setValidationErrors([{ row: 0, field: "file", message: "Error reading file", value: "" }])
    }
  }

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0]

    // Try different date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    ]

    let normalizedDate = dateStr.trim()

    // Convert MM/DD/YYYY to YYYY-MM-DD
    if (formats[1].test(normalizedDate) || formats[3].test(normalizedDate)) {
      const parts = normalizedDate.split("/")
      normalizedDate = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    }
    // Convert MM-DD-YYYY to YYYY-MM-DD
    else if (formats[2].test(normalizedDate)) {
      const parts = normalizedDate.split("-")
      normalizedDate = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
    }

    // Validate the final date
    const date = new Date(normalizedDate)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`)
    }

    return normalizedDate
  }

  const validatePurchaseOrderData = (data: any[]): ValidationError[] => {
    const errors: ValidationError[] = []
    const requiredFields = ["po_number", "supplier_name", "po_date", "sku", "product_name", "quantity", "unit_cost"]

    data.forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push({
            row: row._rowNumber || index + 2,
            field,
            message: `${field} is required`,
            value: row[field] || "",
          })
        }
      })

      // Validate numeric fields
      if (row.quantity && isNaN(Number(row.quantity))) {
        errors.push({
          row: row._rowNumber || index + 2,
          field: "quantity",
          message: "Quantity must be a number",
          value: row.quantity,
        })
      }

      if (row.unit_cost && isNaN(Number(row.unit_cost))) {
        errors.push({
          row: row._rowNumber || index + 2,
          field: "unit_cost",
          message: "Unit cost must be a number",
          value: row.unit_cost,
        })
      }

      if (row.delivery_cost && isNaN(Number(row.delivery_cost))) {
        errors.push({
          row: row._rowNumber || index + 2,
          field: "delivery_cost",
          message: "Delivery cost must be a number",
          value: row.delivery_cost,
        })
      }

      // Validate date
      if (row.po_date) {
        try {
          normalizeDate(row.po_date)
        } catch (error) {
          errors.push({
            row: row._rowNumber || index + 2,
            field: "po_date",
            message: "Invalid date format. Use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY",
            value: row.po_date,
          })
        }
      }
    })

    return errors
  }

  const validateShopifyOrderData = (data: any[]): ValidationError[] => {
    const errors: ValidationError[] = []
    const requiredFields = [
      "order_number",
      "customer_name",
      "customer_email",
      "order_date",
      "sku",
      "product_name",
      "quantity",
      "unit_price",
    ]

    data.forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push({
            row: row._rowNumber || index + 2,
            field,
            message: `${field} is required`,
            value: row[field] || "",
          })
        }
      })

      // Validate numeric fields
      const numericFields = ["quantity", "unit_price", "total_amount", "shipping_cost", "tax_amount"]
      numericFields.forEach((field) => {
        if (row[field] && isNaN(Number(row[field]))) {
          errors.push({
            row: row._rowNumber || index + 2,
            field,
            message: `${field} must be a number`,
            value: row[field],
          })
        }
      })

      // Validate email
      if (row.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.customer_email)) {
        errors.push({
          row: row._rowNumber || index + 2,
          field: "customer_email",
          message: "Invalid email format",
          value: row.customer_email,
        })
      }

      // Validate date
      if (row.order_date) {
        try {
          normalizeDate(row.order_date)
        } catch (error) {
          errors.push({
            row: row._rowNumber || index + 2,
            field: "order_date",
            message: "Invalid date format. Use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY",
            value: row.order_date,
          })
        }
      }
    })

    return errors
  }

  const processPurchaseOrders = async (data: any[]): Promise<ImportResult> => {
    try {
      // Group rows by PO number
      const poGroups = new Map<string, any[]>()

      data.forEach((row) => {
        const poNumber = row.po_number?.toString().trim()
        if (!poNumber) return

        if (!poGroups.has(poNumber)) {
          poGroups.set(poNumber, [])
        }
        poGroups.get(poNumber)!.push(row)
      })

      console.log(`Processing ${poGroups.size} purchase orders...`)
      let processed = 0
      const errors: string[] = []

      for (const [poNumber, rows] of poGroups) {
        try {
          // Use first row for header data
          const headerRow = rows[0]

          const poData = {
            supplier_name: headerRow.supplier_name?.toString().trim() || "",
            po_date: normalizeDate(headerRow.po_date?.toString().trim() || ""),
            status: (headerRow.status?.toString().trim() || "Pending") as
              | "Draft"
              | "Pending"
              | "In Transit"
              | "Delivered",
            delivery_cost: Number(headerRow.delivery_cost || 0),
            notes: headerRow.notes?.toString().trim() || "",
            items: rows
              .map((row) => ({
                sku: row.sku?.toString().trim() || "",
                product_name: row.product_name?.toString().trim() || "",
                quantity: Number(row.quantity || 0),
                unit_cost: Number(row.unit_cost || 0),
              }))
              .filter((item) => item.sku && item.product_name && item.quantity > 0),
          }

          if (poData.items.length === 0) {
            errors.push(`PO ${poNumber}: No valid items found`)
            continue
          }

          await supabaseStore.createPurchaseOrder(poData)
          processed++
          setProgress((processed / poGroups.size) * 100)

          console.log(`Created PO ${poNumber} with ${poData.items.length} items`)
        } catch (error) {
          console.error(`Error processing PO ${poNumber}:`, error)
          errors.push(`PO ${poNumber}: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      return {
        success: processed > 0,
        message: `Successfully imported ${processed} of ${poGroups.size} purchase orders`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      console.error("Error processing purchase orders:", error)
      return {
        success: false,
        message: "Failed to process purchase orders",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  const processShopifyOrders = async (data: any[]): Promise<ImportResult> => {
    try {
      // Group rows by order number
      const orderGroups = new Map<string, any[]>()

      data.forEach((row) => {
        const orderNumber = row.order_number?.toString().trim()
        if (!orderNumber) return

        if (!orderGroups.has(orderNumber)) {
          orderGroups.set(orderNumber, [])
        }
        orderGroups.get(orderNumber)!.push(row)
      })

      console.log(`Processing ${orderGroups.size} Shopify orders...`)

      const ordersToImport = Array.from(orderGroups.entries())
        .map(([orderNumber, rows]) => {
          // Use first row for header data
          const headerRow = rows[0]

          return {
            store_id: headerRow.store_id?.toString().trim() || "default-store",
            shopify_order_id: headerRow.shopify_order_id?.toString().trim() || `import-${orderNumber}`,
            order_number: orderNumber,
            customer_name: headerRow.customer_name?.toString().trim() || "",
            customer_email: headerRow.customer_email?.toString().trim() || "",
            order_date: normalizeDate(headerRow.order_date?.toString().trim() || ""),
            status: headerRow.status?.toString().trim() || "fulfilled",
            total_amount: Number(headerRow.total_amount || 0),
            shipping_cost: Number(headerRow.shipping_cost || 0),
            tax_amount: Number(headerRow.tax_amount || 0),
            shipping_address: headerRow.shipping_address?.toString().trim() || "",
            items: rows
              .map((row) => ({
                sku: row.sku?.toString().trim() || "",
                product_name: row.product_name?.toString().trim() || "",
                quantity: Number(row.quantity || 0),
                unit_price: Number(row.unit_price || 0),
                total_price: Number(row.total_price || Number(row.quantity || 0) * Number(row.unit_price || 0)),
              }))
              .filter((item) => item.sku && item.product_name && item.quantity > 0),
          }
        })
        .filter((order) => order.items.length > 0)

      if (ordersToImport.length === 0) {
        return {
          success: false,
          message: "No valid orders found to import",
        }
      }

      const result = await supabaseStore.addShopifyOrders(ordersToImport)

      return {
        success: true,
        message: `Successfully imported ${result.length} Shopify orders`,
        processed: result.length,
      }
    } catch (error) {
      console.error("Error processing Shopify orders:", error)
      return {
        success: false,
        message: "Failed to process Shopify orders",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  const handleImport = async () => {
    if (!file) return

    try {
      setImporting(true)
      setProgress(0)
      setResults(null)
      setValidationErrors([])

      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        setResults({
          success: false,
          message: "File must contain at least a header and one data row",
        })
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const data = lines
        .slice(1)
        .map((line, index) => {
          const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
          const row: any = { _rowNumber: index + 2 }
          headers.forEach((header, i) => {
            row[header] = values[i] || ""
          })
          return row
        })
        .filter((row) => Object.values(row).some((val) => val !== ""))

      console.log(`Processing ${data.length} rows...`)

      // Validate data
      let errors: ValidationError[] = []
      if (activeTab === "purchase-orders") {
        errors = validatePurchaseOrderData(data)
      } else {
        errors = validateShopifyOrderData(data)
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
        setResults({
          success: false,
          message: `Found ${errors.length} validation errors. Please fix them and try again.`,
        })
        return
      }

      // Process data
      let result: ImportResult
      if (activeTab === "purchase-orders") {
        result = await processPurchaseOrders(data)
      } else {
        result = await processShopifyOrders(data)
      }

      setResults(result)
      setProgress(100)
    } catch (error) {
      console.error("Import error:", error)
      setResults({
        success: false,
        message: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = (type: "purchase-orders" | "shopify-orders") => {
    let headers: string[]
    let sampleData: string[][]

    if (type === "purchase-orders") {
      headers = [
        "po_number",
        "supplier_name",
        "po_date",
        "status",
        "delivery_cost",
        "notes",
        "sku",
        "product_name",
        "quantity",
        "unit_cost",
      ]
      sampleData = [
        [
          "PO-2024-001",
          "Supplier ABC",
          "2024-01-15",
          "Pending",
          "50.00",
          "Rush order",
          "SKU-001",
          "Product A",
          "10",
          "25.50",
        ],
        [
          "PO-2024-001",
          "Supplier ABC",
          "2024-01-15",
          "Pending",
          "50.00",
          "Rush order",
          "SKU-002",
          "Product B",
          "5",
          "15.75",
        ],
        ["PO-2024-002", "Supplier XYZ", "2024-01-16", "Delivered", "25.00", "", "SKU-003", "Product C", "20", "8.25"],
      ]
    } else {
      headers = [
        "store_id",
        "shopify_order_id",
        "order_number",
        "customer_name",
        "customer_email",
        "order_date",
        "status",
        "total_amount",
        "shipping_cost",
        "tax_amount",
        "shipping_address",
        "sku",
        "product_name",
        "quantity",
        "unit_price",
        "total_price",
      ]
      sampleData = [
        [
          "store-1",
          "12345",
          "ORD-001",
          "John Doe",
          "john@example.com",
          "2024-01-15",
          "fulfilled",
          "100.00",
          "10.00",
          "8.00",
          "123 Main St, City, State 12345",
          "SKU-001",
          "Product A",
          "2",
          "25.50",
          "51.00",
        ],
        [
          "store-1",
          "12345",
          "ORD-001",
          "John Doe",
          "john@example.com",
          "2024-01-15",
          "fulfilled",
          "100.00",
          "10.00",
          "8.00",
          "123 Main St, City, State 12345",
          "SKU-002",
          "Product B",
          "1",
          "15.75",
          "15.75",
        ],
        [
          "store-1",
          "12346",
          "ORD-002",
          "Jane Smith",
          "jane@example.com",
          "2024-01-16",
          "fulfilled",
          "75.50",
          "5.00",
          "6.00",
          "456 Oak Ave, City, State 67890",
          "SKU-003",
          "Product C",
          "3",
          "8.25",
          "24.75",
        ],
      ]
    }

    const csvContent = [headers.join(","), ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join(
      "\n",
    )

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${type}-template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-lg font-semibold">Import Data</h1>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Import CSV Data</CardTitle>
              <CardDescription>
                Import purchase orders and Shopify orders from CSV files. Each line item should be a separate row with
                the same PO/order number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Purchase Orders
                  </TabsTrigger>
                  <TabsTrigger value="shopify-orders" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Shopify Orders
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="purchase-orders" className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Multi-line format:</strong> Each line item should be a separate row. Repeat the PO number,
                      supplier, and header info for each item.
                      <br />
                      <strong>Required fields:</strong> po_number, supplier_name, po_date, sku, product_name, quantity,
                      unit_cost
                      <br />
                      <strong>Optional fields:</strong> status (Draft/Pending/In Transit/Delivered), delivery_cost,
                      notes
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => downloadTemplate("purchase-orders")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="shopify-orders" className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Multi-line format:</strong> Each line item should be a separate row. Repeat the order
                      number and customer info for each item.
                      <br />
                      <strong>Required fields:</strong> order_number, customer_name, customer_email, order_date, sku,
                      product_name, quantity, unit_price
                      <br />
                      <strong>Optional fields:</strong> store_id, shopify_order_id, status, total_amount, shipping_cost,
                      tax_amount, shipping_address, total_price
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => downloadTemplate("shopify-orders")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="file">Select CSV File</Label>
                  <Input id="file" type="file" accept=".csv" onChange={handleFileChange} disabled={importing} />
                </div>

                {file && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                    </div>

                    {previewData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Preview (First 5 rows)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(previewData[0])
                                    .filter((key) => key !== "_rowNumber")
                                    .map((header) => (
                                      <TableHead key={header}>{header}</TableHead>
                                    ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.map((row, index) => (
                                  <TableRow key={index}>
                                    {Object.entries(row)
                                      .filter(([key]) => key !== "_rowNumber")
                                      .map(([key, value]) => (
                                        <TableCell key={key} className="max-w-32 truncate">
                                          {value?.toString() || ""}
                                        </TableCell>
                                      ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {validationErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="font-medium">Validation Errors ({validationErrors.length}):</div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {validationErrors.slice(0, 10).map((error, index) => (
                                <div key={index} className="text-sm">
                                  Row {error.row}, {error.field}: {error.message}
                                  {error.value && (
                                    <span className="text-muted-foreground"> (value: "{error.value}")</span>
                                  )}
                                </div>
                              ))}
                              {validationErrors.length > 10 && (
                                <div className="text-sm text-muted-foreground">
                                  ... and {validationErrors.length - 10} more errors
                                </div>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleImport}
                      disabled={importing || validationErrors.length > 0}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {importing
                        ? "Importing..."
                        : `Import ${activeTab === "purchase-orders" ? "Purchase Orders" : "Shopify Orders"}`}
                    </Button>

                    {importing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )}

                    {results && (
                      <Alert variant={results.success ? "default" : "destructive"}>
                        {results.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="font-medium">{results.message}</div>
                            {results.details && <div className="text-sm text-muted-foreground">{results.details}</div>}
                            {results.errors && results.errors.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">Errors:</div>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                  {results.errors.map((error, index) => (
                                    <div key={index} className="text-sm text-muted-foreground">
                                      • {error}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
