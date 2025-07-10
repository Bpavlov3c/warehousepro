"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

interface ImportResult {
  success: boolean
  message: string
  poCount?: number
  itemCount?: number
  errors?: string[]
}

export default function ImportData() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
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
    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0])
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || ""
        })
        data.push(row)
      }
    }

    return data
  }

  const parseCSVLine = (line: string): string[] => {
    const result = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }

    result.push(current)
    return result
  }

  const findColumn = (headers: string[], possibleNames: string[]): string | null => {
    const headerLower = headers.map((h) => h.toLowerCase())
    for (const name of possibleNames) {
      const index = headerLower.findIndex((h) => h.includes(name.toLowerCase()))
      if (index !== -1) return headers[index]
    }
    return null
  }

  const parseNumber = (value: string): number => {
    if (!value) return 0
    // Remove currency symbols, commas, and other non-numeric characters except decimal points
    const cleaned = value.replace(/[^\d.-]/g, "")
    const parsed = Number.parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      const csvText = await file.text()
      console.log("CSV content:", csvText.substring(0, 500))

      const rawData = parseCSV(csvText)
      console.log("Parsed CSV data:", rawData.slice(0, 3))

      if (rawData.length === 0) {
        throw new Error("No data found in CSV file")
      }

      // Get headers for column detection
      const headers = Object.keys(rawData[0])
      console.log("CSV headers:", headers)

      // Find column mappings
      const skuColumn = findColumn(headers, ["Product ID", "SKU", "sku", "product_id", "id"])
      const nameColumn = findColumn(headers, ["Product Name", "product_name", "name", "title"])
      const quantityColumn = findColumn(headers, ["Quantity", "quantity", "qty", "Quantity Purchased"])
      const priceColumn = findColumn(headers, ["Price", "price", "unit_cost", "Purchase Price", "cost"])
      const dateColumn = findColumn(headers, ["Date", "date", "PO Date", "po_date", "purchase_date"])
      const deliveryColumn = findColumn(headers, ["Delivery Cost", "delivery_cost", "shipping", "delivery"])
      const supplierColumn = findColumn(headers, ["Supplier", "supplier", "vendor", "supplier_name"])

      console.log("Column mappings:", {
        sku: skuColumn,
        name: nameColumn,
        quantity: quantityColumn,
        price: priceColumn,
        date: dateColumn,
        delivery: deliveryColumn,
        supplier: supplierColumn,
      })

      if (!skuColumn || !nameColumn || !quantityColumn || !priceColumn) {
        throw new Error(
          "Required columns not found. Please ensure your CSV has SKU, Product Name, Quantity, and Price columns.",
        )
      }

      // Process and group data by supplier and date
      const poGroups = new Map<string, any>()

      rawData.forEach((row, index) => {
        const sku = row[skuColumn]
        const name = row[nameColumn]
        const quantity = parseNumber(row[quantityColumn])
        const price = parseNumber(row[priceColumn])
        const date = dateColumn ? row[dateColumn] : new Date().toISOString().split("T")[0]
        const delivery = deliveryColumn ? parseNumber(row[deliveryColumn]) : 0
        const supplier = supplierColumn ? row[supplierColumn] : "Unknown Supplier"

        console.log(`Row ${index + 1}:`, {
          sku,
          name,
          quantity,
          price,
          date,
          delivery,
          supplier,
        })

        if (!sku || !name || quantity <= 0 || price <= 0) {
          console.warn(`Skipping invalid row ${index + 1}:`, row)
          return
        }

        // Group by supplier and date
        const groupKey = `${supplier}-${date}`

        if (!poGroups.has(groupKey)) {
          poGroups.set(groupKey, {
            supplier_name: supplier,
            po_date: date,
            delivery_cost: delivery,
            items: [],
          })
        }

        const group = poGroups.get(groupKey)
        group.items.push({
          sku,
          product_name: name,
          quantity,
          unit_cost: price,
        })

        // Update delivery cost if this row has a higher value
        if (delivery > group.delivery_cost) {
          group.delivery_cost = delivery
        }
      })

      console.log("Grouped POs:", Array.from(poGroups.values()))

      if (poGroups.size === 0) {
        throw new Error("No valid purchase orders could be created from the data")
      }

      // Create purchase orders
      const createdPOs = []
      const errors = []
      let processedCount = 0

      for (const [groupKey, poData] of poGroups) {
        try {
          console.log(`Creating PO for group ${groupKey}:`, poData)

          const createdPO = await supabaseStore.createPurchaseOrder({
            supplier_name: poData.supplier_name,
            po_date: poData.po_date,
            status: "Delivered", // Import as delivered to add to inventory
            delivery_cost: poData.delivery_cost,
            items: poData.items,
            notes: `Imported from CSV on ${new Date().toLocaleDateString()}`,
          })

          createdPOs.push(createdPO)
          console.log(`Successfully created PO: ${createdPO.po_number}`)
        } catch (error) {
          console.error(`Error creating PO for group ${groupKey}:`, error)
          errors.push(`Failed to create PO for ${poData.supplier_name}: ${error}`)
        }

        processedCount++
        setProgress((processedCount / poGroups.size) * 100)
      }

      const totalItems = createdPOs.reduce((sum, po) => sum + po.items.length, 0)

      setResult({
        success: createdPOs.length > 0,
        message:
          createdPOs.length > 0
            ? `Successfully imported ${createdPOs.length} purchase orders with ${totalItems} items`
            : "No purchase orders were created",
        poCount: createdPOs.length,
        itemCount: totalItems,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      console.error("Import error:", error)
      setResult({
        success: false,
        message: `Import failed: ${error}`,
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      ["Product ID", "Product Name", "Quantity Purchased", "Purchase Price", "PO Date", "Delivery Cost", "Supplier"],
      ["WH-001", "Widget A", "100", "15.50", "2024-01-15", "25.00", "Supplier ABC"],
      ["WH-002", "Widget B", "50", "22.75", "2024-01-15", "25.00", "Supplier ABC"],
      ["WH-003", "Widget C", "75", "18.25", "2024-01-16", "30.00", "Supplier XYZ"],
    ]

    const csvContent = sampleData.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "sample_purchase_orders.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Import Data</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Import Purchase Orders
              </CardTitle>
              <CardDescription>
                Upload a CSV file containing your purchase order data to automatically create POs and update inventory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={importing} />
              </div>

              {file && (
                <div className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm">Importing data...</div>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <Button onClick={handleImport} disabled={!file || importing} className="w-full">
                {importing ? "Importing..." : "Import Data"}
              </Button>

              {result && (
                <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                      {result.message}
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium">Errors:</div>
                          <ul className="list-disc list-inside text-sm">
                            {result.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Instructions Section */}
          <Card>
            <CardHeader>
              <CardTitle>CSV Format Requirements</CardTitle>
              <CardDescription>
                Your CSV file should contain the following columns (column names are flexible):
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="font-medium">Required Columns:</div>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>
                      • <strong>SKU/Product ID:</strong> Unique product identifier
                    </li>
                    <li>
                      • <strong>Product Name:</strong> Name of the product
                    </li>
                    <li>
                      • <strong>Quantity:</strong> Number of units purchased
                    </li>
                    <li>
                      • <strong>Price/Unit Cost:</strong> Cost per unit
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="font-medium">Optional Columns:</div>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>
                      • <strong>Date:</strong> Purchase order date
                    </li>
                    <li>
                      • <strong>Supplier:</strong> Supplier name
                    </li>
                    <li>
                      • <strong>Delivery Cost:</strong> Shipping/delivery cost
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={downloadSampleCSV} className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <strong>Note:</strong> Items with the same supplier and date will be grouped into a single purchase
                order. All imported POs will be marked as "Delivered" and items will be added to inventory
                automatically.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
