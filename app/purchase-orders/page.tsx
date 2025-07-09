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
import { Package, DollarSign, TrendingUp, Clock, FileX, RefreshCw, Plus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface POItem {
  id: number
  po_id: number
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  created_at: string
}

interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost: number
  status: "Pending" | "Approved" | "Delivered" | "Cancelled"
  notes?: string
  created_at: string
  updated_at: string
  items?: POItem[]
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchPurchaseOrders(currentPage)
  }, [currentPage])

  const fetchPurchaseOrders = async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔄 Fetching purchase orders for page ${page}...`)

      const response = await fetch(`/api/purchase-orders?page=${page}&limit=${itemsPerPage}`)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result = await response.json()
      console.log("✅ Received purchase orders:", result)

      setPurchaseOrders(result.data || [])
      setTotalItems(result.total || 0)
      setTotalPages(Math.ceil((result.total || 0) / itemsPerPage))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("❌ Fetch error:", err)
      setError(errorMessage)
      toast.error("Failed to fetch purchase orders: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number | string | null | undefined): string => {
    // Convert to number first, handling all possible input types
    let numericAmount: number

    if (amount === null || amount === undefined) {
      numericAmount = 0
    } else if (typeof amount === "string") {
      numericAmount = Number.parseFloat(amount) || 0
    } else if (typeof amount === "number") {
      numericAmount = amount
    } else {
      numericAmount = 0
    }

    return numericAmount.toFixed(2)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800"
      case "Approved":
        return "bg-blue-100 text-blue-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const calculateTotalValue = () => {
    return purchaseOrders.reduce((sum, po) => {
      const itemsTotal = po.items?.reduce((itemSum, item) => itemSum + (item.total_cost || 0), 0) || 0
      return sum + itemsTotal + (po.delivery_cost || 0)
    }, 0)
  }

  const getPendingOrders = () => {
    return purchaseOrders.filter((po) => po.status === "Pending").length
  }

  const getDeliveredOrders = () => {
    return purchaseOrders.filter((po) => po.status === "Delivered").length
  }

  const getTotalItems = () => {
    return purchaseOrders.reduce((sum, po) => {
      return sum + (po.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0)
    }, 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading purchase orders...</p>
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
            <Button onClick={() => fetchPurchaseOrders(currentPage)}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-gray-600">Manage and track purchase orders from suppliers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchPurchaseOrders(currentPage)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getPendingOrders()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getDeliveredOrders()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatAmount(calculateTotalValue())}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {totalItems > 0
              ? `Overview of all purchase orders. Showing ${purchaseOrders.length} of ${totalItems} orders.`
              : "No purchase orders found in the database."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <div className="text-center py-16">
              <FileX className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Purchase Orders</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                There are currently no purchase orders in the database. Create your first purchase order to get started.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Purchase Order
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => {
                      const itemsTotal = po.items?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0
                      const totalWithDelivery = itemsTotal + (po.delivery_cost || 0)

                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.po_number}</TableCell>
                          <TableCell>{po.supplier_name}</TableCell>
                          <TableCell>{formatDate(po.po_date)}</TableCell>
                          <TableCell>
                            {po.items?.length || 0} item{(po.items?.length || 0) !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell>${formatAmount(itemsTotal)}</TableCell>
                          <TableCell>${formatAmount(po.delivery_cost)}</TableCell>
                          <TableCell className="font-medium">${formatAmount(totalWithDelivery)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
