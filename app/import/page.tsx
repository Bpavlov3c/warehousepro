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
        // Import purchase orders
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length < headers.length) continue

            const poData = {
              supplier_name:
                row[headers.indexOf("Supplier")] || row[headers.indexOf("supplier")] || `Supplier ${i + 1}`,
              po_date:
                row[headers.indexOf("Date")] || row[headers.indexOf("date")] || new Date().toISOString().split("T")[0],
              status: (row[headers.indexOf("Status")] || row[headers.indexOf("status")] || "Draft") as
                | "Draft"
                | "Pending"
                | "In Transit"
                | "Delivered",
              delivery_cost: Number.parseFloat(
                row[headers.indexOf("Delivery Cost")] || row[headers.indexOf("delivery_cost")] || "0",
              ),
              items: [
                {
                  sku: row[headers.indexOf("SKU")] || row[headers.indexOf("sku")] || `SKU-${i + 1}`,
                  product_name:
                    row[headers.indexOf("Product")] || row[headers.indexOf("product")] || `Product ${i + 1}`,
                  quantity: Number.parseInt(
                    row[headers.indexOf("Quantity")] || row[headers.indexOf("quantity")] || "1",
                  ),
                  unit_cost: Number.parseFloat(
                    row[headers.indexOf("Unit Cost")] || row[headers.indexOf("unit_cost")] || "0",
                  ),
                },
              ],
              notes: row[headers.indexOf("Notes")] || row[headers.indexOf("notes")] || "",
            }

            await supabaseStore.createPurchaseOrder(poData)
            imported++
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      } else if (importType === "inventory") {
        // Import inventory
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length < headers.length) continue

            const inventoryData = {
              sku: row[headers.indexOf("SKU")] || row[headers.indexOf("sku")] || `SKU-${i + 1}`,
              name:
                row[headers.indexOf("Name")] ||
                row[headers.indexOf("name")] ||
                row[headers.indexOf("Product")] ||
                `Product ${i + 1}`,
              quantity: Number.parseInt(
                row[headers.indexOf("Quantity")] ||
                  row[headers.indexOf("quantity")] ||
                  row[headers.indexOf("Stock")] ||
                  "0",
              ),
              unitCost: Number.parseFloat(
                row[headers.indexOf("Unit Cost")] ||
                  row[headers.indexOf("unit_cost")] ||
                  row[headers.indexOf("Cost")] ||
                  "0",
              ),
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
        // Import orders (simplified - would need more complex mapping for real Shopify orders)
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length < headers.length) continue

            const orderData = {
              store_id: "1", // Default store
              shopify_order_id: row[headers.indexOf("Order ID")] || `ORDER-${Date.now()}-${i}`,
              order_number: row[headers.indexOf("Order Number")] || `#${1000 + i}`,
              customer_name:
                row[headers.indexOf("Customer")] || row[headers.indexOf("customer")] || `Customer ${i + 1}`,
              customer_email: row[headers.indexOf("Email")] || row[headers.indexOf("email")] || "",
              order_date: row[headers.indexOf("Date")] || row[headers.indexOf("date")] || new Date().toISOString(),
              status: row[headers.indexOf("Status")] || row[headers.indexOf("status")] || "pending",
              total_amount: Number.parseFloat(row[headers.indexOf("Total")] || row[headers.indexOf("total")] || "0"),
              shipping_cost: Number.parseFloat(
                row[headers.indexOf("Shipping")] || row[headers.indexOf("shipping")] || "0",
              ),
              tax_amount: Number.parseFloat(row[headers.indexOf("Tax")] || row[headers.indexOf("tax")] || "0"),
              shipping_address: row[headers.indexOf("Address")] || row[headers.indexOf("address")] || "",
              items: [
                {
                  sku: row[headers.indexOf("SKU")] || row[headers.indexOf("sku")] || `SKU-${i + 1}`,
                  product_name:
                    row[headers.indexOf("Product")] || row[headers.indexOf("product")] || `Product ${i + 1}`,
                  quantity: Number.parseInt(
                    row[headers.indexOf("Quantity")] || row[headers.indexOf("quantity")] || "1",
                  ),
                  unit_price: Number.parseFloat(row[headers.indexOf("Price")] || row[headers.indexOf("price")] || "0"),
                  total_price: Number.parseFloat(row[headers.indexOf("Total")] || row[headers.indexOf("total")] || "0"),
                },
              ],
            }

            await supabaseStore.addShopifyOrders([orderData])
            imported++
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        }
      } else if (importType === "returns") {
        // Import returns
        for (let i = 0; i < dataRows.length; i++) {
          try {
            const row = dataRows[i]
            if (row.length < headers.length) continue

            const returnData = {
              customer_name:
                row[headers.indexOf("Customer")] || row[headers.indexOf("customer")] || `Customer ${i + 1}`,
              customer_email: row[headers.indexOf("Email")] || row[headers.indexOf("email")] || "",
              order_number: row[headers.indexOf("Order Number")] || row[headers.indexOf("order_number")] || "",
              return_date:
                row[headers.indexOf("Date")] || row[headers.indexOf("date")] || new Date().toISOString().split("T")[0],
              status: (row[headers.indexOf("Status")] || row[headers.indexOf("status")] || "Pending") as
                | "Pending"
                | "Processing"
                | "Accepted"
                | "Rejected",
              total_refund: Number.parseFloat(row[headers.indexOf("Refund")] || row[headers.indexOf("refund")] || "0"),
              notes: row[headers.indexOf("Notes")] || row[headers.indexOf("notes")] || "",
              items: [
                {
                  sku: row[headers.indexOf("SKU")] || row[headers.indexOf("sku")] || `SKU-${i + 1}`,
                  product_name:
                    row[headers.indexOf("Product")] || row[headers.indexOf("product")] || `Product ${i + 1}`,
                  quantity: Number.parseInt(
                    row[headers.indexOf("Quantity")] || row[headers.indexOf("quantity")] || "1",
                  ),
                  condition: row[headers.indexOf("Condition")] || row[headers.indexOf("condition")] || "Good",
                  reason: row[headers.indexOf("Reason")] || row[headers.indexOf("reason")] || "Other",
                  total_refund: Number.parseFloat(
                    row[headers.indexOf("Refund")] || row[headers.indexOf("refund")] || "0",
                  ),
                  unit_price: Number.parseFloat(
                    row[headers.indexOf("Unit Price")] || row[headers.indexOf("unit_price")] || "0",
                  ),
                },
              ],
            }

            await supabaseStore.createReturn(returnData)
            imported++
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : "Unknown error"}`)
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
              Select a CSV file to import data. The system will auto-detect the data type based on column headers.
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
                <h4 className="font-medium mb-2">Data Validation</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• SKUs should be unique within the file</li>
                  <li>• Quantities and costs must be positive numbers</li>
                  <li>• Dates should be in YYYY-MM-DD format</li>
                  <li>• Status values must match predefined options</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Error Handling</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Invalid rows will be skipped and reported</li>
                  <li>• Partial imports are possible if some rows are valid</li>
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
