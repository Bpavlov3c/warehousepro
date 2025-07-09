import { query, transaction } from "./database"
import type { PoolClient } from "pg"

// Types
export interface PurchaseOrder {
  id: string
  supplier: string
  order_date: string
  expected_delivery: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  total_cost: number
  notes?: string
  created_at: string
  updated_at: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_name: string
  sku: string
  quantity: number
  unit_cost: number
  delivery_cost_per_unit: number
  total_cost: number
  created_at: string
}

export interface InventoryItem {
  id: string
  sku: string
  product_name: string
  category: string
  current_stock: number
  reserved_stock: number
  available_stock: number
  reorder_point: number
  reorder_quantity: number
  average_cost: number
  location?: string
  supplier?: string
  last_updated: string
}

export interface ShopifyStore {
  id: string
  name: string
  domain: string
  access_token: string
  is_active: boolean
  last_sync?: string
  created_at: string
  updated_at: string
}

// Purchase Orders
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const result = await query(`
    SELECT 
      po.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', poi.id,
            'purchase_order_id', poi.purchase_order_id,
            'product_name', poi.product_name,
            'sku', poi.sku,
            'quantity', poi.quantity,
            'unit_cost', poi.unit_cost,
            'delivery_cost_per_unit', poi.delivery_cost_per_unit,
            'total_cost', poi.total_cost,
            'created_at', poi.created_at
          )
        ) FILTER (WHERE poi.id IS NOT NULL), 
        '[]'
      ) as items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    GROUP BY po.id
    ORDER BY po.created_at DESC
  `)

  return result.rows
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const result = await query(
    `
    SELECT 
      po.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', poi.id,
            'purchase_order_id', poi.purchase_order_id,
            'product_name', poi.product_name,
            'sku', poi.sku,
            'quantity', poi.quantity,
            'unit_cost', poi.unit_cost,
            'delivery_cost_per_unit', poi.delivery_cost_per_unit,
            'total_cost', poi.total_cost,
            'created_at', poi.created_at
          )
        ) FILTER (WHERE poi.id IS NOT NULL), 
        '[]'
      ) as items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE po.id = $1
    GROUP BY po.id
  `,
    [id],
  )

  return result.rows[0] || null
}

export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, "id" | "created_at" | "updated_at"> & {
    items: Omit<PurchaseOrderItem, "id" | "purchase_order_id" | "created_at">[]
  },
): Promise<PurchaseOrder> {
  return await transaction(async (client: PoolClient) => {
    // Create purchase order
    const poResult = await client.query(
      `
      INSERT INTO purchase_orders (supplier, order_date, expected_delivery, status, total_cost, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [data.supplier, data.order_date, data.expected_delivery, data.status, data.total_cost, data.notes],
    )

    const purchaseOrder = poResult.rows[0]

    // Create purchase order items
    if (data.items && data.items.length > 0) {
      const itemsQuery = `
        INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost)
        VALUES ${data.items.map((_, i) => `($1, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6}, $${i * 6 + 7})`).join(", ")}
        RETURNING *
      `

      const itemsParams = [
        purchaseOrder.id,
        ...data.items.flatMap((item) => [
          item.product_name,
          item.sku,
          item.quantity,
          item.unit_cost,
          item.delivery_cost_per_unit,
          item.total_cost,
        ]),
      ]

      const itemsResult = await client.query(itemsQuery, itemsParams)
      purchaseOrder.items = itemsResult.rows
    }

    return purchaseOrder
  })
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "items") {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) {
    return await getPurchaseOrder(id)
  }

  values.push(id)

  const result = await query(
    `
    UPDATE purchase_orders 
    SET ${fields.join(", ")}, updated_at = NOW()
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

// Inventory Items
export async function getInventoryItems(): Promise<InventoryItem[]> {
  const result = await query(`
    SELECT * FROM inventory_items 
    ORDER BY product_name ASC
  `)

  return result.rows
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const result = await query("SELECT * FROM inventory_items WHERE id = $1", [id])
  return result.rows[0] || null
}

export async function createInventoryItem(
  data: Omit<InventoryItem, "id" | "available_stock" | "last_updated">,
): Promise<InventoryItem> {
  const result = await query(
    `
    INSERT INTO inventory_items (sku, product_name, category, current_stock, reserved_stock, reorder_point, reorder_quantity, average_cost, location, supplier)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `,
    [
      data.sku,
      data.product_name,
      data.category,
      data.current_stock,
      data.reserved_stock,
      data.reorder_point,
      data.reorder_quantity,
      data.average_cost,
      data.location,
      data.supplier,
    ],
  )

  return result.rows[0]
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "available_stock" && key !== "last_updated") {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) {
    return await getInventoryItem(id)
  }

  values.push(id)

  const result = await query(
    `
    UPDATE inventory_items 
    SET ${fields.join(", ")}, last_updated = NOW()
    WHERE id = $${paramCount}
    RETURNING *
  `,
    values,
  )

  return result.rows[0] || null
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const result = await query("DELETE FROM inventory_items WHERE id = $1", [id])
  return result.rowCount > 0
}

// Shopify Stores
export async function getShopifyStores(): Promise<ShopifyStore[]> {
  const result = await query(`
    SELECT * FROM shopify_stores 
    ORDER BY name ASC
  `)

  return result.rows
}

export async function getShopifyStore(id: string): Promise<ShopifyStore | null> {
  const result = await query("SELECT * FROM shopify_stores WHERE id = $1", [id])
  return result.rows[0] || null
}

export async function createShopifyStore(
  data: Omit<ShopifyStore, "id" | "created_at" | "updated_at">,
): Promise<ShopifyStore> {
  const result = await query(
    `
    INSERT INTO shopify_stores (name, domain, access_token, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
    [data.name, data.domain, data.access_token, data.is_active],
  )

  return result.rows[0]
}

export async function updateShopifyStore(id: string, data: Partial<ShopifyStore>): Promise<ShopifyStore | null> {
  const fields = []
  const values = []
  let paramCount = 1

  for (const [key, value] of Object.entries(data)) {
    if (key !== "id" && key !== "created_at" && key !== "updated_at") {
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    }
  }

  if (fields.length === 0) {
    return await getShopifyStore(id)
  }

  values.push(id)

  const result = await query(
    `
    UPDATE shopify_stores 
    SET ${fields.join(", ")}, updated_at = NOW()
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

// Dashboard Statistics
export async function getDashboardStats() {
  const [purchaseOrdersResult, inventoryResult, storesResult] = await Promise.all([
    query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COALESCE(SUM(total_cost), 0) as total_value
      FROM purchase_orders
    `),
    query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE current_stock <= reorder_point) as low_stock_products,
        COALESCE(SUM(current_stock * average_cost), 0) as total_inventory_value
      FROM inventory_items
    `),
    query(`
      SELECT 
        COUNT(*) as total_stores,
        COUNT(*) FILTER (WHERE is_active = true) as active_stores
      FROM shopify_stores
    `),
  ])

  return {
    purchaseOrders: purchaseOrdersResult.rows[0],
    inventory: inventoryResult.rows[0],
    stores: storesResult.rows[0],
  }
}
