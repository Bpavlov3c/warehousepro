/**
 * Centralised data-layer for the Warehouse Management System.
 * All pages talk to Supabase through this singleton module.
 */

import { createClient } from "@supabase/supabase-js"

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
 * Calculate inventory summary for each SKU including incoming stock from POs
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

    // Get latest unit costs for all SKUs
    const latestCosts = await getLatestUnitCosts()

    // Create inventory summary map
    const inventoryMap = new Map<string, InventoryItem>()

    // Process delivered inventory (in-stock items)
    // Group quantities by SKU
    const skuTotals = new Map<string, { totalQuantity: number; productName: string }>()

    inventoryData?.forEach((item) => {
      const existing = skuTotals.get(item.sku)
      if (existing) {
        existing.totalQuantity += item.quantity_available
      } else {
        skuTotals.set(item.sku, {
          totalQuantity: item.quantity_available,
          productName: item.product_name,
        })
      }
    })

    // Create inventory items with latest costs
    skuTotals.forEach((totals, sku) => {
      const latestCost = latestCosts.get(sku) || 0
      console.log(`SKU ${sku}: quantity=${totals.totalQuantity}, latest_cost=${latestCost}`)

      inventoryMap.set(sku, {
        id: `summary-${sku}`,
        sku: sku,
        name: totals.productName,
        inStock: totals.totalQuantity,
        incoming: 0,
        reserved: 0,
        unitCost: latestCost,
      })
    })

    // Process incoming stock from pending/in-transit POs
    poData?.forEach((po) => {
      po.po_items?.forEach((item) => {
        const existing = inventoryMap.get(item.sku)
        if (existing) {
          existing.incoming += item.quantity
        } else {
          // Create new entry for items that are only incoming
          inventoryMap.set(item.sku, {
            id: `summary-${item.sku}`,
            sku: item.sku,
            name: item.product_name,
            inStock: 0,
            incoming: item.quantity,
            reserved: 0,
            unitCost: latestCosts.get(item.sku) || 0,
          })
        }
      })
    })

    console.log("Final inventory summary:", Array.from(inventoryMap.values()))
    return inventoryMap
  } catch (error) {
    console.error("Error calculating inventory summary:", error)
    throw error
  }
}

/**
 * Fetch all inventory rows with calculated incoming stock.
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
  } catch (error) {
    console.error("Error in addInventoryFromPO:", error)
    throw error
  }
}

/**
 * Return order items with an extra `cost_price` field (latest cost from inventory).
 * Missing SKUs get cost_price 0.
 */
async function getOrderItemsWithCosts(
  orderItems: ShopifyOrderItem[],
): Promise<(ShopifyOrderItem & { cost_price: number })[]> {
  const latestCosts = await getLatestUnitCosts()

  return orderItems.map((item) => ({
    ...item,
    cost_price: latestCosts.get(item.sku) ?? 0,
  }))
}

/**
 * Calculate profit for an order using actual inventory costs
 */
async function calculateOrderProfit(order: ShopifyOrder): Promise<number> {
  const itemsWithCosts = await getOrderItemsWithCosts(order.items)
  const itemsCost = itemsWithCosts.reduce((sum, i) => sum + i.cost_price * i.quantity, 0)

  // Profit = revenue – tax – shipping – item costs
  return order.total_amount - order.tax_amount - order.shipping_cost - itemsCost
}

/* -------------------------------------------------------------------------- */
/*                          Purchase-Order (PO) APIs                          */
/* -------------------------------------------------------------------------- */

/** Return every purchase order + its line-items. */
async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    console.log("Fetching purchase orders...")

    const { data: orders, error } = await supabase
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

    console.log("Fetched orders:", orders)

    return (
      orders?.map((order) => ({
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

async function getShopifyOrders(): Promise<ShopifyOrder[]> {
  try {
    const { data, error } = await supabase
      .from("shopify_orders")
      .select(`
        *,
        shopify_stores!inner(store_name),
        shopify_order_items (
          id,
          sku,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order("order_date", { ascending: false })

    if (error) throw error

    // Process orders and calculate actual profits
    const ordersWithProfits = await Promise.all(
      (data || []).map(async (order) => {
        const orderObj = {
          id: order.id,
          storeId: order.store_id,
          storeName: order.shopify_stores.store_name,
          shopifyOrderId: order.shopify_order_id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderDate: order.order_date,
          status: order.status,
          totalAmount: order.total_amount,
          shippingCost: order.shipping_cost,
          taxAmount: order.tax_amount,
          items: order.shopify_order_items || [],
          shippingAddress: order.shipping_address,
          profit: 0, // Will be calculated
          createdAt: order.created_at,
          shipping_address: order.shipping_address,
          total_amount: order.total_amount,
          shipping_cost: order.shipping_cost,
          tax_amount: order.tax_amount,
        }

        // Calculate actual profit using inventory costs
        const itemsWithCosts = await getOrderItemsWithCosts(order.shopify_order_items || [])
        const actualProfit = await calculateOrderProfit({
          ...orderObj,
          items: itemsWithCosts,
        })

        return {
          ...orderObj,
          profit: actualProfit,
          // expose cost‐enriched items to the UI
          shopify_order_items: itemsWithCosts,
        }
      }),
    )

    return ordersWithProfits
  } catch (error) {
    console.error("Error fetching Shopify orders:", error)
    throw error
  }
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
/*                           Public export signature                          */
/* -------------------------------------------------------------------------- */

export const supabaseStore = {
  /* Inventory */
  getInventory,
  addManualInventory,
  addInventoryFromPO,
  getOrderItemsWithCosts,

  /* Purchase-Orders */
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderWithItems,

  /* Shopify stores */
  getShopifyStores,
  createShopifyStore,
  updateShopifyStore,
  deleteShopifyStore,
  getShopifyOrders,
  addShopifyOrders,
}

// Generate PO Number
function generatePONumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const time = String(now.getTime()).slice(-4)
  return `PO-${year}${month}${day}-${time}`
}
