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
  shop_url: string
  access_token: string
  status: "active" | "inactive"
  last_sync: string | null
  created_at: string
}

export interface ShopifyOrder {
  id: string
  shopify_order_id: string
  store_id: string
  order_number: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
  items: ShopifyOrderItem[]
}

export interface ShopifyOrderItem {
  id: string
  order_id: string
  sku: string
  product_name: string
  quantity: number
  price: number
}

/* -------------------------------------------------------------------------- */
/*                               Inventory APIs                               */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all inventory rows.
 * Uses column-aliases so we can keep the UI camel-cased.
 */
async function getInventory(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("id, sku, name:product_name, inStock:in_stock, incoming, reserved, unitCost:unit_cost")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching inventory:", error)
    throw error
  }
}

/**
 * Manually add inventory (outside of a purchase-order).
 * If the SKU exists we *replace* the row's stock with the new quantity
 * (simplest approach for a demo – feel free to extend to an "increment" op).
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
      .upsert(
        {
          sku: item.sku,
          product_name: item.name,
          in_stock: item.quantity,
          unit_cost: item.unitCost,
          incoming: 0,
          reserved: 0,
        },
        {
          onConflict: "sku",
        },
      )
      .select("id, sku, name:product_name, inStock:in_stock, incoming, reserved, unitCost:unit_cost")
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error adding manual inventory:", error)
    throw error
  }
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

      return {
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

    return {
      ...data,
      items: data.po_items || [],
    }
  } catch (error) {
    console.error("Error in updatePurchaseOrder:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                               Shopify Store APIs                           */
/* -------------------------------------------------------------------------- */

async function getShopifyStores(): Promise<ShopifyStore[]> {
  try {
    const { data, error } = await supabase
      .from("shopify_stores")
      .select("id, name:store_name, shop_url, access_token, status, last_sync, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching Shopify stores:", error)
    throw error
  }
}

async function updateShopifyStore(id: string, updates: Partial<ShopifyStore>): Promise<ShopifyStore | null> {
  try {
    const { data, error } = await supabase
      .from("shopify_stores")
      .update(updates)
      .eq("id", id)
      .select("id, name:store_name, shop_url, access_token, status, last_sync, created_at")
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating Shopify store:", error)
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
        id,
        shopify_order_id,
        store_id,
        order_number,
        customer_name,
        total_amount,
        status,
        created_at,
        shopify_order_items (
          id,
          sku,
          product_name,
          quantity,
          price
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return (
      data?.map((order) => ({
        ...order,
        items: order.shopify_order_items || [],
      })) || []
    )
  } catch (error) {
    console.error("Error fetching Shopify orders:", error)
    throw error
  }
}

async function addShopifyOrders(orders: any[]): Promise<void> {
  try {
    const { error } = await supabase.from("shopify_orders").upsert(orders, { onConflict: "shopify_order_id" })

    if (error) throw error
  } catch (error) {
    console.error("Error adding Shopify orders:", error)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                           Public export signature                          */
/* -------------------------------------------------------------------------- */

export const supabaseStore = {
  /* Inventory */
  getInventory,
  addManualInventory,

  /* Purchase-Orders */
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,

  /* Shopify stores */
  getShopifyStores,
  updateShopifyStore,
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
