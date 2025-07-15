/**
 * Centralised data-layer for the Warehouse Management System.
 * All pages talk to Supabase through this singleton module.
 */

import { createClient } from "@supabase/supabase-js"
import type { PostgrestError } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export interface InventoryItem {
  id: string
  sku: string
  name: string //  DB: product_name
  inStock: number //  DB: stock or in_stock
  incoming: number //  DB: incoming
  reserved: number //  DB: reserved
  unitCost: number //  DB: unit_cost
}

export interface PurchaseOrderItem {
  id?: string
  po_id: string
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_name: string
  po_date: string
  status: "Draft" | "Pending" | "In Transit" | "Delivered"
  delivery_cost: number
  notes?: string
  created_at: string
  items: PurchaseOrderItem[]
}

export interface ShopifyStore {
  id: string
  name: string
  shopifyDomain: string
  accessToken: string
  status: "Connected" | "Error" | "Testing" | "Disconnected"
  lastSync: string
  totalOrders: number
  monthlyRevenue: number
  webhookUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface StoreData {
  id: string
  name: string
  url: string
  api_key?: string
  api_secret?: string
  status: "Active" | "Inactive" | "Error"
  notes?: string
  created_at: string
  updated_at: string
}

export interface ShopifyOrderItem {
  id: string
  sku: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface ShopifyOrder {
  id: string
  storeId: string
  storeName: string
  shopifyOrderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  orderDate: string
  status: string
  totalAmount: number
  shippingCost: number
  taxAmount: number
  items: ShopifyOrderItem[]
  shippingAddress: string
  profit: number
  createdAt: string
  shipping_address: string
  total_amount: number
  shipping_cost: number
  tax_amount: number
}

export interface ShopifyOrderStats {
  totalOrders: number
  totalRevenue: number
  totalProfit: number
  avgOrderValue: number
}

export interface ReturnItem {
  id: string
  return_id: string
  sku: string
  product_name: string
  quantity: number
  condition: "Good" | "Used" | "Damaged" | "Defective"
  reason:
    | "Defective"
    | "Wrong Item"
    | "Not as Described"
    | "Changed Mind"
    | "Damaged in Transit"
    | "Quality Issues"
    | "Other"
  created_at: string
  total_refund?: number
  unit_price?: number
}

export interface Return {
  id: string
  return_number: string
  customer_name: string
  customer_email?: string
  order_number?: string
  return_date: string
  status: "Pending" | "Processing" | "Accepted" | "Rejected"
  notes?: string
  created_at: string
  updated_at: string
  return_items: ReturnItem[]
  total_refund?: number
}

/* -------------------------------------------------------------------------- */
/*                               Inventory APIs                               */
/* -------------------------------------------------------------------------- */

/**
 * Get the latest unit cost for each SKU from the most recent inventory record
 */
async function getLatestUnitCosts(): Promise<Map<string, number>> {
  try {
    // Get the most recent inventory record for each SKU
    const { data, error } = await supabase
      .from("inventory")
      .select("sku, unit_cost_with_delivery, purchase_date, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching latest unit costs:", error)
      return new Map()
    }

    const latestCosts = new Map<string, number>()

    // For each SKU, keep only the most recent cost (first occurrence due to ordering)
    data?.forEach((record) => {
      if (!latestCosts.has(record.sku)) {
        latestCosts.set(record.sku, record.unit_cost_with_delivery || 0)
      }
    })

    console.log("Latest unit costs:", Array.from(latestCosts.entries()))
    return latestCosts
  } catch (error) {
    console.error("Error in getLatestUnitCosts:", error)
    return new Map()
  }
}

/**
 * Calculate reserved quantities from pending/unshipped orders
 */
async function calculateReservedQuantities(): Promise<Map<string, number>> {
  try {
    console.log("Calculating reserved quantities from pending orders...")

    // Get all orders that are not fulfilled (pending, processing, unfulfilled, etc.)
    const { data: ordersData, error: ordersError } = await supabase
      .from("shopify_orders")
      .select(`
        id,
        status,
        shopify_order_items (
          sku,
          quantity
        )
      `)
      .not("status", "in", "(fulfilled,shipped,delivered,cancelled)")

    if (ordersError) {
      console.error("Error fetching pending orders:", ordersError)
      return new Map()
    }

    const reservedMap = new Map<string, number>()

    // Process each pending order
    ordersData?.forEach((order) => {
      order.shopify_order_items?.forEach((item) => {
        const existing = reservedMap.get(item.sku) || 0
        reservedMap.set(item.sku, existing + item.quantity)
      })
    })

    console.log("Reserved quantities calculated:", Array.from(reservedMap.entries()))
    return reservedMap
  } catch (error) {
    console.error("Error calculating reserved quantities:", error)
    return new Map()
  }
}

/**
 * Calculate inventory summary for each SKU including incoming stock from POs and reserved from orders
 */
async function calculateInventorySummary(): Promise<Map<string, InventoryItem>> {
  try {
    console.log("Calculating inventory summary...")

    // Get all inventory records (delivered items)
    const { data: inventoryData, error: invError } = await supabase
      .from("inventory")
      .select("sku, product_name, quantity_available, unit_cost_with_delivery, purchase_date, created_at")

    if (invError) {
      console.error("Error fetching inventory data:", invError)
      throw invError
    }

    console.log("Raw inventory data:", inventoryData)

    // Get all PO items with their status to calculate incoming stock
    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        status,
        po_items (
          sku,
          product_name,
          quantity
        )
      `)
      .in("status", ["Pending", "In Transit"])

    if (poError) {
      console.error("Error fetching PO data:", poError)
      throw poError
    }

    // Get latest unit costs and reserved quantities
    const [latestCosts, reservedQuantities] = await Promise.all([getLatestUnitCosts(), calculateReservedQuantities()])

    // Create inventory summary map
    const inventoryMap = new Map<string, InventoryItem>()

    // Process delivered inventory (in-stock items)
    // Group quantities by SKU
    const skuTotals = new Map<string, { totalQuantity: number; productName: string }>()

    inventoryData?.forEach((item) => {
      const existing = skuTotals.get(item.sku)
      if (existing) {
        existing.totalQuantity += item.quantity_available || 0
      } else {
        skuTotals.set(item.sku, {
          totalQuantity: item.quantity_available || 0,
          productName: item.product_name,
        })
      }
    })

    // Create inventory items with latest costs and reserved quantities
    skuTotals.forEach((totals, sku) => {
      const latestCost = latestCosts.get(sku) || 0
      const reserved = reservedQuantities.get(sku) || 0
      console.log(`SKU ${sku}: quantity=${totals.totalQuantity}, latest_cost=${latestCost}, reserved=${reserved}`)

      inventoryMap.set(sku, {
        id: `summary-${sku}`,
        sku: sku,
        name: totals.productName,
        inStock: totals.totalQuantity,
        incoming: 0,
        reserved: reserved,
        unitCost: latestCost,
      })
    })

    // Process incoming stock from pending/in-transit POs
    poData?.forEach((po) => {
      po.po_items?.forEach((item) => {
        const existing = inventoryMap.get(item.sku)
        if (existing) {
          existing.incoming += item.quantity || 0
        } else {
          // Create new entry for items that are only incoming
          const reserved = reservedQuantities.get(item.sku) || 0
          inventoryMap.set(item.sku, {
            id: `summary-${item.sku}`,
            sku: item.sku,
            name: item.product_name,
            inStock: 0,
            incoming: item.quantity || 0,
            reserved: reserved,
            unitCost: latestCosts.get(item.sku) || 0,
          })
        }
      })
    })

    // Add items that only have reserved quantities (no stock, no incoming)
    reservedQuantities.forEach((reserved, sku) => {
      if (!inventoryMap.has(sku)) {
        inventoryMap.set(sku, {
          id: `summary-${sku}`,
          sku: sku,
          name: `Product ${sku}`, // Default name for items only in orders
          inStock: 0,
          incoming: 0,
          reserved: reserved,
          unitCost: latestCosts.get(sku) || 0,
        })
      }
    })

    console.log("Final inventory summary:", Array.from(inventoryMap.values()))
    return inventoryMap
  } catch (error) {
    console.error("Error calculating inventory summary:", error)
    throw error
  }
}

/**
 * Fetch all inventory rows with calculated incoming stock and reserved quantities.
 */
async function getInventory(): Promise<InventoryItem[]> {
  try {
    const inventoryMap = await calculateInventorySummary()
    return Array.from(inventoryMap.values())
  } catch (error) {
    console.error("Error fetching inventory:", error)
    throw error
  }
}

/**
 * Manually add inventory (outside of a purchase-order).
 */
async function addManualInventory(item: {
  sku: string
  name: string
  quantity: number
  unitCost: number
}): Promise<InventoryItem> {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        sku: item.sku,
        product_name: item.name,
        quantity_available: item.quantity,
        unit_cost_with_delivery: item.unitCost,
        po_id: null, // Manual inventory doesn't have a PO
        purchase_date: new Date().toISOString().split("T")[0],
      })
      .select("id, sku, name:product_name, inStock:quantity_available, unitCost:unit_cost_with_delivery")
      .single()

    if (error) throw error

    return {
      ...data,
      incoming: 0,
      reserved: 0,
    }
  } catch (error) {
    console.error("Error adding manual inventory:", error)
    throw error
  }
}

/**
 * Add inventory from a delivered purchase order
 */
async function addInventoryFromPO(po: PurchaseOrder): Promise<void> {
  try {
    console.log("Adding inventory from delivered PO:", po.po_number)

    // Calculate total quantity for shipping cost distribution
    const totalQuantity = po.items.reduce((sum, item) => sum + item.quantity, 0)
    const shippingCostPerUnit = totalQuantity > 0 ? po.delivery_cost / totalQuantity : 0

    // Prepare inventory records for each item
    const inventoryRecords = po.items.map((item) => {
      const unitCostWithDelivery = item.unit_cost + shippingCostPerUnit

      return {
        sku: item.sku,
        product_name: item.product_name,
        po_id: po.id,
        quantity_available: item.quantity,
        unit_cost_with_delivery: unitCostWithDelivery,
        purchase_date: po.po_date,
      }
    })

    console.log("Inserting inventory records:", inventoryRecords)

    // Insert all inventory records
    const { data, error } = await supabase.from("inventory").insert(inventoryRecords).select()

    if (error) {
      console.error("Error adding inventory from PO:", error)
      throw error
    }

    console.log("Successfully added inventory records:", data)

    // Log the total quantities being added for each SKU
    const skuQuantities = new Map<string, number>()
    inventoryRecords.forEach((record) => {
      const existing = skuQuantities.get(record.sku) || 0
      skuQuantities.set(record.sku, existing + record.quantity_available)
    })

    console.log("Total quantities added by SKU:", Array.from(skuQuantities.entries()))
  } catch (error) {
    console.error("Error in addInventoryFromPO:", error)
    throw error
  }
}

/**
 * Attach `cost_price` to order items.
 * If a pre-loaded `costsMap` is supplied it's used directly, otherwise
 * the function fetches the map from Supabase.
 */
async function getOrderItemsWithCosts(
  orderItems: ShopifyOrderItem[],
  costsMap?: Map<string, number>,
): Promise<(ShopifyOrderItem & { cost_price: number })[]> {
  const latestCosts = costsMap ?? (await getLatestUnitCosts())

  return orderItems.map((item) => ({
    ...item,
    cost_price: latestCosts.get(item.sku) ?? 0,
  }))
}

/**
 * Calculate profit for an order using actual inventory costs
 */
function calculateOrderProfit(order: ShopifyOrder, costsMap: Map<string, number>): number {
  const itemsCost = order.items.reduce((sum, it) => sum + (costsMap.get(it.sku) ?? 0) * it.quantity, 0)

  // Profit = revenue – tax – shipping – item costs
  return (order.total_amount || 0) - (order.tax_amount || 0) - (order.shipping_cost || 0) - itemsCost
}

/* -------------------------------------------------------------------------- */
/*                          Purchase-Order (PO) APIs                          */
/* -------------------------------------------------------------------------- */

/** Return every purchase order + its line-items. */
async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    console.log("Fetching purchase orders...")

    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        supplier_name,
        po_date,
        status,
        delivery_cost,
        notes,
        created_at,
        po_items (
          id,
          po_id,
          sku,
          product_name,
          quantity,
          unit_cost,
          total_cost
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching purchase orders:", error)
      throw error
    }

    console.log("Fetched orders:", data)

    return (
      data?.map((order) => ({
        ...order,
        items: order.po_items || [],
      })) || []
    )
  } catch (error) {
    console.error("Error in getPurchaseOrders:", error)
    throw error
  }
}

/**
 * Create a new PO (header + items) with an auto-incrementing PO-number.
 */
async function createPurchaseOrder(data: {
  supplier_name: string
  po_date: string
  status: "Draft" | "Pending" | "In Transit" | "Delivered"
  delivery_cost: number
  items: Array<{
    sku: string
    product_name: string
    quantity: number
    unit_cost: number
  }>
  notes?: string
}): Promise<PurchaseOrder> {
  try {
    console.log("Creating purchase order with data:", data)

    const poNumber = generatePONumber()
    console.log("Generated PO number:", poNumber)

    // Insert the purchase order
    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        supplier_name: data.supplier_name,
        po_date: data.po_date,
        status: data.status,
        delivery_cost: data.delivery_cost,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (poError) {
      console.error("Error creating purchase order:", poError)
      throw poError
    }

    console.log("Created PO:", poData)

    // Insert the items
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        po_id: poData.id,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost,
      }))

      console.log("Inserting items:", itemsToInsert)

      const { data: itemsData, error: itemsError } = await supabase.from("po_items").insert(itemsToInsert).select()

      if (itemsError) {
        console.error("Error creating PO items:", itemsError)
        throw itemsError
      }

      console.log("Created items:", itemsData)

      const createdPO = {
        ...poData,
        items: (itemsData || []).map((row) => ({
          id: row.id,
          po_id: row.po_id,
          sku: row.sku,
          product_name: row.product_name,
          quantity: row.quantity,
          unit_cost: row.unit_cost,
          total_cost: row.total_cost,
        })),
      }

      // If the PO is created as "Delivered", add items to inventory
      if (data.status === "Delivered") {
        await addInventoryFromPO(createdPO)
      }

      return createdPO
    }

    return {
      ...poData,
      items: [],
    }
  } catch (error) {
    console.error("Error in createPurchaseOrder:", error)
    throw error
  }
}

/**
 * Update an existing purchase order
 */
async function updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> {
  try {
    console.log("Updating purchase order:", id, updates)

    // Get the current PO to check status change
    const { data: currentPO, error: fetchError } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        supplier_name,
        po_date,
        status,
        delivery_cost,
        notes,
        created_at,
        po_items (
          id,
          po_id,
          sku,
          product_name,
          quantity,
          unit_cost,
          total_cost
        )
      `)
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching current PO:", fetchError)
      throw fetchError
    }

