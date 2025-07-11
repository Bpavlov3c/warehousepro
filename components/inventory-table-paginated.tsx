"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { getInventoryPaginated, type PaginatedResult } from "@/lib/supabase-store-paginated"
import type { InventoryItem } from "@/lib/supabase-store"

interface InventoryTableProps {
  onItemSelect?: (item: InventoryItem) => void
}

export function InventoryTablePaginated({ onItemSelect }: InventoryTableProps) {
  const [data, setData] = useState<PaginatedResult<InventoryItem>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: false,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("sku")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    loadData()
  }, [data.page, data.pageSize, searchTerm, sortBy, sortOrder])

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await getInventoryPaginated(data.page, data.pageSize, searchTerm || undefined, sortBy, sortOrder)
      setData(result)
    } catch (error) {
      console.error("Error loading inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setData((prev) => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handlePageChange = (newPage: number) => {
    setData((prev) => ({ ...prev, page: newPage }))
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setData((prev) => ({
      ...prev,
      page: 1,
      pageSize: Number.parseInt(newPageSize),
    }))
  }

  const getStockStatus = (item: InventoryItem) => {
    const available = item.inStock - item.reserved
    if (available <= 0) return { status: "Out of Stock", variant: "destructive" as const }
    if (available <= 10) return { status: "Low Stock", variant: "secondary" as const }
    return { status: "In Stock", variant: "default" as const }
  }

  const totalPages = Math.ceil(data.total / data.pageSize)

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sku">SKU</SelectItem>
              <SelectItem value="product_name">Name</SelectItem>
              <SelectItem value="quantity_available">Stock</SelectItem>
              <SelectItem value="unit_cost_with_delivery">Cost</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of{" "}
            {data.total}
          </span>

          <Select value={data.pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Incoming</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  {searchTerm ? "No items match your search." : "No inventory items found."}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((item) => {
                const available = item.inStock - item.reserved
                const status = getStockStatus(item)
                const totalValue = item.inStock * item.unitCost

                return (
                  <TableRow
                    key={item.id}
                    className={onItemSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onItemSelect?.(item)}
                  >
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.inStock.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.incoming.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.reserved.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{available.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${totalValue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {data.page} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(data.page - 1)} disabled={data.page <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button variant="outline" size="sm" onClick={() => handlePageChange(data.page + 1)} disabled={!data.hasMore}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
