"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileText, CheckCircle, AlertCircle, Download, Trash2 } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

interface ImportRecord {
  row: number
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  supplier_name: string
  date: string
  status: "pending" | "success" | "error"
  error?: string
}

interface ValidationError {
  row: number
  field: string
  value: any
  message: string
}

export default function ImportData() {
  const [importType, setImportType] = useState<"inventory" | "purchase-orders" | "shopify-orders">("inventory")
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<string>("")
  const [records, setRecords] = useState<ImportRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    errors: number
    total: number
  } | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile && uploadedFile.type === "text/csv") {
      setFile(uploadedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCsvData(content)
        parseCSV(content)
      }
      reader.readAsText(uploadedFile)
    }
  }

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "") {
      throw new Error("Date is required")
    }

    const trimmed = dateStr.trim()

    // Try different date formats
    const formats = [
      // DD-MM-YY or DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // DD/MM/YY or DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // MM/DD/YY or MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // YYYY-MM-DD (ISO format)
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ]

    // Check ISO format first (YYYY-MM-DD)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      if (!isNaN(date.getTime())) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }

    // Try DD-MM-YY or DD-MM-YYYY format
    const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/)
    if (dashMatch) {
      let [, day, month, year] = dashMatch

      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = Number.parseInt(year)
        year = yearNum < 50 ? `20${year}` : `19${year}`
      }

      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      if (!isNaN(date.getTime()) && date.getFullYear() == Number.parseInt(year)) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }

    // Try DD/MM/YY or DD/MM/YYYY format
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (slashMatch) {
      let [, day, month, year] = slashMatch

      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = Number.parseInt(year)
        year = yearNum < 50 ? `20${year}` : `19${year}`
      }

      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      if (!isNaN(date.getTime()) && date.getFullYear() == Number.parseInt(year)) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }

    // Try MM/DD/YYYY format (US format)
    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (usMatch) {
      const [, month, day, year] = usMatch
      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      if (!isNaN(date.getTime()) && date.getFullYear() == Number.parseInt(year)) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      }
    }

    // Try parsing as a standard date
    const parsedDate = new Date(trimmed)
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear()
      const month = (parsedDate.getMonth() + 1).toString().padStart(2, "0")
      const day = parsedDate.getDate().toString().padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    throw new Error(`Invalid date format: ${dateStr}. Expected formats: DD-MM-YY, DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY`)
  }

  const parseCSV = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim())
    if (lines.length < 2) return

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    const records: ImportRecord[] = []
    const errors: ValidationError[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
      const rowNum = i + 1

      try {
        if (importType === "inventory") {
          // Expected columns: sku, product_name, quantity, unit_cost, supplier_name, date
          const record: ImportRecord = {
            row: rowNum,
            sku: values[0] || "",
            product_name: values[1] || "",
            quantity: Number.parseFloat(values[2]) || 0,
            unit_cost: Number.parseFloat(values[3]?.replace("$", "")) || 0,
            supplier_name: values[4] || "",
            date: "",
            status: "pending",
          }

          // Validate and normalize date
          try {
            record.date = normalizeDate(values[5] || "")
          } catch (dateError) {
            errors.push({
              row: rowNum,
              field: "date",
              value: values[5],
              message: (dateError as Error).message,
            })
            record.status = "error"
            record.error = `Date error: ${(dateError as Error).message}`
          }

          // Validate required fields
          if (!record.sku) {
            errors.push({
              row: rowNum,
              field: "sku",
              value: values[0],
              message: "SKU is required",
            })
            record.status = "error"
            record.error = "SKU is required"
          }

          if (!record.product_name) {
            errors.push({
              row: rowNum,
              field: "product_name",
              value: values[1],
              message: "Product name is required",
            })
            record.status = "error"
            record.error = "Product name is required"
          }

          if (record.quantity <= 0) {
            errors.push({
              row: rowNum,
              field: "quantity",
              value: values[2],
              message: "Quantity must be greater than 0",
            })
            record.status = "error"
            record.error = "Invalid quantity"
          }

          if (record.unit_cost <= 0) {
            errors.push({
              row: rowNum,
              field: "unit_cost",
              value: values[3],
              message: "Unit cost must be greater than 0",
            })
            record.status = "error"
            record.error = "Invalid unit cost"
          }

          records.push(record)
        }
      } catch (error) {
        console.error(`Error parsing row ${rowNum}:`, error)
        errors.push({
          row: rowNum,
          field: "general",
          value: lines[i],
          message: `Parse error: ${(error as Error).message}`,
        })
      }
    }

    setRecords(records)
    setValidationErrors(errors)
  }

  const handleImport = async () => {
    if (records.length === 0) return

    setImporting(true)
    setProgress(0)

    const validRecords = records.filter((r) => r.status !== "error")
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i]

      try {
        if (importType === "inventory") {
          await supabaseStore.addManualInventory({
            sku: record.sku,
            name: record.product_name,
            quantity: record.quantity,
            unitCost: record.unit_cost,
          })
        }

        record.status = "success"
        successCount++
      } catch (error) {
        console.error(`Error importing record ${record.row}:`, error)
        record.status = "error"
        record.error = (error as Error).message
        errorCount++
      }

      setProgress(((i + 1) / validRecords.length) * 100)
      setRecords([...records]) // Trigger re-render
    }

    setImportResults({
      success: successCount,
      errors: errorCount,
      total: validRecords.length,
    })

    setImporting(false)
  }

  const clearData = () => {
    setFile(null)
    setCsvData("")
    setRecords([])
    setValidationErrors([])
    setImportResults(null)
    setProgress(0)
  }

  const downloadTemplate = () => {
    let template = ""

    if (importType === "inventory") {
      template =
        "sku,product_name,quantity,unit_cost,supplier_name,date\nSKU001,Sample Product,10,15.50,Sample Supplier,2024-01-15\nSKU002,Another Product,25,8.75,Another Supplier,15-01-24"
    } else if (importType === "purchase-orders") {
      template =
        "po_number,supplier_name,po_date,status,delivery_cost,sku,product_name,quantity,unit_cost\nPO-001,Supplier A,2024-01-15,Pending,50.00,SKU001,Product 1,10,15.50"
    } else if (importType === "shopify-orders") {
      template =
        "order_number,customer_name,customer_email,order_date,total_amount,sku,product_name,quantity,unit_price\nORD-001,John Doe,john@example.com,2024-01-15,150.00,SKU001,Product 1,2,75.00"
    }

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${importType}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Import Data</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Import Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
            <CardDescription>Select the type of data you want to import and upload your CSV file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Import Type</Label>
                <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">Inventory Items</SelectItem>
                    <SelectItem value="purchase-orders">Purchase Orders</SelectItem>
                    <SelectItem value="shopify-orders">Shopify Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CSV File</Label>
                <Input type="file" accept=".csv" onChange={handleFileUpload} className="cursor-pointer" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              {(file || csvData) && (
                <Button variant="outline" onClick={clearData}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Data
                </Button>
              )}
            </div>

            {file && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  File uploaded: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Manual CSV Input */}
        {!file && (
          <Card>
            <CardHeader>
              <CardTitle>Manual CSV Input</CardTitle>
              <CardDescription>Alternatively, paste your CSV data directly</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your CSV data here..."
                value={csvData}
                onChange={(e) => {
                  setCsvData(e.target.value)
                  if (e.target.value.trim()) {
                    parseCSV(e.target.value)
                  }
                }}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Validation Errors ({validationErrors.length})
              </CardTitle>
              <CardDescription>Please fix these errors before importing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {validationErrors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertDescription>
                      Row {error.row}, Field "{error.field}": {error.message}
                      {error.value && ` (Value: "${error.value}")`}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Data */}
        {records.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Data ({records.length} records)</CardTitle>
                  <CardDescription>Review the data before importing</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{records.filter((r) => r.status === "pending").length} Ready</Badge>
                  <Badge variant="destructive">{records.filter((r) => r.status === "error").length} Errors</Badge>
                  {importResults && <Badge variant="default">{importResults.success} Imported</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.row}>
                        <TableCell>{record.row}</TableCell>
                        <TableCell className="font-mono">{record.sku}</TableCell>
                        <TableCell>{record.product_name}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>${record.unit_cost.toFixed(2)}</TableCell>
                        <TableCell>{record.supplier_name}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>
                          {record.status === "pending" && <Badge variant="secondary">Ready</Badge>}
                          {record.status === "success" && (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {record.status === "error" && (
                            <Badge variant="destructive" title={record.error}>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Progress */}
        {importing && (
          <Card>
            <CardHeader>
              <CardTitle>Importing Data...</CardTitle>
              <CardDescription>Please wait while we import your data</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">{progress.toFixed(0)}% complete</p>
            </CardContent>
          </Card>
        )}

        {/* Import Results */}
        {importResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Import Complete
              </CardTitle>
              <CardDescription>Import operation finished</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{importResults.total}</div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Actions */}
        {records.length > 0 && !importing && (
          <Card>
            <CardHeader>
              <CardTitle>Import Actions</CardTitle>
              <CardDescription>Start the import process or make adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleImport}
                  disabled={records.filter((r) => r.status === "pending").length === 0}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import {records.filter((r) => r.status === "pending").length} Records
                </Button>
                <Button variant="outline" onClick={clearData}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>

              {validationErrors.length > 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    There are {validationErrors.length} validation errors. Only valid records will be imported.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
            <CardDescription>Guidelines for preparing your CSV files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Inventory Items Format:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>
                    &bull; <strong>sku</strong>: Unique product identifier (required)
                  </li>
                  <li>
                    &bull; <strong>product_name</strong>: Product name (required)
                  </li>
                  <li>
                    &bull; <strong>quantity</strong>: Number of items (required, must be &gt; 0)
                  </li>
                  <li>
                    &bull; <strong>unit_cost</strong>: Cost per unit in dollars (required, must be &gt; 0)
                  </li>
                  <li>
                    &bull; <strong>supplier_name</strong>: Supplier name (optional)
                  </li>
                  <li>
                    &bull; <strong>date</strong>: Purchase date (required, formats: DD-MM-YY, DD/MM/YYYY, YYYY-MM-DD,
                    MM/DD/YYYY)
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Supported Date Formats:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>&bull; DD-MM-YY (e.g., 15-01-24)</li>
                  <li>&bull; DD/MM/YYYY (e.g., 15/01/2024)</li>
                  <li>&bull; YYYY-MM-DD (e.g., 2024-01-15)</li>
                  <li>&bull; MM/DD/YYYY (e.g., 01/15/2024)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tips:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>&bull; Download the template to ensure correct format</li>
                  <li>&bull; Remove any currency symbols from cost fields</li>
                  <li>&bull; Ensure all required fields are filled</li>
                  <li>&bull; Use consistent date formatting throughout your file</li>
                  <li>&bull; Check for validation errors before importing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
