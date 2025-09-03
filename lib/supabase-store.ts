/**
 * Centralised data-layer for the Warehouse Management System.
 * All pages talk to Supabase through this singleton module.
 */

/* -------------------------------------------------------------------------- */
/*                        SAFE SUPABASE INITIALISATION 🛡️                    */
/* -------------------------------------------------------------------------- */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Build a _very_ lightweight mock Supabase client so the whole code-base can
 * keep calling `.from(...).select()` etc. without blowing up when the real
 * credentials are absent (which is the case inside the v0 preview sandbox).
 */
function makeMockClient() {
  /* A single no-op builder object reused for every call chain */
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    order: () => builder,
    range: () => builder,
    eq: () => builder,
    not: () => builder,
    in: () => builder,
    single: () => ({ data: null, error: null }),
    head: true,
    /* always succeed with empty data so callers can keep working */
    data: [],
    error: null,
    count: 0,
  } as any

  return {
    from: () => builder,
  } as any
}

/**
 * Export a **real** Supabase client when the env vars are present,
 * otherwise export the mock so the UI can still mount offline.
 */
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : (() => {
        console.warn(
          "[supabase-store] Supabase env vars missing – using in-memory mock client.\n" +
            "Pages will render with empty data but remain functional.",
        )
        return makeMockClient()
      })()

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
  inventory_processed?: boolean
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

/**
 * Some preview environments (e.g. brand-new databases) won’t yet have the
 * `inventory_processed` column.  If Postgres throws the unknown-column error
 * (code 42703) we safely ignore it and behave as if every order is processed.
 */
function ignoreMissingInventoryProcessed<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((err: any) => {
    if (err?.code === "42703" || /inventory_processed/.test(err?.message || "")) {
      console.warn(
        "[supabase-store] inventory_processed column missing – skipping inventory-processing logic until the migration is applied.",
      )
      return fallback
    }
    throw err
  })
}

/* -------------------------------------------------------------------------- */
/*                               Inventory APIs                               */
/* -------------------------------------------------------------------------- */

/**
 * Get the latest unit cost for each SKU from the most recent inventory record
 * This uses unit_cost_with_delivery which includes proportional shipping costs
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

    console.log("Latest unit costs (with delivery):", Array.from(latestCosts.entries()))
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
 * Calculate quantities that have been sold (fulfilled orders after 2025-07-17)
 */
async function calculateSoldQuantities(): Promise<Map<string, number>> {
  return ignoreMissingInventoryProcessed(async () => {
    const { data, error } = await supabase
      .from("shopify_orders")
      .select(
        `
        shopify_order_items ( sku, quantity )
      `,
      )
      .in("status", ["fulfilled", "shipped", "delivered"])
      .gte("order_date", "2025-07-17")
      .eq("inventory_processed", true)

    if (error) throw error

    const sold = new Map<string, number>()
    data?.forEach((order) => {
      order.shopify_order_items?.forEach((it) => {
        sold.set(it.sku, (sold.get(it.sku) || 0) + it.quantity)
      })
    })
    return sold
  }, new Map<string, number>())
}

/**
 * Process fulfilled orders for inventory deduction
 * Only processes orders after 2025-07-17 that haven't been processed yet
 */
async function processFulfilledOrdersForInventory(): Promise<void> {
  await ignoreMissingInventoryProcessed(async () => {
    const { data: orders, error } = await supabase
      .from("shopify_orders")
      .select(
        `
        id,
        order_number,
        shopify_order_items (
          sku,
          product_name,
          quantity
        )
      `,
      )
      .in("status", ["fulfilled", "shipped", "delivered"])
      .gte("order_date", "2025-07-17")
      .eq("inventory_processed", false)

    if (error) throw error
    if (!orders?.length) return

    for (const ord of orders) {
      for (const item of ord.shopify_order_items || []) {
        await deductInventoryQuantity(item.sku, item.quantity, `Order ${ord.order_number}`)
      }
      await supabase.from("shopify_orders").update({ inventory_processed: true }).eq("id", ord.id)
    }
  }, undefined)
}

/**
 * Deduct quantity from inventory for a specific SKU
 * Uses FIFO approach - deducts from oldest inventory first
 */
