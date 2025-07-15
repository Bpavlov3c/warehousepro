"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { supabaseStore } from "@/lib/supabase-store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import dynamic from "next/dynamic"

const ShopifyOrdersClientComponent = dynamic(() => import("@/components/shopify-orders-client"), {
  ssr: false,
})

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Skeleton components
const StatCardSkeleton = () => (
  <Card className="p-3">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
      </div>
      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </Card>
)

const TableSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(10)].map((_, i) => (
            <TableRow key={i} className="h-12">
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

export default async function ShopifyOrdersPage() {
  // Load initial 20 orders for fast page load
  const result = await supabaseStore.getShopifyOrders({ limit: 20, offset: 0 })

  return (
    <ShopifyOrdersClientComponent
      initialOrders={result.data}
      initialTotal={result.total}
      initialHasMore={result.hasMore}
    />
  )
}
