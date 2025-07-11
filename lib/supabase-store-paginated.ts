/**
 * Enhanced inventory functions with pagination support
 */

import { supabase } from "./supabase"
import type { InventoryItem } from "./supabase-store"

interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Get inventory with pagination and search
 */
export async function getInventoryPaginated(
  page = 1,
  pageSize = 50,
  searchTerm?: string,
  sortBy = "sku",
  sortOrder: "asc" | "desc" = "asc",
): Promise<PaginatedResult<InventoryItem>> {
  try {
    let query = supabase.from("inventory").select("*", { count: "exact" })

    // Add search filter
    if (searchTerm) {
      query = query.or(`sku.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`)
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" })

    // Add pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    // Transform data to match InventoryItem interface
    const inventoryItems: InventoryItem[] = (data || []).map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.product_name,
      inStock: item.quantity_available,
      incoming: 0, // Would need to calculate from pending POs
      reserved: 0, // Would need to calculate from pending orders
      unitCost: item.unit_cost_with_delivery,
    }))

    return {
      data: inventoryItems,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    }
  } catch (error) {
    console.error("Error fetching paginated inventory:", error)
    throw error
  }
}

/**
 * Get inventory count by status
 */
export async function getInventoryStats(): Promise<{
  total: number
  lowStock: number
  outOfStock: number
  totalValue: number
}> {
  try {
    const { data, error } = await supabase.from("inventory").select("quantity_available, unit_cost_with_delivery")

    if (error) throw error

    const stats = (data || []).reduce(
      (acc, item) => {
        acc.total += 1
        if (item.quantity_available === 0) acc.outOfStock += 1
        else if (item.quantity_available <= 10) acc.lowStock += 1
        acc.totalValue += item.quantity_available * item.unit_cost_with_delivery
        return acc
      },
      { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
    )

    return stats
  } catch (error) {
    console.error("Error fetching inventory stats:", error)
    throw error
  }
}