async function deductInventoryQuantity(sku: string, quantityToDeduct: number, reason: string): Promise<void> {
  try {
    console.log(`Deducting ${quantityToDeduct} units of ${sku} for ${reason}`)

    // Get all inventory records for this SKU ordered by creation date (FIFO)
    const { data: inventoryRecords, error: fetchError } = await supabase
      .from("inventory")
      .select("id, quantity_available")
      .eq("sku", sku)
      .gt("quantity_available", 0)
      .order("created_at", { ascending: true })

    if (fetchError) {
      console.error(`Error fetching inventory for SKU ${sku}:`, fetchError)
      return
    }

    if (!inventoryRecords || inventoryRecords.length === 0) {
      console.warn(`No available inventory found for SKU ${sku}`)
      return
    }

    let remainingToDeduct = quantityToDeduct

    // Deduct from inventory records using FIFO
    for (const record of inventoryRecords) {
      if (remainingToDeduct <= 0) break

      const availableInThisRecord = record.quantity_available
      const deductFromThisRecord = Math.min(remainingToDeduct, availableInThisRecord)
      const newQuantity = availableInThisRecord - deductFromThisRecord

      // Update the inventory record
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ quantity_available: newQuantity })
        .eq("id", record.id)

      if (updateError) {
        console.error(`Error updating inventory record ${record.id}:`, updateError)
        continue
      }

      remainingToDeduct -= deductFromThisRecord
      console.log(`Deducted ${deductFromThisRecord} from inventory record ${record.id}, remaining: ${newQuantity}`)
    }

    if (remainingToDeduct > 0) {
      console.warn(`Could not deduct full quantity for ${sku}. Remaining: ${remainingToDeduct}`)
    } else {
      console.log(`Successfully deducted ${quantityToDeduct} units of ${sku}`)
    }
  } catch (error) {
    console.error(`Error in deductInventoryQuantity for ${sku}:`, error)
    throw error
  }
}

/**
 * Calculate inventory summary for each SKU including incoming stock from POs and reserved from orders
 * Now also accounts for sold quantities from fulfilled orders
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

    // Get latest unit costs, reserved quantities, and sold quantities
    const [latestCosts, reservedQuantities, soldQuantities] = await Promise.all([
      getLatestUnitCosts(),
      calculateReservedQuantities(),
      calculateSoldQuantities(),
    ])

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

    // Create inventory items with latest costs, reserved quantities, and sold quantities
    skuTotals.forEach((totals, sku) => {
      const latestCost = latestCosts.get(sku) || 0 // This is already unit_cost_with_delivery
      const reserved = reservedQuantities.get(sku) || 0
      const sold = soldQuantities.get(sku) || 0

      // The in-stock quantity is already reduced by the inventory deduction process
      // So we don't need to subtract sold quantities here - they're already deducted
      const inStock = totals.totalQuantity

      console.log(`SKU ${sku}: quantity=${inStock}, total_unit_cost=${latestCost}, reserved=${reserved}, sold=${sold}`)

      inventoryMap.set(sku, {
        id: `summary-${sku}`,
        sku: sku,
        name: totals.productName,
        inStock: inStock,
        incoming: 0,
        reserved: reserved,
        unitCost: latestCost, // This is the total unit cost including shipping
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
    // First process any unprocessed fulfilled orders
    await processFulfilledOrdersForInventory()

    const inventoryMap = await calculateInventorySummary()
    return Array.from(inventoryMap.values())
  } catch (error) {
    console.error("Error fetching inventory:", error)
    throw error
  }
}

/**
 * Manually add inventory (outside of a purchase-order).
 * Unit cost should be the total cost including any shipping/handling
 */
