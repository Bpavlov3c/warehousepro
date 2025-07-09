import { query, transaction } from "./database"
import type { PoolClient } from "pg"

// Types
export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_name: string
  order_date: string
  expected_delivery?: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  total_cost: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_name: string
  sku?: string
  quantity: number
  unit_cost: number
  total_cost: number
  created_at: string
}

export interface InventoryItem {
  id: string
  sku: string
  product_name: string
  description?: string
  category?: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  reorder_point: number
  unit_cost: number
  selling_price: number
  location?: string
  created_at: string
  updated_at: string
}

export interface ShopifyStore {
  id: string
  store_name: string
  shop_domain: string
  access_token?: string
  is_active: boolean
  last_sync?: string
  created_at: string
  updated_at: string
}

export interface ShopifyOrder {
  id: string
  shopify_order_id: number
  store_id: string
  order_number: string
  customer_email?: string
  customer_name?: string
  total_price: number
  currency: string
  fulfillment_status?: string
  financial_status?: string
  order_date: string
  shipping_address?: any
  line_items?: any
  created_at: string
  updated_at: string
}

// Purchase Orders
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const result = await query(`
    SELECT * FROM purchase_orders 
    ORDER BY created_at DESC
  `)
  return result.rows
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  const result = await query("SELECT * FROM purchase_orders WHERE id = $1", [id])
  return result.rows[0] || null
}

export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "total_cost">,
): Promise<PurchaseOrder> {
  const result = await query(
    `
    INSERT INTO purchase_orders (po_number, supplier_name, order_date, expected_delivery, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
    [data.po_number, data.supplier_name, data.order_date, data.expected_delivery, data.status, data.notes],
  )

  return result.rows[0]
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && key !== "updated_at" && value !== undefined) {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `
    UPDATE purchase_orders 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `,
    values,
  )

  return result.rows[0] || null
}

export async function deletePurchaseOrder(id: string): Promise<boolean> {
  const result = await query("DELETE FROM purchase_orders WHERE id = $1", [id])
  return result.rowCount > 0
}

// Purchase Order Items
export async function getPurchaseOrderItems(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
  const result = await query(
    `
    SELECT * FROM purchase_order_items 
    WHERE purchase_order_id = $1 
    ORDER BY created_at ASC
  `,
    [purchaseOrderId],
  )
  return result.rows
}

export async function createPurchaseOrderItem(
  data: Omit<PurchaseOrderItem, "id" | "created_at" | "total_cost">,
): Promise<PurchaseOrderItem> {
  const result = await query(
    `
    INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    [data.purchase_order_id, data.product_name, data.sku, data.quantity, data.unit_cost],
  )

  return result.rows[0]
}

export async function updatePurchaseOrderItem(
  id: string,
  data: Partial<PurchaseOrderItem>,
): Promise<PurchaseOrderItem | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && key !== "total_cost" && value !== undefined) {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `
    UPDATE purchase_order_items 
    SET ${fields.join(", ")}
    WHERE id = $${paramCount}
    RETURNING *
  `,
    values,
  )

  return result.rows[0] || null
}

export async function deletePurchaseOrderItem(id: string): Promise<boolean> {
  const result = await query("DELETE FROM purchase_order_items WHERE id = $1", [id])
  return result.rowCount > 0
}

// Inventory
export async function getAllInventoryItems(): Promise<InventoryItem[]> {
  const result = await query(`
    SELECT * FROM inventory 
    ORDER BY product_name ASC
  `)
  return result.rows
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const result = await query("SELECT * FROM inventory WHERE id = $1", [id])
  return result.rows[0] || null
}

export async function getInventoryItemBySku(sku: string): Promise<InventoryItem | null> {
  const result = await query("SELECT * FROM inventory WHERE sku = $1", [sku])
  return result.rows[0] || null
}

export async function createInventoryItem(
  data: Omit<InventoryItem, "id" | "created_at" | "updated_at" | "quantity_available">,
): Promise<InventoryItem> {
  const result = await query(
    `
    INSERT INTO inventory (sku, product_name, description, category, quantity_on_hand, quantity_reserved, reorder_point, unit_cost, selling_price, location)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `,
    [
      data.sku,
      data.product_name,
      data.description,
      data.category,
      data.quantity_on_hand,
      data.quantity_reserved,
      data.reorder_point,
      data.unit_cost,
      data.selling_price,
      data.location,
    ],
  )

  return result.rows[0]
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (
      key !== "id" &&
      key !== "created_at" &&
      key !== "updated_at" &&
      key !== "quantity_available" &&
      value !== undefined
    ) {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `
    UPDATE inventory 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `,
    values,
  )

  return result.rows[0] || null
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const result = await query("DELETE FROM inventory WHERE id = $1", [id])
  return result.rowCount > 0
}

// Shopify Stores
export async function getAllShopifyStores(): Promise<ShopifyStore[]> {
  const result = await query(`
    SELECT * FROM shopify_stores 
    ORDER BY store_name ASC
  `)
  return result.rows
}