    const previousStatus = currentPO.status
    const newStatus = updates.status

    // Update the PO
    const { data, error } = await supabase
      .from("purchase_orders")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        po_number,
        supplier_name,
        po_date,
        status,
        delivery_cost,
        notes,
        created_at,
        po_items (
          id,
          po_id,
          sku,
          product_name,
          quantity,
          unit_cost,
          total_cost
        )
      `)
      .single()

    if (error) {
      console.error("Error updating purchase order:", error)
      throw error
    }

    const updatedPO = {
      ...data,
      items: data.po_items || [],
    }

    // Handle status changes that affect inventory
    if (newStatus && previousStatus !== newStatus) {
      console.log(`PO status changed from ${previousStatus} to ${newStatus}`)

      // If changing TO "Delivered" from any other status
      if (newStatus === "Delivered" && previousStatus !== "Delivered") {
        console.log("PO status changed to Delivered, adding items to inventory")
        await addInventoryFromPO(updatedPO)
      }

      // If changing FROM "Delivered" to any other status
      if (previousStatus === "Delivered" && newStatus !== "Delivered") {
        console.log("PO status changed from Delivered, removing items from inventory")
        // Remove inventory records for this PO
        const { error: deleteError } = await supabase.from("inventory").delete().eq("po_id", id)

        if (deleteError) {
          console.error("Error removing inventory records:", deleteError)
          throw deleteError
        }
      }
    }

    return updatedPO
  } catch (error) {
    console.error("Error in updatePurchaseOrder:", error)
    throw error
  }
}

/**
 * Update an existing purchase order with items (comprehensive update)
 */
async function updatePurchaseOrderWithItems(
  id: string,
  data: {
    supplier_name?: string
    po_date?: string
    delivery_cost?: number
    notes?: string
    items?: Array<{
      sku: string
      product_name: string
      quantity: number
      unit_cost: number
    }>
  },
): Promise<PurchaseOrder | null> {
  try {
    console.log("Updating purchase order with items:", id, data)

    // Get the current PO to check status
    const { data: currentPO, error: fetchError } = await supabase
      .from("purchase_orders")
      .select("status")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching current PO status:", fetchError)
      throw fetchError
    }

    const isDelivered = currentPO.status === "Delivered"

    // Start a transaction-like approach
    // First, update the PO header
    const headerUpdates: any = {}
    if (data.supplier_name !== undefined) headerUpdates.supplier_name = data.supplier_name
    if (data.po_date !== undefined) headerUpdates.po_date = data.po_date
    if (data.delivery_cost !== undefined) headerUpdates.delivery_cost = data.delivery_cost
    if (data.notes !== undefined) headerUpdates.notes = data.notes

    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .update(headerUpdates)
      .eq("id", id)
      .select()
      .single()

    if (poError) {
      console.error("Error updating purchase order header:", poError)
      throw poError
    }

    console.log("Updated PO header:", poData)

    // If items are provided, replace all existing items
    if (data.items) {
      // If PO is delivered, remove old inventory records first
      if (isDelivered) {
        const { error: deleteInventoryError } = await supabase.from("inventory").delete().eq("po_id", id)

        if (deleteInventoryError) {
          console.error("Error deleting old inventory records:", deleteInventoryError)
          throw deleteInventoryError
        }
      }

      // Delete existing items
      const { error: deleteError } = await supabase.from("po_items").delete().eq("po_id", id)

      if (deleteError) {
        console.error("Error deleting existing PO items:", deleteError)
        throw deleteError
      }

      console.log("Deleted existing items")

      // Insert new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          po_id: id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.quantity * item.unit_cost,
        }))

        console.log("Inserting new items:", itemsToInsert)

        const { data: itemsData, error: itemsError } = await supabase.from("po_items").insert(itemsToInsert).select()

        if (itemsError) {
          console.error("Error creating new PO items:", itemsError)
          throw itemsError
        }

        console.log("Created new items:", itemsData)

        const updatedPO = {
          ...poData,
          items: (itemsData || []).map((row) => ({
            id: row.id,
            po_id: row.po_id,
            sku: row.sku,
            product_name: row.product_name,
            quantity: row.quantity,
            unit_cost: row.unit_cost,
            total_cost: row.total_cost,
          })),
        }

        // If PO is delivered, add new inventory records
        if (isDelivered) {
          console.log("PO is delivered and items were updated, adding new inventory records")
          await addInventoryFromPO(updatedPO)
        }

        return updatedPO
      }
    }

    // If no items provided, just return the updated PO with existing items
    const { data: fullPO, error: fullPOError } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        po_number,
        supplier_name,
        po_date,
        status,
        delivery_cost,
        notes,
        created_at,
        po_items (
          id,
          po_id,
          sku,
          product_name,
          quantity,
          unit_cost,
          total_cost
        )
      `)
      .eq("id", id)
      .single()

    if (fullPOError) {
      console.error("Error fetching updated PO:", fullPOError)
      throw fullPOError
    }

    return {
      ...fullPO,
      items: fullPO.po_items || [],
    }
  } catch (error) {
    console.error("Error in updatePurchaseOrderWithItems:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                               Store APIs                                   */
/* -------------------------------------------------------------------------- */

async function getStores(): Promise<StoreData[]> {
  try {
    console.log("Fetching stores from database...")

    const { data, error } = await supabase.from("shopify_stores").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching stores:", error)
      throw error
    }

    console.log("Raw store data from DB:", data)

    // Transform the data to match the expected StoreData interface
    const stores: StoreData[] = (data || []).map((store) => ({
      id: store.id,
      name: store.store_name,
      url: store.shopify_domain,
      api_key: store.access_token,
      api_secret: store.webhook_url, // Using webhook_url as api_secret for now
      status: store.status === "Connected" ? "Active" : store.status === "Error" ? "Error" : "Inactive",
      notes: store.notes,
      created_at: store.created_at,
      updated_at: store.updated_at,
    }))

    console.log("Transformed stores:", stores)
    return stores
  } catch (error) {
    console.error("Error in getStores:", error)
    throw error
  }
}

async function createStore(storeData: {
  name: string
  url: string
  api_key?: string
  api_secret?: string
  status: "Active" | "Inactive" | "Error"
  notes?: string
}): Promise<StoreData> {
  try {
    console.log("Creating store with data:", storeData)

    const { data, error } = await supabase
      .from("shopify_stores")
      .insert({
        store_name: storeData.name,
        shopify_domain: storeData.url,
        access_token: storeData.api_key || "",
        webhook_url: storeData.api_secret || "",
        status: storeData.status === "Active" ? "Connected" : storeData.status === "Error" ? "Error" : "Disconnected",
        notes: storeData.notes,
        total_orders: 0,
        monthly_revenue: 0,
        last_sync: "Never",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating store:", error)
      throw error
    }

    console.log("Created store:", data)

    return {
      id: data.id,
      name: data.store_name,
      url: data.shopify_domain,
      api_key: data.access_token,
      api_secret: data.webhook_url,
      status: data.status === "Active" ? "Active" : data.status === "Error" ? "Error" : "Inactive",
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  } catch (error) {
    console.error("Error in createStore:", error)
    throw error
  }
}

async function updateStore(id: string, updates: Partial<StoreData>): Promise<StoreData | null> {
  try {
    console.log("Updating store:", id, updates)

    const dbUpdates: any = {}
    if (updates.name) dbUpdates.store_name = updates.name
    if (updates.url) dbUpdates.shopify_domain = updates.url
    if (updates.api_key !== undefined) dbUpdates.access_token = updates.api_key
    if (updates.api_secret !== undefined) dbUpdates.webhook_url = updates.api_secret
    if (updates.status) {
      dbUpdates.status =
        updates.status === "Active" ? "Connected" : updates.status === "Error" ? "Error" : "Disconnected"
    }
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes

    const { data, error } = await supabase.from("shopify_stores").update(dbUpdates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating store:", error)
      throw error
    }

    console.log("Updated store:", data)

    return {
      id: data.id,
      name: data.store_name,
      url: data.shopify_domain,
      api_key: data.access_token,
      api_secret: data.webhook_url,
      status: data.status === "Active" ? "Active" : data.status === "Error" ? "Error" : "Inactive",
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  } catch (error) {
    console.error("Error in updateStore:", error)
    throw error
  }
}

async function deleteStore(id: string): Promise<void> {
  try {
    console.log("Deleting store:", id)

    // First delete related orders
    const { error: ordersError } = await supabase.from("shopify_orders").delete().eq("store_id", id)

    if (ordersError) {
      console.error("Error deleting related orders:", ordersError)
      // Don't throw here, continue with store deletion
    }

    // Then delete the store
    const { error } = await supabase.from("shopify_stores").delete().eq("id", id)

    if (error) {
      console.error("Error deleting store:", error)
      throw error
    }

    console.log("Store deleted successfully")
  } catch (error) {
    console.error("Error in deleteStore:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                               Shopify Store APIs                           */
/* -------------------------------------------------------------------------- */

async function getShopifyStores(): Promise<ShopifyStore[]> {
  try {
    const { data, error } = await supabase.from("shopify_stores").select("*").order("created_at", { ascending: false })

    if (error) throw error

    return (data || []).map((store) => ({
      id: store.id,
      name: store.store_name,
      shopifyDomain: store.shopify_domain,
      accessToken: store.access_token,
      status: store.status,
      lastSync: store.last_sync || "Never",
      totalOrders: store.total_orders || 0,
      monthlyRevenue: store.monthly_revenue || 0,
      webhookUrl: store.webhook_url,
      notes: store.notes,
      createdAt: store.created_at,
      updatedAt: store.updated_at,
    }))
  } catch (error) {
    console.error("Error fetching Shopify stores:", error)
    throw error
  }
}

async function createShopifyStore(storeData: {
  name: string
  shopify_domain: string
  access_token: string
  status: string
  webhook_url?: string
  notes?: string
}): Promise<ShopifyStore> {
  try {
    const { data, error } = await supabase
      .from("shopify_stores")
      .insert({
        store_name: storeData.name,
        shopify_domain: storeData.shopify_domain,
        access_token: storeData.access_token,
        status: storeData.status,
        webhook_url: storeData.webhook_url,
        notes: storeData.notes,
        total_orders: 0,
        monthly_revenue: 0,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.store_name,
      shopifyDomain: data.shopify_domain,
      accessToken: data.access_token,
      status: data.status,
      lastSync: "Never",
      totalOrders: 0,
      monthlyRevenue: 0,
      webhookUrl: data.webhook_url,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error("Error creating Shopify store:", error)
    throw error
  }
}

async function updateShopifyStore(id: string, updates: Partial<ShopifyStore>): Promise<ShopifyStore | null> {
  try {
    const dbUpdates: any = {}
    if (updates.name) dbUpdates.store_name = updates.name
    if (updates.shopifyDomain) dbUpdates.shopify_domain = updates.shopifyDomain
    if (updates.accessToken) dbUpdates.access_token = updates.accessToken
    if (updates.status) dbUpdates.status = updates.status
    if (updates.lastSync) dbUpdates.last_sync = updates.lastSync
    if (updates.totalOrders !== undefined) dbUpdates.total_orders = updates.totalOrders
    if (updates.monthlyRevenue !== undefined) dbUpdates.monthly_revenue = updates.monthlyRevenue
    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl
    if (updates.notes) dbUpdates.notes = updates.notes

    const { data, error } = await supabase.from("shopify_stores").update(dbUpdates).eq("id", id).select().single()

    if (error) throw error

    return {
      id: data.id,
      name: data.store_name,
      shopifyDomain: data.shopify_domain,
      accessToken: data.access_token,
      status: data.status,
      lastSync: data.last_sync || "Never",
      totalOrders: data.total_orders || 0,
      monthlyRevenue: data.monthly_revenue || 0,
      webhookUrl: data.webhook_url,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error("Error updating Shopify store:", error)
    throw error
  }
}

async function deleteShopifyStore(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("shopify_stores").delete().eq("id", id)
    if (error) throw error
  } catch (error) {
    console.error("Error deleting Shopify store:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                               Shopify Orders APIs                           */
/* -------------------------------------------------------------------------- */

interface PaginationOptions {
  limit?: number
  offset?: number
}

interface PaginatedResult<T> {
  data: T[]
  total: number
  hasMore: boolean
}

async function getShopifyOrders(options: PaginationOptions = {}): Promise<PaginatedResult<ShopifyOrder>> {
  try {
    const { limit = 20, offset = 0 } = options

    console.log(`Fetching Shopify orders with limit: ${limit}, offset: ${offset}`)

    /* 1 ▸ Get total count first */
    const { count, error: countError } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })

    if (countError) throw countError

    const total = count || 0

    /* 2 ▸ Grab paginated orders + items in a single call */
    const { data, error } = await supabase
      .from("shopify_orders")
      .select(
        `*,
         shopify_stores!inner(store_name),
         shopify_order_items (
           id,
           sku,
           product_name,
           quantity,
           unit_price,
           total_price
         )`,
      )
      .order("order_date", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    /* 3 ▸ Pull the latest unit-cost map ONCE */
    const latestCosts = await getLatestUnitCosts()

    /* 4 ▸ Enrich items with costs + compute profit */
    const orders = (data || []).map((row) => {
      const itemsWithCosts = (row.shopify_order_items || []).map((it) => ({
        ...it,
        cost_price: latestCosts.get(it.sku) ?? 0,
      }))

      const profit = calculateOrderProfit(
        {
          ...row,
          items: itemsWithCosts,
          total_amount: row.total_amount ?? 0,
          tax_amount: row.tax_amount ?? 0,
          shipping_cost: row.shipping_cost ?? 0,
        } as unknown as ShopifyOrder,
        latestCosts,
      )

      return {
        id: row.id,
        storeId: row.store_id,
        storeName: row.shopify_stores.store_name,
        shopifyOrderId: row.shopify_order_id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        orderDate: row.order_date,
        status: row.status,
        totalAmount: row.total_amount ?? 0,
        shippingCost: row.shipping_cost ?? 0,
        taxAmount: row.tax_amount ?? 0,
        items: itemsWithCosts,
        shippingAddress: row.shipping_address,
        profit,
        createdAt: row.created_at,
        shipping_address: row.shipping_address,
        total_amount: row.total_amount ?? 0,
        shipping_cost: row.shipping_cost ?? 0,
        tax_amount: row.tax_amount ?? 0,
      }
    })

    return {
      data: orders,
      total,
      hasMore: offset + limit < total,
    }
  } catch (err) {
    console.error("Error fetching Shopify orders:", err)
    throw err
  }
}

/**
 * Get summary statistics for all Shopify orders
 */
async function getShopifyOrderStats(): Promise<ShopifyOrderStats> {
  try {
    console.log("Calculating Shopify order statistics...")

    // Get all orders with their items for profit calculation
    const { data, error } = await supabase.from("shopify_orders").select(`
        total_amount,
        tax_amount,
        shipping_cost,
        shopify_order_items (
          sku,
          quantity
        )
      `)

    if (error) throw error

    const orders = data || []
    const totalOrders = orders.length

    if (totalOrders === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgOrderValue: 0,
      }
    }

    // Get latest unit costs for profit calculation
    const latestCosts = await getLatestUnitCosts()

    let totalRevenue = 0
    let totalProfit = 0

    orders.forEach((order) => {
      const revenue = order.total_amount || 0
      totalRevenue += revenue

      // Calculate cost of goods sold for this order
      const itemsCost = (order.shopify_order_items || []).reduce((sum, item) => {
        const unitCost = latestCosts.get(item.sku) || 0
        return sum + unitCost * item.quantity
      }, 0)

      // Profit = revenue - tax - shipping - cost of goods
      const profit = revenue - (order.tax_amount || 0) - (order.shipping_cost || 0) - itemsCost
      totalProfit += profit
    })

    const avgOrderValue = totalRevenue / totalOrders

    console.log("Order statistics calculated:", {
      totalOrders,
      totalRevenue,
      totalProfit,
      avgOrderValue,
    })

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      avgOrderValue,
    }
  } catch (error) {
    console.error("Error calculating order statistics:", error)
    throw error
  }
}

// Legacy function for backward compatibility
async function getAllShopifyOrders(): Promise<ShopifyOrder[]> {
  const result = await getShopifyOrders({ limit: 1000, offset: 0 })
  return result.data
}

/**
 * Insert / update Shopify orders + their line-items.
 *
 * 1. Upsert order **headers** into `shopify_orders`
 * 2. Insert line-items into `shopify_order_items`
 *    (existing items for that order are deleted first)
 */
async function addShopifyOrders(rawOrders: any[]): Promise<ShopifyOrder[]> {
  try {
    if (!rawOrders.length) return []

    /* ---------------------------------------------------- */
    /* 1 ▸ UPSERT ORDER HEADERS (strip the `items` array)   */
    /* ---------------------------------------------------- */
    const orderHeaders = rawOrders.map(({ items, ...header }) => ({
      ...header,
      profit: header.profit ?? 0, // default profit
    }))

    const { data: upserted, error: upsertErr } = await supabase
      .from("shopify_orders")
      /* match the UNIQUE(store_id, shopify_order_id) constraint in the schema */
      .upsert(orderHeaders, { onConflict: "store_id,shopify_order_id" })
      .select()

    if (upsertErr) throw upsertErr

    /* ----------------------------------------- */
    /* Map shopify_order_id → internal `id`      */
    /* ----------------------------------------- */
    const idMap = new Map<string, string>()
    upserted?.forEach((row: any) => {
      idMap.set(row.shopify_order_id, row.id)
    })

    /* ----------------------------------------- */
    /* 2 ▸ HANDLE LINE-ITEMS                     */
    /* ----------------------------------------- */
    // Build flat array of items with resolved order_id
    const itemRows = rawOrders.flatMap((ord) =>
      (ord.items || []).map((item: any) => ({
        order_id: idMap.get(ord.shopify_order_id),
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
    )

    if (itemRows.length) {
      // Delete any existing items for the affected orders (simple approach)
      const affectedOrderIds = Array.from(idMap.values())
      await supabase.from("shopify_order_items").delete().in("order_id", affectedOrderIds)

      // Insert fresh items
      const { error: itemErr } = await supabase.from("shopify_order_items").insert(itemRows)
      if (itemErr) throw itemErr
    }

    /* ----------------------------------------- */
    /* Return the upserted headers (no items)    */
    /* ----------------------------------------- */
    return upserted as ShopifyOrder[]
  } catch (e) {
    console.error("Error adding Shopify orders:", e)
    throw e
  }
}

/* -------------------------------------------------------------------------- */
/*                               Returns APIs                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all return orders and their items without relying on PostgREST joins.
 */
async function getReturns(): Promise<Return[]> {
  try {
    console.log("Fetching returns…")

    // 1. grab all return headers
    const { data: returnRows, error: returnsErr } = await supabase
      .from("returns")
      .select("*")
      .order("created_at", { ascending: false })

    if (returnsErr) throw returnsErr
    if (!returnRows?.length) return []

    // 2. collect the ids and pull all items in one query
    const ids = returnRows.map((r) => r.id)
    const { data: itemRows, error: itemsErr } = await supabase.from("return_items").select("*").in("return_id", ids)

    if (itemsErr) throw itemsErr

    // 3. group items by their return_id for fast lookup
    const itemMap = new Map<string, ReturnItem[]>()
    ;(itemRows || []).forEach((it) => {
      const list = itemMap.get(it.return_id) || []
      list.push({
        id: it.id,
        return_id: it.return_id,
        sku: it.sku,
        product_name: it.product_name,
        quantity: it.quantity,
        condition: it.condition,
        reason: it.reason,
        created_at: it.created_at,
        total_refund: it.total_refund ?? 0,
        unit_price: it.unit_price ?? 0,
      })
      itemMap.set(it.return_id, list)
    })

    // 4. stitch rows + items together
    return returnRows.map((r) => ({
      id: r.id,
      return_number: r.return_number,
      customer_name: r.customer_name,
      customer_email: r.customer_email ?? undefined,
      order_number: r.order_number ?? undefined,
      return_date: r.return_date,
      status: r.status,
      notes: r.notes ?? undefined,
      total_refund: r.total_refund ?? 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
      return_items: itemMap.get(r.id) ?? [],
    }))
  } catch (error) {
    console.error("Error in getReturns:", error)
    throw error
  }
}

async function createReturn(data: {
  customer_name: string
  customer_email?: string
  order_number?: string
  return_date: string
  status: "Pending" | "Processing" | "Accepted" | "Rejected"
  items: Array<{
    sku: string
    product_name: string
    quantity: number
    condition: string
    reason: string
    total_refund: number
    unit_price?: number
  }>
  total_refund: number
  notes?: string
}): Promise<Return> {
  try {
    console.log("Creating return with data:", data)

    const returnNumber = generateReturnNumber()
    console.log("Generated return number:", returnNumber)

    // Insert the return order
    const { data: returnData, error: returnError } = await supabase
      .from("returns")
      .insert({
        return_number: returnNumber,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        order_number: data.order_number || null,
        return_date: data.return_date,
        status: data.status,
        notes: data.notes || null,
        total_refund: data.total_refund,
      })
      .select()
      .single()

    if (returnError) {
      console.error("Error creating return:", returnError)
      throw returnError
    }

    console.log("Created return:", returnData)

    // Insert the items
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        return_id: returnData.id,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        condition: item.condition,
        reason: item.reason,
        total_refund: item.total_refund,
        unit_price: item.unit_price ?? null,
      }))

      console.log("Inserting return items:", itemsToInsert)

      const { data: itemsData, error: itemsError } = await supabase.from("return_items").insert(itemsToInsert).select()

      if (itemsError) {
        console.error("Error creating return items:", itemsError)
        throw itemsError
      }

      console.log("Created return items:", itemsData)

      return {
        ...returnData,
        total_refund: returnData.total_refund ?? data.total_refund,
        return_items: (itemsData || []).map((row) => ({
          id: row.id,
          return_id: row.return_id,
          sku: row.sku,
          product_name: row.product_name,
          quantity: row.quantity,
          condition: row.condition,
          reason: row.reason,
          total_refund: row.total_refund ?? 0,
          unit_price: row.unit_price ?? 0,
          created_at: row.created_at,
        })),
      }
    }

    return {
      ...returnData,
      return_items: [],
    }
  } catch (error) {
    console.error("Error in createReturn:", error)
    throw error
  }
}

async function updateReturn(id: string, updates: Partial<Return>): Promise<Return | null> {
  try {
    console.log("Updating return:", id, updates)

    // Get the current return to check status change
    const { data: currentReturn, error: fetchError } = await supabase
      .from("returns")
      .select(`
        id,
        return_number,
        customer_name,
        customer_email,
        order_number,
        return_date,
        status,
        notes,
        created_at,
        return_items (
          id,
          return_id,
          sku,
          product_name,
          quantity,
          condition,
          reason
        )
      `)
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching current return:", fetchError)
      throw fetchError
    }

    const previousStatus = currentReturn.status
    const newStatus = updates.status

    // Update the return
    const { data, error } = await supabase
      .from("returns")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        return_number,
        customer_name,
        customer_email,
        order_number,
        return_date,
        status,
        notes,
        created_at,
        updated_at,
        return_items (
          id,
          return_id,
          sku,
          product_name,
          quantity,
          condition,
          reason,
          created_at
        )
      `)
      .single()

    if (error) {
      console.error("Error updating return:", error)
      throw error
    }

    const updatedReturn = {
      ...data,
      total_refund: data.total_refund ?? 0,
      return_items: data.return_items || [],
    }

    // Handle status changes that affect inventory
    if (newStatus && previousStatus !== newStatus) {
      console.log(`Return status changed from ${previousStatus} to ${newStatus}`)

      // If changing TO "Accepted" from any other status
      if (newStatus === "Accepted" && previousStatus !== "Accepted") {
        console.log("Return status changed to Accepted, adding items back to inventory")
        await addReturnedItemsToInventory(updatedReturn)
      }

      // If changing FROM "Accepted" to any other status
      if (previousStatus === "Accepted" && newStatus !== "Accepted") {
        console.log("Return status changed from Accepted, removing returned items from inventory")
        await removeReturnedItemsFromInventory(updatedReturn)
      }
    }

    return updatedReturn
  } catch (error) {
    console.error("Error in updateReturn:", error)
    throw error
  }
}

/** Permanently remove a return header + its items */
async function deleteReturn(id: string): Promise<void> {
  try {
    // delete items first (FK constraint safety)
    const { error: itemsErr } = await supabase.from("return_items").delete().eq("return_id", id)
    if (itemsErr) throw itemsErr

    const { error } = await supabase.from("returns").delete().eq("id", id)
    if (error) throw error
  } catch (e) {
    console.error("Error deleting return:", e)
    throw e
  }
}

/**
 * Add returned items back to inventory when a return is accepted.
 *   • If a SKU already exists → increment its quantity_available.
 *   • If a SKU does not exist  → create a brand-new inventory record.
 */
async function addReturnedItemsToInventory(returnOrder: Return): Promise<void> {
  try {
    if (!returnOrder.return_items?.length) return

    const latestCosts = await getLatestUnitCosts()

    for (const item of returnOrder.return_items) {
      // Get the newest inventory row for this SKU (if any)
      const { data: existingRows, error: selErr } = await supabase
        .from("inventory")
        .select("id, quantity_available")
        .eq("sku", item.sku)
        .order("created_at", { ascending: false })
        .limit(1)

      if (selErr) {
        console.error("Inventory lookup failed:", selErr)
        continue
      }

      if (existingRows && existingRows.length) {
        // Update quantity on the existing row
        const row = existingRows[0]
        const { error: upErr } = await supabase
          .from("inventory")
          .update({ quantity_available: row.quantity_available + item.quantity })
          .eq("id", row.id)

        if (upErr) console.error(`Qty update failed for ${item.sku}:`, upErr)
      } else {
        // Create a fresh inventory row
        const { error: insErr } = await supabase.from("inventory").insert({
          sku: item.sku,
          product_name: item.product_name,
          quantity_available: item.quantity,
          unit_cost_with_delivery: latestCosts.get(item.sku) ?? 0,
          po_id: null,
          purchase_date: new Date().toISOString().split("T")[0],
        })
        if (insErr) console.error(`Insert failed for ${item.sku}:`, insErr)
      }
    }
  } catch (e) {
    console.error("addReturnedItemsToInventory failed:", e)
    throw e
  }
}

/**
 * Subtract previously-added quantities if an accepted return is reverted.
 */
async function removeReturnedItemsFromInventory(returnOrder: Return): Promise<void> {
  try {
    if (!returnOrder.return_items?.length) return

    for (const item of returnOrder.return_items) {
      // Always work against the newest row for the SKU
      const { data: existingRows, error: selErr } = await supabase
        .from("inventory")
        .select("id, quantity_available")
        .eq("sku", item.sku)
        .order("created_at", { ascending: false })
        .limit(1)

      if (selErr) {
        console.error("Inventory lookup failed:", selErr)
        continue
      }

      if (existingRows && existingRows.length) {
        const row = existingRows[0]
        const newQty = Math.max(row.quantity_available - item.quantity, 0)

        const { error: upErr } = await supabase
          .from("inventory")
          .update({ quantity_available: newQty })
          .eq("id", row.id)

        if (upErr) console.error(`Qty decrease failed for ${item.sku}:`, upErr)
      } else {
        console.warn(`No inventory row found for SKU ${item.sku} while reverting return.`)
      }
    }
  } catch (e) {
    console.error("removeReturnedItemsFromInventory failed:", e)
    throw e
  }
}

/* -------------------------------------------------------------------------- */
/*                           Public export signature                          */
/* -------------------------------------------------------------------------- */

export const supabaseStore = {
  /* Inventory */
  getInventory,
  addManualInventory,
  addInventoryFromPO,

  /* Inventory helpers that other screens use */
  getOrderItemsWithCosts,

  /* Purchase Orders */
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderWithItems,

  /* Returns */
  getReturns,
  createReturn,
  updateReturn,
  deleteReturn,

  /* Stores */
  getStores,
  createStore,
  updateStore,
  deleteStore,

  /* Shopify Stores */
  getShopifyStores,
  createShopifyStore,
  updateShopifyStore,
  deleteShopifyStore,

  /* Shopify Orders */
  getShopifyOrders,
  getShopifyOrderStats, // New function for global stats
  getAllShopifyOrders, // Legacy function
  addShopifyOrders,

  /* Minimal stubs (unchanged logic) so other pages keep compiling */
  getReports: () => Promise.resolve([]),
}

/**
 * Generate a unique, chronologically sortable Purchase-Order number.
 * Format: POYYYYMMDDHHMMSSmmmRR  (RR = random 00-99 suffix)
 *
 * Example: PO202507151653099450
 */
function generatePONumber(): string {
  const now = new Date()

  const pad = (n: number, len = 2) => n.toString().padStart(len, "0")

  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3) // millisecond precision

  const randomSuffix = pad(Math.floor(Math.random() * 100)) // 00-99

  return `PO${timestamp}${randomSuffix}`
}

/**
 * Generate a unique, chronologically sortable Return number.
 * Format: RYYYYMMDDHHMMSSmmmRR  (R = random 00-99 suffix)
 *
 * Example: R2025071410153012345
 */
function generateReturnNumber(): string {
  const now = new Date()
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0")

  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3) // millisecond precision

  const randomSuffix = pad(Math.floor(Math.random() * 100)) // 00-99

  return `R${timestamp}${randomSuffix}`
}

function isMissingRelation(err: PostgrestError | null) {
  // 42P01 == "relation does not exist" (Postgres) [^3]
  return err?.code === "42P01" || err?.message.includes("relation") // fallback
}
