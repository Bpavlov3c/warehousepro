"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, FileText, AlertCircle, CheckCircle, Package } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

interface ParsedItem {
  sku: string
  productName: string
  quantity: number
  unitCost: number
  unitPrice?: number
  supplier?: string
  notes?: string
}

interface ImportResult {
  success: boolean
  message: string
  imported?: number
  errors?: string[]
}

export default function ImportPage() {
  const [csvData, setCsvData] = useState("")
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvData(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.trim().split("\n")
      if (lines.length < 2) {
        setErrors(["CSV must have at least a header row and one data row"])
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
      const items: ParsedItem[] = []
      const parseErrors: string[] = []

      // Find required column indices
      const skuIndex = headers.findIndex((h) => h.includes("sku"))
      const nameIndex = headers.findIndex((h) => h.includes("name") || h.includes("product"))
      const quantityIndex = headers.findIndex((h) => h.includes("quantity") || h.includes("qty"))
      const costIndex = headers.findIndex((h) => h.includes("cost") && !h.includes("price"))
      const priceIndex = headers.findIndex((h) => h.includes("price") && !h.includes("cost"))
      const supplierIndex = headers.findIndex((h) => h.includes("supplier"))
      const notesIndex = headers.findIndex((h) => h.includes("notes") || h.includes("comment"))

      if (skuIndex === -1) {
        parseErrors.push("SKU column not found. Expected column with 'sku' in the name.")
      }
      if (nameIndex === -1) {
        parseErrors.push("Product name column not found. Expected column with 'name' or 'product' in the name.")
      }
      if (quantityIndex === -1) {
        parseErrors.push("Quantity column not found. Expected column with 'quantity' or 'qty' in the name.")
      }
      if (costIndex === -1) {
        parseErrors.push("Unit cost column not found. Expected column with 'cost' in the name.")
      }

      if (parseErrors.length > 0) {
        setErrors(parseErrors)
        return
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((cell) => cell.trim().replace(/"/g, ""))

        if (row.length < headers.length) {
          parseErrors.push(`Row ${i + 1}: Not enough columns`)
          continue
        }

        const sku = row[skuIndex]?.trim()
        const productName = row[nameIndex]?.trim()
        const quantityStr = row[quantityIndex]?.trim()
        const costStr = row[costIndex]?.trim()

        // Validation - allow 0 quantity now
        if (!sku) {
          parseErrors.push(`Row ${i + 1}: SKU is required`)
          continue
        }
        if (!productName) {
          parseErrors.push(`Row ${i + 1}: Product name is required`)
          continue
        }

        const quantity = Number.parseFloat(quantityStr)
        const unitCost = Number.parseFloat(costStr)

        // Changed validation to allow quantity >= 0 instead of > 0
        if (Number.isNaN(quantity) || quantity < 0) {
          parseErrors.push(`Row ${i + 1}: Quantity must be a number >= 0`)
          continue
        }
        if (Number.isNaN(unitCost) || unitCost <= 0) {
          parseErrors.push(`Row ${i + 1}: Unit cost must be a positive number`)
          continue
        }

        const item: ParsedItem = {
          sku,
          productName,
          quantity,
          unitCost,
        }

        // Optional fields
        if (priceIndex !== -1 && row[priceIndex]) {
          const unitPrice = Number.parseFloat(row[priceIndex])
          if (!Number.isNaN(unitPrice)) {
            item.unitPrice = unitPrice
          }
        }
        if (supplierIndex !== -1 && row[supplierIndex]) {
          item.supplier = row[supplierIndex]
        }
        if (notesIndex !== -1 && row[notesIndex]) {
          item.notes = row[notesIndex]
        }

        items.push(item)
      }

      setParsedItems(items)
      setErrors(parseErrors)
    } catch (error) {
      setErrors([`Failed to parse CSV: ${error}`])
    }
  }

  const handleImport = async () => {
    if (parsedItems.length === 0) {
      setResult({ success: false, message: "No valid items to import" })
      return
    }

    setImporting(true)
    setResult(null)

    try {
      let imported = 0
      const importErrors: string[] = []

      for (const item of parsedItems) {
        try {
          await supabaseStore.addManualInventory({
            sku: item.sku,
            name: item.productName,
            quantity: item.quantity, // Now allows 0
            unitCost: item.unitCost,
          })
          imported++
        } catch (error) {
          importErrors.push(`Failed to import ${item.sku}: ${error}`)
        }
      }

      setResult({
        success: imported > 0,
        message: `Successfully imported ${imported} of ${parsedItems.length} items`,
        imported,
        errors: importErrors,
      })

      if (imported > 0) {
        // Clear form on successful import
        setCsvData("")
        setParsedItems([])
        setErrors([])
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Import failed: ${error}`,
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `SKU,Product Name,Quantity,Unit Cost,Unit Price,Supplier,Notes
"WIDGET-001","Premium Widget",50,12.50,25.00,"Acme Corp","High quality widget"
"GADGET-002","Smart Gadget",0,45.00,89.99,"Tech Supply","Pre-order item - 0 quantity"
"TOOL-003","Professional Tool",25,8.75,19.99,"Tool Co","Standard tool"`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "purchase_order_template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Upload className="h-5 w-5" />
          Import Purchase Orders
        </h1>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Instructions
            </CardTitle>
            <CardDescription>
              Upload a CSV file with your purchase order data to automatically add inventory items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Required Columns:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    • <strong>SKU</strong> - Product identifier
                  </li>
                  <li>
                    • <strong>Product Name</strong> - Item description
                  </li>
                  <li>
                    • <strong>Quantity</strong> - Number of units (can be 0 for pre-orders)
                  </li>
                  <li>
                    • <strong>Unit Cost</strong> - Cost per unit
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Optional Columns:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    • <strong>Unit Price</strong> - Selling price
                  </li>
                  <li>
                    • <strong>Supplier</strong> - Vendor name
                  </li>
                  <li>
                    • <strong>Notes</strong> - Additional information
                  </li>
                </ul>
              </div>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="w-full md:w-auto bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Select your purchase order CSV file to import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-file">CSV File</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={handleFileUpload} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="csv-data">Or paste CSV data directly:</Label>
              <Textarea
                id="csv-data"
                value={csvData}
                onChange={(e) => {
                  setCsvData(e.target.value)
                  if (e.target.value.trim()) {
                    parseCSV(e.target.value)
                  } else {
                    setParsedItems([])
                    setErrors([])
                  }
                }}
                placeholder="Paste your CSV data here..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Found {errors.length} error(s):</div>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {parsedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Preview ({parsedItems.length} items)
                </span>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : "Import Items"}
                </Button>
              </CardTitle>
              <CardDescription>
                Review the parsed data before importing. Items with 0 quantity are allowed for pre-orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>
                        {item.quantity === 0 ? (
                          <Badge variant="secondary">Pre-order</Badge>
                        ) : (
                          item.quantity.toLocaleString()
                        )}
                      </TableCell>
                      <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell>{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{item.supplier || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              <div className="font-medium">{result.message}</div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-medium">Errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