export async function getShopifyStoreById(id: string): Promise<ShopifyStore | null> {
  const result = await query("SELECT * FROM shopify_stores WHERE id = $1", [id])
  return result.rows[0] || null
}

export async function createShopifyStore(
  data: Omit<ShopifyStore, "id" | "created_at" | "updated_at">,
): Promise<ShopifyStore> {
  const result = await query(
    `
    INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active, last_sync)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    [data.store_name, data.shop_domain, data.access_token, data.is_active, data.last_sync],
  )

  return result.rows[0]
}

export async function updateShopifyStore(id: string, data: Partial<ShopifyStore>): Promise<ShopifyStore | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && key !== "updated_at" && value !== undefined) {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `
    UPDATE shopify_stores 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `,
    values,
  )

  return result.rows[0] || null
}

export async function deleteShopifyStore(id: string): Promise<boolean> {
  const result = await query("DELETE FROM shopify_stores WHERE id = $1", [id])
  return result.rowCount > 0
}

// Shopify Orders
export async function getAllShopifyOrders(): Promise<ShopifyOrder[]> {
  const result = await query(`
    SELECT so.*, ss.store_name 
    FROM shopify_orders so
    LEFT JOIN shopify_stores ss ON so.store_id = ss.id
    ORDER BY so.order_date DESC
  `)
  return result.rows
}

export async function getShopifyOrderById(id: string): Promise<ShopifyOrder | null> {
  const result = await query(
    `
    SELECT so.*, ss.store_name 
    FROM shopify_orders so
    LEFT JOIN shopify_stores ss ON so.store_id = ss.id
    WHERE so.id = $1
  `,
    [id],
  )
  return result.rows[0] || null
}

export async function createShopifyOrder(
  data: Omit<ShopifyOrder, "id" | "created_at" | "updated_at">,
): Promise<ShopifyOrder> {
  const result = await query(
    `
    INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, total_price, currency, fulfillment_status, financial_status, order_date, shipping_address, line_items)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `,
    [
      data.shopify_order_id,
      data.store_id,
      data.order_number,
      data.customer_email,
      data.customer_name,
      data.total_price,
      data.currency,
      data.fulfillment_status,
      data.financial_status,
      data.order_date,
      data.shipping_address,
      data.line_items,
    ],
  )

  return result.rows[0]
}

export async function updateShopifyOrder(id: string, data: Partial<ShopifyOrder>): Promise<ShopifyOrder | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && key !== "updated_at" && value !== undefined) {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) return null

  values.push(id)
  const result = await query(
    `
    UPDATE shopify_orders 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING *
  `,
    values,
  )

  return result.rows[0] || null
}

export async function deleteShopifyOrder(id: string): Promise<boolean> {
  const result = await query("DELETE FROM shopify_orders WHERE id = $1", [id])
  return result.rowCount > 0
}

// Complex operations with transactions
export async function createPurchaseOrderWithItems(
  orderData: Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "total_cost">,
  items: Omit<PurchaseOrderItem, "id" | "purchase_order_id" | "created_at" | "total_cost">[],
): Promise<{ order: PurchaseOrder; items: PurchaseOrderItem[] }> {
  return await transaction(async (client: PoolClient) => {
    // Create the purchase order
    const orderResult = await client.query(
      `
      INSERT INTO purchase_orders (po_number, supplier_name, order_date, expected_delivery, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        orderData.po_number,
        orderData.supplier_name,
        orderData.order_date,
        orderData.expected_delivery,
        orderData.status,
        orderData.notes,
      ],
    )

    const order = orderResult.rows[0]

    // Create the items
    const createdItems: PurchaseOrderItem[] = []
    for (const item of items) {
      const itemResult = await client.query(
        `
        INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [order.id, item.product_name, item.sku, item.quantity, item.unit_cost],
      )

      createdItems.push(itemResult.rows[0])
    }

    // Get the updated order with calculated total
    const updatedOrderResult = await client.query("SELECT * FROM purchase_orders WHERE id = $1", [order.id])

    return {
      order: updatedOrderResult.rows[0],
      items: createdItems,
    }
  })
}

// Analytics and reporting functions
export async function getDashboardStats() {
  const [totalPurchaseOrders, pendingOrders, totalInventoryValue, lowStockItems, recentOrders] = await Promise.all([
    query("SELECT COUNT(*) as count FROM purchase_orders"),
    query("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'pending'"),
    query("SELECT SUM(quantity_on_hand * unit_cost) as total FROM inventory"),
    query("SELECT COUNT(*) as count FROM inventory WHERE quantity_available <= reorder_point"),
    query("SELECT COUNT(*) as count FROM shopify_orders WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'"),
  ])

  return {
    totalPurchaseOrders: Number.parseInt(totalPurchaseOrders.rows[0].count),
    pendingOrders: Number.parseInt(pendingOrders.rows[0].count),
    totalInventoryValue: Number.parseFloat(totalInventoryValue.rows[0].total || "0"),
    lowStockItems: Number.parseInt(lowStockItems.rows[0].count),
    recentOrders: Number.parseInt(recentOrders.rows[0].count),
  }
}
