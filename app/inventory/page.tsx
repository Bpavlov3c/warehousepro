"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, AlertTriangle, TrendingDown, DollarSign, FileX, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface ProductInventorySummary {
  sku: string
  name: string
  current_stock: number
  avg_cost: number
  total_value: number
  min_stock: number
  max_stock: number
}

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<ProductInventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchInventoryItems(currentPage)
  }, [currentPage])

  const fetchInventoryItems = async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔄 Fetching inventory items for page ${page}...`)

      const response = await fetch(`/api/inventory?page=${page}&limit=${itemsPerPage}`)

      // Helper to safely extract the body regardless of Content-Type
      const safeParse = async () => {
        try {
          if (response.headers.get("content-type")?.includes("application/json")) {
            return await response.json()
          }
          return await response.text()
        } catch {
          return await response.text()
        }
      }

      if (!response.ok) {
        const errorPayload = await safeParse()
        const message =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.details || errorPayload?.error || `HTTP error! status: ${response.status}`
        throw new Error(message)
      }

      const result = await safeParse()
      console.log("✅ Received data:", result)

      setInventoryItems(result.data || [])
      setTotalItems(result.total || 0)
      setTotalPages(Math.ceil((result.total || 0) / itemsPerPage))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("❌ Fetch error:", err)
      setError(errorMessage)
      toast.error("Failed to fetch inventory items: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number | null | undefined): string => {
    const safePrice = price || 0
    return safePrice.toFixed(2)
  }

  const getLowStockItems = () => {
    return inventoryItems.filter((item) => item.current_stock <= item.min_stock)
  }

  const getTotalValue = () => {
    return inventoryItems.reduce((sum, item) => sum + item.total_value, 0)
  }

  const getTotalStock = () => {
    return inventoryItems.reduce((sum, item) => sum + item.current_stock, 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading inventory summary...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchInventoryItems(currentPage)}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Overview</h1>
          <p className="text-gray-600">Track product inventory levels with FIFO cost tracking</p>
        </div>
        <Button onClick={() => fetchInventoryItems(currentPage)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getLowStockItems().length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatPrice(getTotalValue())}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Units</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalStock().toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {getLowStockItems().length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-red-600">
              {getLowStockItems().length} product(s) are at or below their minimum stock level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getLowStockItems()
                .slice(0, 3)
                .map((item) => (
                  <div key={item.sku} className="flex justify-between items-center">
                    <span className="font-medium">
                      {item.name} ({item.sku})
                    </span>
                    <Badge variant="destructive">
                      {item.current_stock} / {item.min_stock}
                    </Badge>
                  </div>
                ))}
              {getLowStockItems().length > 3 && (
                <p className="text-sm text-red-600">And {getLowStockItems().length - 3} more items...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory Summary</CardTitle>
          <CardDescription>
            {totalItems > 0
              ? `Overview of all products with current stock levels and FIFO-based average costs. Showing ${inventoryItems.length} of ${totalItems} products.`
              : "No products found in the database."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <div className="text-center py-16">
              <FileX className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Products Available</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                There are currently no products in the database. Products are created automatically when you add
                purchase order items, or you can create them manually.
              </p>
              <Button asChild>
                <a href="/purchase-orders">Create Purchase Order</a>
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Max Stock</TableHead>
                      <TableHead>Avg Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.current_stock}</TableCell>
                        <TableCell>{item.min_stock}</TableCell>
                        <TableCell>{item.max_stock}</TableCell>
                        <TableCell>${formatPrice(item.avg_cost)}</TableCell>
                        <TableCell>${formatPrice(item.total_value)}</TableCell>
                        <TableCell>
                          {item.current_stock <= item.min_stock ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : item.current_stock >= item.max_stock ? (
                            <Badge className="bg-blue-100 text-blue-800">High Stock</Badge>
                          ) : (
                            <Badge variant="secondary">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) setCurrentPage(currentPage - 1)
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(page)
                            }}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