async function addManualInventory(item: {
  sku: string
  name: string
  quantity: number
  unitCost: number // This should be the total unit cost including shipping
}): Promise<InventoryItem> {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        sku: item.sku,
        product_name: item.name,
        quantity_available: item.quantity,
        unit_cost_with_delivery: item.unitCost, // Total unit cost including shipping
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
 * Update an existing inventory item (manual inventory only).
 * Unit cost should be the total cost including any shipping/handling
 */
async function updateInventoryItem(
  id: string,
  updates: {
    sku: string
    name: string
    quantity: number
    unitCost: number // This should be the total unit cost including shipping
  },
): Promise<InventoryItem> {
  try {
    // For summary items (id starts with "summary-"), we need to find the actual inventory record
    let actualId = id
    if (id.startsWith("summary-")) {
      const sku = id.replace("summary-", "")

      // Find the most recent inventory record for this SKU
      const { data: inventoryRecord, error: findError } = await supabase
        .from("inventory")
        .select("id")
        .eq("sku", sku)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (findError || !inventoryRecord) {
        throw new Error(`No inventory record found for SKU: ${sku}`)
      }

      actualId = inventoryRecord.id
    }

    const { data, error } = await supabase
      .from("inventory")
      .update({
        sku: updates.sku,
        product_name: updates.name,
        quantity_available: updates.quantity,
        unit_cost_with_delivery: updates.unitCost, // Total unit cost including shipping
      })
      .eq("id", actualId)
      .select("id, sku, name:product_name, inStock:quantity_available, unitCost:unit_cost_with_delivery")
      .single()

    if (error) throw error

    return {
      ...data,
      incoming: 0,
      reserved: 0,
    }
  } catch (error) {
    console.error("Error updating inventory item:", error)
    throw error
  }
}

/**
 * Add inventory from a delivered purchase order
 * Uses the total unit cost including proportional shipping
 */
async function addInventoryFromPO(po: PurchaseOrder): Promise<void> {
  try {
    console.log("Adding inventory from delivered PO:", po.po_number)

    // ⚠️ Ignore items that have 0 (or negative) quantity – they should not hit inventory
    const validItems = po.items.filter((it) => it.quantity >= 0)
    if (!validItems.length) {
      console.log("No valid (qty>=0) PO items to add to inventory – skipping")
      return
    }

    // Calculate subtotal (total cost of all *valid* items before delivery)
    const subtotal = validItems.reduce((sum, it) => sum + it.total_cost, 0)

    const inventoryRecords = validItems.map((item) => {
      // Calculate total unit cost including proportional shipping
      const itemTotal = item.unit_cost * item.quantity

      // Default to base cost; will adjust below if we can apportion shipping safely
      let unitCostWithDelivery = item.unit_cost

      if (
        po.delivery_cost > 0 && // there is shipping to spread
        subtotal > 0 && // subtotal is positive
        item.quantity > 0 // avoid /0 later
      ) {
        const itemProportion = itemTotal / subtotal
        const shippingForThisItem = po.delivery_cost * itemProportion
        const shippingPerUnit = shippingForThisItem / item.quantity
        unitCostWithDelivery = item.unit_cost + shippingPerUnit
      }

      // Safety net – NaN / Infinity → fall back to base cost
      if (!Number.isFinite(unitCostWithDelivery)) {
        unitCostWithDelivery = item.unit_cost
      }

      return {
        sku: item.sku,
        product_name: item.product_name,
        po_id: po.id,
        quantity_available: item.quantity,
        unit_cost_with_delivery: unitCostWithDelivery,
        purchase_date: po.po_date,
      }
    })

    console.log("Inserting inventory records with total unit costs:", inventoryRecords)

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
 * Debug function to investigate unit cost discrepancies
 */
async function debugInventoryCosts(sku: string): Promise<void> {
  try {
    console.log(`=== DEBUG: Investigating costs for SKU ${sku} ===`)

    // Get all inventory records for this SKU
    const { data: inventoryRecords, error: invError } = await supabase
      .from("inventory")
      .select("*")
      .eq("sku", sku)
      .order("created_at", { ascending: false })

    if (invError) {
      console.error("Error fetching inventory records:", invError)
      return
    }

    console.log("Inventory records:", inventoryRecords)

    // Get all PO records that contain this SKU
    const { data: poRecords, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
      *,
      po_items!inner (
        *
      )
    `)
      .eq("po_items.sku", sku)
      .order("created_at", { ascending: false })

    if (poError) {
      console.error("Error fetching PO records:", poError)
      return
    }

    console.log("PO records containing this SKU:", poRecords)

    // Calculate what the unit cost should be for each PO
    poRecords?.forEach((po) => {
      const subtotal = po.po_items.reduce((sum: number, item: any) => sum + item.unit_cost * item.quantity, 0)
      const targetItem = po.po_items.find((item: any) => item.sku === sku)

      if (targetItem) {
        const itemTotal = targetItem.unit_cost * targetItem.quantity
        const itemProportion = itemTotal / subtotal
        const shippingForThisItem = po.delivery_cost * itemProportion
        const shippingPerUnit = shippingForThisItem / targetItem.quantity
        const totalUnitCost = targetItem.unit_cost + shippingPerUnit

        console.log(`PO ${po.po_number}:`)
        console.log(`  - Base unit cost: ${targetItem.unit_cost}`)
        console.log(`  - Item total: ${itemTotal}`)
        console.log(`  - Subtotal: ${subtotal}`)
        console.log(`  - Delivery cost: ${po.delivery_cost}`)
        console.log(`  - Item proportion: ${itemProportion}`)
        console.log(`  - Shipping for this item: ${shippingForThisItem}`)
        console.log(`  - Shipping per unit: ${shippingPerUnit}`)
        console.log(`  - Total unit cost: ${totalUnitCost}`)
      }
    })

    // Get the latest unit cost being used
    const latestCosts = await getLatestUnitCosts()
    console.log(`Current unit cost in system: ${latestCosts.get(sku)}`)
  } catch (error) {
    console.error("Error in debugInventoryCosts:", error)
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
        inventory_processed: row.inventory_processed,
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
      const profit = revenue - (order.tax_amount || 0) - itemsCost
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
 * Now also processes fulfilled orders for inventory deduction.
 *
 * 1. Upsert order **headers** into `shopify_orders`
 * 2. Insert line-items into `shopify_order_items`
 *    (existing items for that order are deleted first)
 * 3. Process fulfilled orders for inventory deduction if they're after 2025-07-17
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
      inventory_processed: false, // new orders start as unprocessed
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

      // Insert the new items
      const { data: insertedItems, error: insertErr } = await supabase
        .from("shopify_order_items")
        .insert(itemRows)
        .select()

      if (insertErr) throw insertErr
    }

    /* ---------------------------------------------------------------------- */
    /* 3 ▸ PROCESS FULFILLED ORDERS (deduct inventory if order is fulfilled) */
    /* ---------------------------------------------------------------------- */
    for (const order of upserted || []) {
      if (
        order.status === "fulfilled" &&
        new Date(order.order_date) >= new Date("2025-07-17") &&
        !order.inventory_processed
      ) {
        try {
          console.log(`Processing fulfilled order ${order.order_number} for inventory deduction`)

          // Get the items for this order
          const { data: orderItems, error: itemsError } = await supabase
            .from("shopify_order_items")
            .select("*")
            .eq("order_id", order.id)

          if (itemsError) {
            console.error(`Error fetching items for order ${order.order_number}:`, itemsError)
            continue // Skip to the next order
          }

          // Deduct quantities from inventory for each item
          for (const item of orderItems || []) {
            await deductInventoryQuantity(item.sku, item.quantity, `Order ${order.order_number}`)
          }

          // Mark order as processed
          const { error: updateError } = await supabase
            .from("shopify_orders")
            .update({ inventory_processed: true })
            .eq("id", order.id)

          if (updateError) {
            console.error(`Error marking order ${order.order_number} as processed:`, updateError)
          } else {
            console.log(`Order ${order.order_number} marked as processed`)
          }
        } catch (error) {
          console.error(`Error processing order ${order.order_number}:`, error)
          // Continue with next order even if one fails
        }
      }
    }

    /* ---------------------------------------------------------------------- */
    /* 4 ▸ FETCH ENRICHED ORDERS (with items + costs)                          */
    /* ---------------------------------------------------------------------- */
    const latestCosts = await getLatestUnitCosts()

    const enrichedOrders = (upserted || []).map((row: any) => {
      const itemsWithCosts = itemRows
        .filter((item) => item.order_id === row.id)
        .map((it) => ({
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
        storeName: row.store_name, // Assuming store_name is available in the row
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
        profit: profit,
        createdAt: row.created_at,
        shipping_address: row.shipping_address,
        total_amount: row.total_amount ?? 0,
        shipping_cost: row.shipping_cost ?? 0,
        tax_amount: row.tax_amount ?? 0,
        inventory_processed: row.inventory_processed,
      }
    })

    return enrichedOrders
  } catch (error) {
    console.error("Error in addShopifyOrders:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                               Return APIs                                  */
/* -------------------------------------------------------------------------- */

async function getReturns(): Promise<Return[]> {
  try {
    console.log("Fetching returns...")

    const { data, error } = await supabase
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
      updated_at,
      return_items (
        id,
        return_id,
        sku,
        product_name,
        quantity,
        condition,
        reason,
        created_at,
        total_refund,
        unit_price
      ),
      total_refund
    `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching returns:", error)
      throw error
    }

    console.log("Fetched returns:", data)

    return (
      data?.map((ret) => ({
        ...ret,
        return_items: ret.return_items || [],
      })) || []
    )
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
  notes?: string
  return_items: Array<{
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
    unit_price?: number
    total_refund?: number
  }>
  total_refund?: number
}): Promise<Return> {
  try {
    console.log("Creating return with data:", data)

    const returnNumber = generateReturnNumber()
    console.log("Generated return number:", returnNumber)

    // Insert the return
    const { data: returnData, error: returnError } = await supabase
      .from("returns")
      .insert({
        return_number: returnNumber,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        order_number: data.order_number,
        return_date: data.return_date,
        status: data.status,
        notes: data.notes || null,
        total_refund: data.total_refund || 0,
      })
      .select()
      .single()

    if (returnError) {
      console.error("Error creating return:", returnError)
      throw returnError
    }

    console.log("Created return:", returnData)

    // Insert the items
    if (data.return_items && data.return_items.length > 0) {
      const itemsToInsert = data.return_items.map((item) => ({
        return_id: returnData.id,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        condition: item.condition,
        reason: item.reason,
        unit_price: item.unit_price || 0,
        total_refund: item.total_refund || 0,
      }))

      console.log("Inserting items:", itemsToInsert)

      const { data: itemsData, error: itemsError } = await supabase.from("return_items").insert(itemsToInsert).select()

      if (itemsError) {
        console.error("Error creating return items:", itemsError)
        throw itemsError
      }

      console.log("Created items:", itemsData)

      return {
        ...returnData,
        return_items: (itemsData || []).map((row) => ({
          id: row.id,
          return_id: row.return_id,
          sku: row.sku,
          product_name: row.product_name,
          quantity: row.quantity,
          condition: row.condition,
          reason: row.reason,
          created_at: row.created_at,
          total_refund: row.total_refund || 0,
          unit_price: row.unit_price || 0,
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

/**
 * Update an existing return
 */
async function updateReturn(id: string, updates: Partial<Return>): Promise<Return | null> {
  try {
    console.log("Updating return:", id, updates)

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
        created_at,
        total_refund,
        unit_price
      ),
      total_refund
    `)
      .single()

    if (error) {
      console.error("Error updating return:", error)
      throw error
    }

    return {
      ...data,
      return_items: data.return_items || [],
    }
  } catch (error) {
    console.error("Error in updateReturn:", error)
    throw error
  }
}

/**
 * Update an existing return with items (comprehensive update)
 */
async function updateReturnWithItems(
  id: string,
  data: {
    customer_name?: string
    customer_email?: string
    order_number?: string
    return_date?: string
    status?: "Pending" | "Processing" | "Accepted" | "Rejected"
    notes?: string
    return_items?: Array<{
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
      unit_price?: number
      total_refund?: number
    }>
    total_refund?: number
  },
): Promise<Return | null> {
  try {
    console.log("Updating return with items:", id, data)

    // Start a transaction-like approach
    // First, update the return header
    const headerUpdates: any = {}
    if (data.customer_name !== undefined) headerUpdates.customer_name = data.customer_name
    if (data.customer_email !== undefined) headerUpdates.customer_email = data.customer_email
    if (data.order_number !== undefined) headerUpdates.order_number = data.order_number
    if (data.return_date !== undefined) headerUpdates.return_date = data.return_date
    if (data.status !== undefined) headerUpdates.status = data.status
    if (data.notes !== undefined) headerUpdates.notes = data.notes
    if (data.total_refund !== undefined) headerUpdates.total_refund = data.total_refund

    const { data: returnData, error: returnError } = await supabase
      .from("returns")
      .update(headerUpdates)
      .eq("id", id)
      .select()
      .single()

    if (returnError) {
      console.error("Error updating return header:", returnError)
      throw returnError
    }

    console.log("Updated return header:", returnData)

    // If items are provided, replace all existing items
    if (data.return_items) {
      // Delete existing items
      const { error: deleteError } = await supabase.from("return_items").delete().eq("return_id", id)

      if (deleteError) {
        console.error("Error deleting existing return items:", deleteError)
        throw deleteError
      }

      console.log("Deleted existing items")

      // Insert new items
      if (data.return_items.length > 0) {
        const itemsToInsert = data.return_items.map((item) => ({
          return_id: id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          condition: item.condition,
          reason: item.reason,
          unit_price: item.unit_price || 0,
          total_refund: item.total_refund || 0,
        }))

        console.log("Inserting new items:", itemsToInsert)

        const { data: itemsData, error: itemsError } = await supabase
          .from("return_items")
          .insert(itemsToInsert)
          .select()

        if (itemsError) {
          console.error("Error creating new return items:", itemsError)
          throw itemsError
        }

        console.log("Created new items:", itemsData)

        return {
          ...returnData,
          return_items: (itemsData || []).map((row) => ({
            id: row.id,
            return_id: row.return_id,
            sku: row.sku,
            product_name: row.product_name,
            quantity: row.quantity,
            condition: row.condition,
            reason: row.reason,
            created_at: row.created_at,
            total_refund: row.total_refund || 0,
            unit_price: row.unit_price || 0,
          })),
        }
      }
    }

    // If no items provided, just return the updated return with existing items
    const { data: fullReturn, error: fullReturnError } = await supabase
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
      updated_at,
      return_items (
        id,
        return_id,
        sku,
        product_name,
        quantity,
        condition,
        reason,
        created_at,
        total_refund,
        unit_price
      )
    `)
      .eq("id", id)
      .single()

    if (fullReturnError) {
      console.error("Error fetching updated return:", fullReturnError)
      throw fullReturnError
    }

    return {
      ...fullReturn,
      return_items: fullReturn.return_items || [],
    }
  } catch (error) {
    console.error("Error in updateReturnWithItems:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                                Utils                                       */
/* -------------------------------------------------------------------------- */

function generatePONumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // Get last 2 digits of year
  const month = String(now.getMonth() + 1).padStart(2, "0") // Month is 0-indexed
  const day = String(now.getDate()).padStart(2, "0")
  const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 random characters

  return `PO-${year}${month}${day}-${random}`
}

function generateReturnNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // Get last 2 digits of year
  const month = String(now.getMonth() + 1).padStart(2, "0") // Month is 0-indexed
  const day = String(now.getDate()).padStart(2, "0")
  const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 random characters

  return `RET-${year}${month}${day}-${random}`
}

/* -------------------------------------------------------------------------- */
/*                       Centralised store export object                      */
/* -------------------------------------------------------------------------- */

export const supabaseStore = {
  /* Inventory */
  getInventory,
  addManualInventory,
  updateInventoryItem,
  addInventoryFromPO,
  processFulfilledOrdersForInventory,

  /* Inventory helpers */
  getOrderItemsWithCosts,
  calculateOrderProfit,
  debugInventoryCosts,

  /* Purchase Orders */
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderWithItems,

  /* Returns */
  getReturns,
  createReturn,
  updateReturn,
  updateReturnWithItems,

  /* Stores (generic) */
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
  getAllShopifyOrders,
  addShopifyOrders,
  getShopifyOrderStats,
}

export {
  getInventory,
  addManualInventory,
  updateInventoryItem,
  addInventoryFromPO,
  processFulfilledOrdersForInventory,
  debugInventoryCosts,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderWithItems,
  getReturns,
  createReturn,
  updateReturn,
  updateReturnWithItems,
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getShopifyStores,
  createShopifyStore,
  updateShopifyStore,
  deleteShopifyStore,
  getShopifyOrders,
  getAllShopifyOrders,
  addShopifyOrders,
  getShopifyOrderStats,
  getOrderItemsWithCosts,
  calculateOrderProfit,
}
