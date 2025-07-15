"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Upload, FileText, Package, ShoppingCart, AlertCircle, CheckCircle, X, RotateCcw, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabaseStore } from "@/lib/supabase-store"

/**
 * Safely parse integers / floats.
 * Returns the provided fallback (default = 0) when the value is
 * undefined, empty, or NaN so we never pass `null` to Postgres.
 */
function safeInt(value: string | undefined, fallback = 0): number {
  const n = Number.parseInt(value ?? "", 10)
  return Number.isFinite(n) ? n : fallback
}

function safeFloat(value: string | undefined, fallback = 0): number {
  const n = Number.parseFloat(value ?? "")
  return Number.isFinite(n) ? n : fallback
}

/**
 * Converts various date formats (DD-MM-YYYY, DD/MM/YYYY, YY-MM-DD, etc.)
 * to the canonical YYYY-MM-DD format accepted by Postgres.
 */
function normalizeDate(input: string | undefined): string {
  if (!input || !input.trim()) {
    return new Date().toISOString().split("T")[0]
  }

  const raw = input.trim().replace(/\//g, "-")

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const parts = raw.split("-")
  if (parts.length === 3) {
    const [a, b, c] = parts

    // Case 1: YY-MM-DD  → prepend 20 to year
    if (a.length === 2 && b.length === 2 && c.length === 2) {
      return `20${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`
    }

    // Case 2: DD-MM-YYYY or DD-MM-YY
    if (c.length === 4) {
      return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`
    }
  }

  // Fallback
  return new Date().toISOString().split("T")[0]
}

interface ImportResult {
  success: boolean
  message: string
  imported: number
  errors: string[]
}

interface PreviewData {
  headers: string[]
  rows: string[][]
  type: "purchase-orders" | "inventory" | "orders" | "returns" | null
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [importType, setImportType] = useState<"purchase-orders" | "inventory" | "orders" | "returns">(
    "purchase-orders",
  )

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      previewFile(selectedFile)
    }
  }, [])

  const previewFile = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        setPreview(null)
        return
      }

      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())
      const rows = lines.slice(1, 6).map((line) => line.split(",").map((cell) => cell.replace(/"/g, "").trim()))

      // Auto-detect import type based on headers
      let detectedType: "purchase-orders" | "inventory" | "orders" | "returns" | null = null

      if (headers.some((h) => h.toLowerCase().includes("supplier") || h.toLowerCase().includes("po"))) {
        detectedType = "purchase-orders"
      } else if (headers.some((h) => h.toLowerCase().includes("sku") && h.toLowerCase().includes("stock"))) {
        detectedType = "inventory"
      } else if (headers.some((h) => h.toLowerCase().includes("order") && h.toLowerCase().includes("customer"))) {
        detectedType = "orders"
      } else if (headers.some((h) => h.toLowerCase().includes("return") || h.toLowerCase().includes("refund"))) {
        detectedType = "returns"
      }

      setPreview({
        headers,
        rows,
        type: detectedType,
      })

      if (detectedType) {
        setImportType(detectedType)
      }
    } catch (error) {
      console.error("Error previewing file:", error)
      setPreview(null)
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!file) return

    try {
      setImporting(true)
      setResult(null)

      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        setResult({
          success: false,
          message: "File must contain at least a header row and one data row",
          imported: 0,
          errors: ["Invalid file format"],
        })
        return
      }

      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim())
      const dataRows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.replace(/"/g, "").trim()))

      let imported = 0
      const errors: string[] = []

      if (importType === "purchase-orders") {
        // Group rows by PO identifier (supplier + date + status combination)
        const poGroups = new Map<
          string,
          {
            supplier_name: string
            po_date: string
            status: "Draft" | "Pending" | "In Transit" | "Delivered"
            delivery_cost: number
            notes: string
            items: Array<{
              sku: string
              product_name: string
              quantity: number
              unit_cost: number
            }>
          }
        >()

        // Find column indices once
        const supplierIndex = headers.findIndex((h) => h.toLowerCase() === "supplier")
        const dateIndex = headers.findIndex((h) => h.toLowerCase() === "date")
        const statusIndex = headers.findIndex((h) => h.toLowerCase() === "status")
        const deliveryCostIndex = headers.findIndex(
          (h) => h.toLowerCase() === "delivery cost" || h.toLowerCase() === "delivery_cost",
        )
        const skuIndex = headers.findIndex((h) => h.toLowerCase() === "sku")
        const productIndex = headers.findIndex((h) => h.toLowerCase() === "product")
        const quantityIndex = headers.findIndex((h) => h.toLowerCase() === "quantity")
        const unitCostIndex = headers.findIndex(
          (h) => h.toLowerCase() === "unit cost" || h.toLowerCase() === "unit_cost",
        )
        const notesIndex = headers.findIndex((h) => h.toLowerCase() === "notes")

        // Process each row and group by PO
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length === 0 || row.every((cell) => !cell.trim())) continue

            const supplier = row[supplierIndex] || `Supplier ${i + 1}`
            const date = normalizeDate(row[dateIndex])
            const status = (row[statusIndex] || "Draft") as "Draft" | "Pending" | "In Transit" | "Delivered"
            const deliveryCost = safeFloat(row[deliveryCostIndex])
            const notes = row[notesIndex] || ""

            // Create a unique key for this PO (supplier + date + status)
            const poKey = `${supplier}|${date}|${status}`

            // Get or create PO group
            if (!poGroups.has(poKey)) {
              poGroups.set(poKey, {
                supplier_name: supplier,
                po_date: date,
                status: status,
                delivery_cost: deliveryCost,
                notes: notes,
                items: [],
              })
            }

            const poGroup = poGroups.get(poKey)!

            // Add item to this PO
            const item = {
              sku: row[skuIndex] || `SKU-${i + 1}`,
              product_name: row[productIndex] || `Product ${i + 1}`,
              quantity: safeInt(row[quantityIndex], 1),
              unit_cost: safeFloat(row[unitCostIndex]),
            }

            poGroup.items.push(item)
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }

        // Create POs from grouped data
        for (const [poKey, poData] of poGroups) {
          try {
            if (poData.items.length > 0) {
              await supabaseStore.createPurchaseOrder(poData)
              imported++
            }
          } catch (error) {
            errors.push(`PO ${poKey}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      } else if (importType === "inventory") {
        // Import inventory
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length === 0 || row.every((cell) => !cell.trim())) continue

            const skuIndex = headers.findIndex((h) => h.toLowerCase() === "sku")
            const nameIndex = headers.findIndex((h) => h.toLowerCase() === "name" || h.toLowerCase() === "product")
            const quantityIndex = headers.findIndex(
              (h) => h.toLowerCase() === "quantity" || h.toLowerCase() === "stock",
            )
            const unitCostIndex = headers.findIndex(
              (h) => h.toLowerCase() === "unit cost" || h.toLowerCase() === "unit_cost" || h.toLowerCase() === "cost",
            )

            const inventoryData = {
              sku: row[skuIndex] || `SKU-${i + 1}`,
              name: row[nameIndex] || `Product ${i + 1}`,
              quantity: safeInt(row[quantityIndex]),
              unitCost: safeFloat(row[unitCostIndex]),
            }

            if (inventoryData.quantity > 0) {
              await supabaseStore.addManualInventory(inventoryData)
              imported++
            }
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      } else if (importType === "orders") {
        // Group rows by order identifier (order_id or order_number)
        const orderGroups = new Map<
          string,
          {
            store_id: string
            shopify_order_id: string
            order_number: string
            customer_name: string
            customer_email: string
            order_date: string
            status: string
            total_amount: number
            shipping_cost: number
            tax_amount: number
            shipping_address: string
            items: Array<{
              sku: string
              product_name: string
              quantity: number
              unit_price: number
              total_price: number
            }>
          }
        >()

        // Find column indices
        const orderIdIndex = headers.findIndex((h) => h.toLowerCase() === "order id" || h.toLowerCase() === "order_id")
        const orderNumberIndex = headers.findIndex(
          (h) => h.toLowerCase() === "order number" || h.toLowerCase() === "order_number",
        )
        const customerIndex = headers.findIndex((h) => h.toLowerCase() === "customer")
        const emailIndex = headers.findIndex((h) => h.toLowerCase() === "email")
        const dateIndex = headers.findIndex((h) => h.toLowerCase() === "date")
        const statusIndex = headers.findIndex((h) => h.toLowerCase() === "status")
        const totalIndex = headers.findIndex((h) => h.toLowerCase() === "total")
        const shippingIndex = headers.findIndex((h) => h.toLowerCase() === "shipping")
        const taxIndex = headers.findIndex((h) => h.toLowerCase() === "tax")
        const addressIndex = headers.findIndex((h) => h.toLowerCase() === "address")
        const skuIndex = headers.findIndex((h) => h.toLowerCase() === "sku")
        const productIndex = headers.findIndex((h) => h.toLowerCase() === "product")
        const quantityIndex = headers.findIndex((h) => h.toLowerCase() === "quantity")
        const priceIndex = headers.findIndex(
          (h) => h.toLowerCase() === "price" || h.toLowerCase() === "unit price" || h.toLowerCase() === "unit_price",
        )

        // Process each row and group by order
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length === 0 || row.every((cell) => !cell.trim())) continue

            const orderId = row[orderIdIndex] || `ORDER-${Date.now()}-${i}`
            const orderNumber = row[orderNumberIndex] || `#${1000 + i}`

            // Use order ID as the key, fallback to order number
            const orderKey = orderId !== `ORDER-${Date.now()}-${i}` ? orderId : orderNumber

            // Get or create order group
            if (!orderGroups.has(orderKey)) {
              orderGroups.set(orderKey, {
                store_id: "1", // Default store
                shopify_order_id: orderId,
                order_number: orderNumber,
                customer_name: row[customerIndex] || `Customer ${i + 1}`,
                customer_email: row[emailIndex] || "",
                order_date: normalizeDate(row[dateIndex]),
                status: row[statusIndex] || "pending",
                total_amount: safeFloat(row[totalIndex]),
                shipping_cost: safeFloat(row[shippingIndex]),
                tax_amount: safeFloat(row[taxIndex]),
                shipping_address: row[addressIndex] || "",
                items: [],
              })
            }

            const orderGroup = orderGroups.get(orderKey)!

            // Add item to this order
            const item = {
              sku: row[skuIndex] || `SKU-${i + 1}`,
              product_name: row[productIndex] || `Product ${i + 1}`,
              quantity: safeInt(row[quantityIndex], 1),
              unit_price: safeFloat(row[priceIndex]),
              total_price: safeFloat(row[totalIndex]),
            }

            orderGroup.items.push(item)
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }

        // Create orders from grouped data
        for (const [orderKey, orderData] of orderGroups) {
          try {
            if (orderData.items.length > 0) {
              await supabaseStore.addShopifyOrders([orderData])
              imported++
            }
          } catch (error) {
            errors.push(`Order ${orderKey}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      } else if (importType === "returns") {
        // Group rows by return identifier
        const returnGroups = new Map<
          string,
          {
            customer_name: string
            customer_email?: string
            order_number?: string
            return_date: string
            status: "Pending" | "Processing" | "Accepted" | "Rejected"
            total_refund: number
            notes?: string
            items: Array<{
              sku: string
              product_name: string
              quantity: number
              condition: string
              reason: string
              total_refund: number
              unit_price?: number
            }>
          }
        >()

        // Find column indices
        const returnNumberIndex = headers.findIndex(
          (h) => h.toLowerCase() === "return number" || h.toLowerCase() === "return_number",
        )
        const customerIndex = headers.findIndex((h) => h.toLowerCase() === "customer")
        const emailIndex = headers.findIndex((h) => h.toLowerCase() === "email")
        const orderNumberIndex = headers.findIndex(
          (h) => h.toLowerCase() === "order number" || h.toLowerCase() === "order_number",
        )
        const dateIndex = headers.findIndex((h) => h.toLowerCase() === "date")
        const statusIndex = headers.findIndex((h) => h.toLowerCase() === "status")
        const refundIndex = headers.findIndex((h) => h.toLowerCase() === "refund")
        const notesIndex = headers.findIndex((h) => h.toLowerCase() === "notes")
        const skuIndex = headers.findIndex((h) => h.toLowerCase() === "sku")
        const productIndex = headers.findIndex((h) => h.toLowerCase() === "product")
        const quantityIndex = headers.findIndex((h) => h.toLowerCase() === "quantity")
        const conditionIndex = headers.findIndex((h) => h.toLowerCase() === "condition")
        const reasonIndex = headers.findIndex((h) => h.toLowerCase() === "reason")
        const unitPriceIndex = headers.findIndex(
          (h) => h.toLowerCase() === "unit price" || h.toLowerCase() === "unit_price",
        )

        // Process each row and group by return
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length === 0 || row.every((cell) => !cell.trim())) continue

            const returnNumber = row[returnNumberIndex] || `RETURN-${i + 1}`
            const customer = row[customerIndex] || `Customer ${i + 1}`
            const orderNumber = row[orderNumberIndex] || ""

            // Use return number + customer + order as the key
            const returnKey = `${returnNumber}|${customer}|${orderNumber}`

            // Get or create return group
            if (!returnGroups.has(returnKey)) {
              returnGroups.set(returnKey, {
                customer_name: customer,
                customer_email: row[emailIndex] || "",
                order_number: orderNumber || undefined,
                return_date: normalizeDate(row[dateIndex]),
                status: (row[statusIndex] || "Pending") as "Pending" | "Processing" | "Accepted" | "Rejected",
                total_refund: safeFloat(row[refundIndex]),
                notes: row[notesIndex] || "",
                items: [],
              })
            }

            const returnGroup = returnGroups.get(returnKey)!

            // Add item to this return
            const item = {
              sku: row[skuIndex] || `SKU-${i + 1}`,
              product_name: row[productIndex] || `Product ${i + 1}`,
              quantity: safeInt(row[quantityIndex], 1),
              condition: row[conditionIndex] || "Good",
              reason: row[reasonIndex] || "Other",
              total_refund: safeFloat(row[refundIndex]),
              unit_price: safeFloat(row[unitPriceIndex]),
            }

            returnGroup.items.push(item)
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }

        // Create returns from grouped data
        for (const [returnKey, returnData] of returnGroups) {
          try {
            if (returnData.items.length > 0) {
              await supabaseStore.createReturn(returnData)
              imported++
            }
          } catch (error) {
            errors.push(`Return ${returnKey}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      }

      setResult({
        success: imported > 0,
        message: `Successfully imported ${imported} ${importType.replace("-", " ")}`,
        imported,
        errors,
      })
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
        imported: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      })
    } finally {
      setImporting(false)
    }
  }, [file, importType])

  const clearFile = useCallback(() => {
    setFile(null)
    setPreview(null)
    setResult(null)
  }, [])

  const downloadSample = useCallback((type: string) => {
    const link = document.createElement("a")
    link.href = `/samples/sample-${type}.csv`
    link.download = `sample-${type}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <h1 className="text-lg font-semibold">Import Data</h1>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Orders
              </CardTitle>
              <CardDescription>Import purchase orders with supplier information, items, and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Expected columns: Supplier, Date, Status, SKU, Product, Quantity, Unit Cost, Delivery Cost, Notes
              </p>
              <p className="text-xs text-blue-600">
                Multiple rows with the same Supplier + Date + Status will be grouped into one PO with multiple items.
              </p>
              <Button variant="outline" size="sm" onClick={() => downloadSample("purchase-orders")} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Inventory
              </CardTitle>
              <CardDescription>Import inventory items with stock levels and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Expected columns: SKU, Name/Product, Quantity/Stock, Unit Cost/Cost
              </p>
              <Button variant="outline" size="sm" onClick={() => downloadSample("inventory")} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Orders
              </CardTitle>
              <CardDescription>Import customer orders with items and shipping information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Expected columns: Order ID, Order Number, Customer, Email, Date, Status, SKU, Product, Quantity, Price,
                Total, Shipping, Tax, Address
              </p>
              <p className="text-xs text-blue-600">
                Multiple rows with the same Order ID will be grouped into one order with multiple items.
              </p>
              <Button variant="outline" size="sm" onClick={() => downloadSample("orders")} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Returns
              </CardTitle>
              <CardDescription>Import customer returns with items and refund information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Expected columns: Return Number, Customer, Email, Order Number, Date, Status, SKU, Product, Quantity,
                Condition, Reason, Refund
              </p>
              <p className="text-xs text-blue-600">
                Multiple rows with the same Return Number will be grouped into one return with multiple items.
              </p>
              <Button variant="outline" size="sm" onClick={() => downloadSample("returns")} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file to import data. The system will auto-detect the data type based on column headers and
              group related rows together.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-type">Import Type</Label>
              <select
                id="import-type"
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
                className="w-full p-2 border rounded-md"
              >
                <option value="purchase-orders">Purchase Orders</option>
                <option value="inventory">Inventory</option>
                <option value="orders">Orders</option>
                <option value="returns">Returns</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">CSV File</Label>
              <div className="flex items-center gap-2">
                <Input id="file-upload" type="file" accept=".csv" onChange={handleFileSelect} className="flex-1" />
                {file && (
                  <Button variant="outline" size="sm" onClick={clearFile}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {file && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                  {preview?.type && <Badge variant="outline">Auto-detected: {preview.type.replace("-", " ")}</Badge>}
                </div>
              </div>
            )}

            {preview && (
              <div className="space-y-2">
                <Label>Preview (first 5 rows)</Label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((header, index) => (
                          <TableHead key={index} className="text-xs">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="text-xs">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={!file || importing} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {importing ? "Importing..." : "Import Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                <div className="space-y-2">
                  <p className="font-medium">{result.message}</p>
                  {result.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Errors:</p>
                      <ul className="text-sm space-y-1">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index} className="list-disc list-inside">
                            {error}
                          </li>
                        ))}
                        {result.errors.length > 5 && (
                          <li className="text-muted-foreground">... and {result.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Import Guidelines</CardTitle>
            <CardDescription>Follow these guidelines for successful data imports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">File Format</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Use CSV format with comma-separated values</li>
                  <li>• Include a header row with column names</li>
                  <li>• Ensure data types match expected formats (numbers, dates, etc.)</li>
                  <li>• Use quotes around text values that contain commas</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Data Grouping</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Purchase Orders: Rows with same Supplier + Date + Status are grouped together</li>
                  <li>• Orders: Rows with same Order ID are grouped together</li>
                  <li>• Returns: Rows with same Return Number are grouped together</li>
                  <li>• Inventory: Each row creates a separate inventory entry</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Data Validation</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• SKUs should be unique within each group</li>
                  <li>• Quantities and costs must be positive numbers</li>
                  <li>• Dates should be in YYYY-MM-DD format</li>
                  <li>• Status values must match predefined options</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Error Handling</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Invalid rows will be skipped and reported</li>
                  <li>• Partial imports are possible if some groups are valid</li>
                  <li>• Check the error log for specific issues</li>
                  <li>• Fix errors and re-import if needed</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Sample Files</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Download sample files to see the expected format</li>
                  <li>• Use sample files as templates for your data</li>
                  <li>• Column names are case-insensitive</li>
                  <li>• Additional columns will be ignored</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
