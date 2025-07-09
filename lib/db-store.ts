import { query, transaction } from "./database"
import type { PoolClient } from "pg"

// Types
export interface Store {
  id: string
  name: string
  shopify_domain: string
  access_token: string
  created_at: Date
  updated_at: Date
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  supplier: string
  unit_cost: number
  current_stock: number
  reorder_point: number
  created_at: Date
  updated_at: Date
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier: string
  status: "draft" | "sent" | "delivered"
  order_date: Date
  expected_delivery: Date | null
  delivery_cost: number
  notes: string | null
  created_at: Date
  updated_at: Date
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  po_id: string
  product_id: string
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  delivery_cost_per_unit: number
  total_cost: number
  created_at: Date
  updated_at: Date
}

export interface ShopifyOrder {
  id: string
  store_id: string
  shopify_order_id: string
  order_number: string
  customer_email: string
  total_amount: number
  status: string
  created_at: Date
  updated_at: Date
  items: ShopifyOrderItem[]
}

export interface ShopifyOrderItem {
  id: string
  order_id: string
  product_id: string
  sku: string
  product_name: string
  quantity: number
  price: number
  created_at: Date
  updated_at: Date
}

export interface InventoryTransaction {
  id: string
  product_id: string
  transaction_type: "purchase" | "sale" | "adjustment"
  quantity: number
  unit_cost: number
  reference_id: string | null
  reference_type: string | null
  created_at: Date
}

// Store operations
export async function getStores(): Promise<Store[]> {
  const result = await query("SELECT * FROM stores ORDER BY created_at DESC")
  return result.rows
}

export async function createStore(store: Omit<Store, "id" | "created_at" | "updated_at">): Promise<Store> {
  const result = await query(
    `INSERT INTO stores (name, shopify_domain, access_token) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [store.name, store.shopify_domain, store.access_token],
  )
  return result.rows[0]
}

export async function updateStore(id: string, updates: Partial<Store>): Promise<Store> {
  const setClause = Object.keys(updates)
    .filter((key) => key !== "id" && key !== "created_at" && key !== "updated_at")
    .map((key, index) => `${key} = $${index + 2}`)
    .join(", ")

  const values = Object.values(updates).filter((_, index) => {
    const key = Object.keys(updates)[index]
    return key !== "id" && key !== "created_at" && key !== "updated_at"
  })

  const result = await query(
    `UPDATE stores SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id, ...values],
  )
  return result.rows[0]
}

export async function deleteStore(id: string): Promise<void> {
  await query("DELETE FROM stores WHERE id = $1", [id])
}

// Product operations
export async function getProducts(): Promise<Product[]> {
  const result = await query("SELECT * FROM products ORDER BY name")
  return result.rows
}

export async function createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
  const result = await query(
    `INSERT INTO products (sku, name, category, supplier, unit_cost, current_stock, reorder_point) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      product.sku,
      product.name,
      product.category,
      product.supplier,
      product.unit_cost,
      product.current_stock,
      product.reorder_point,
    ],
  )
  return result.rows[0]
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const setClause = Object.keys(updates)
    .filter((key) => key !== "id" && key !== "created_at" && key !== "updated_at")
    .map((key, index) => `${key} = $${index + 2}`)
    .join(", ")

  const values = Object.values(updates).filter((_, index) => {
    const key = Object.keys(updates)[index]
    return key !== "id" && key !== "created_at" && key !== "updated_at"
  })

  const result = await query(
    `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id, ...values],
  )
  return result.rows[0]
}

export async function deleteProduct(id: string): Promise<void> {
  await query("DELETE FROM products WHERE id = $1", [id])
}

// Purchase Order operations
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const result = await query(`
    SELECT 
      po.*,
      json_agg(
        json_build_object(
          'id', poi.id,
          'po_id', poi.po_id,
          'product_id', poi.product_id,
          'sku', poi.sku,
          'product_name', poi.product_name,
          'quantity', poi.quantity,
          'unit_cost', poi.unit_cost,
          'delivery_cost_per_unit', poi.delivery_cost_per_unit,
          'total_cost', poi.total_cost,
          'created_at', poi.created_at,
          'updated_at', poi.updated_at
        ) ORDER BY poi.created_at
      ) as items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
    GROUP BY po.id
    ORDER BY po.created_at DESC
  `)

  return result.rows.map((row) => ({
    ...row,
    items: row.items.filter((item: any) => item.id !== null),
  }))
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const result = await query(
    `
    SELECT 
      po.*,
      json_agg(
        json_build_object(
          'id', poi.id,
          'po_id', poi.po_id,
          'product_id', poi.product_id,
          'sku', poi.sku,
          'product_name', poi.product_name,
          'quantity', poi.quantity,
          'unit_cost', poi.unit_cost,
          'delivery_cost_per_unit', poi.delivery_cost_per_unit,
          'total_cost', poi.total_cost,
          'created_at', poi.created_at,
          'updated_at', poi.updated_at
        ) ORDER BY poi.created_at
      ) as items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
    WHERE po.id = $1
    GROUP BY po.id
  `,
    [id],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    ...row,
    items: row.items.filter((item: any) => item.id !== null),
  }
}

export async function createPurchaseOrder(
  po: Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "items">,
  items: Omit<PurchaseOrderItem, "id" | "po_id" | "created_at" | "updated_at">[],
): Promise<PurchaseOrder> {
  return await transaction(async (client: PoolClient) => {
    // Create purchase order
    const poResult = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier, status, order_date, expected_delivery, delivery_cost, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [po.po_number, po.supplier, po.status, po.order_date, po.expected_delivery, po.delivery_cost, po.notes],
    )

    const createdPO = poResult.rows[0]

    // Create purchase order items
    const createdItems = []
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO purchase_order_items (po_id, product_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          createdPO.id,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.unit_cost,
          item.delivery_cost_per_unit,
          item.total_cost,
        ],
      )
      createdItems.push(itemResult.rows[0])
    }

    return {
      ...createdPO,
      items: createdItems,
    }
  })
}

export async function updatePurchaseOrder(
  id: string,
  updates: Partial<Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "items">>,
  items?: Omit<PurchaseOrderItem, "id" | "po_id" | "created_at" | "updated_at">[],
): Promise<PurchaseOrder> {
  return await transaction(async (client: PoolClient) => {
    // Update purchase order
    const setClause = Object.keys(updates)
      .filter((key) => key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "items")
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ")

    const values = Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index]
      return key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "items"
    })

    const poResult = await client.query(
      `UPDATE purchase_orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values],
    )

    const updatedPO = poResult.rows[0]

    // Update items if provided
    if (items) {
      // Delete existing items
      await client.query("DELETE FROM purchase_order_items WHERE po_id = $1", [id])

      // Create new items
      const createdItems = []
      for (const item of items) {
        const itemResult = await client.query(
          `INSERT INTO purchase_order_items (po_id, product_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING *`,
          [
            id,
            item.product_id,
            item.sku,
            item.product_name,
            item.quantity,
            item.unit_cost,
            item.delivery_cost_per_unit,
            item.total_cost,
          ],
        )
        createdItems.push(itemResult.rows[0])
      }

      return {
        ...updatedPO,
        items: createdItems,
      }
    }

    // If no items update, fetch existing items
    const itemsResult = await client.query("SELECT * FROM purchase_order_items WHERE po_id = $1 ORDER BY created_at", [
      id,
    ])

    return {
      ...updatedPO,
      items: itemsResult.rows,
    }
  })
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await transaction(async (client: PoolClient) => {
    await client.query("DELETE FROM purchase_order_items WHERE po_id = $1", [id])
    await client.query("DELETE FROM purchase_orders WHERE id = $1", [id])
  })
}

// When a PO is marked as delivered, update inventory
export async function markPurchaseOrderDelivered(id: string): Promise<PurchaseOrder> {
  return await transaction(async (client: PoolClient) => {
    // Get the PO and its items
    const poResult = await client.query("SELECT * FROM purchase_orders WHERE id = $1", [id])
    const itemsResult = await client.query("SELECT * FROM purchase_order_items WHERE po_id = $1", [id])

    if (poResult.rows.length === 0) {
      throw new Error("Purchase order not found")
    }

    const po = poResult.rows[0]
    const items = itemsResult.rows

    // Update PO status
    await client.query("UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
      "delivered",
      id,
    ])

    // Update inventory for each item
    for (const item of items) {
      // Update product stock
      await client.query(
        "UPDATE products SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [item.quantity, item.product_id],
      )

      // Create inventory transaction
      await client.query(
        `INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_id, reference_type) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.product_id, "purchase", item.quantity, item.total_cost / item.quantity, id, "purchase_order"],
      )
    }

    // Return updated PO with items
    const updatedPO = { ...po, status: "delivered" as const }
    return {
      ...updatedPO,
      items,
    }
  })
}

// Shopify Order operations
export async function getShopifyOrders(): Promise<ShopifyOrder[]> {
  const result = await query(`
    SELECT 
      so.*,
      s.name as store_name,
      json_agg(
        json_build_object(
          'id', soi.id,
          'order_id', soi.order_id,
          'product_id', soi.product_id,
          'sku', soi.sku,
          'product_name', soi.product_name,
          'quantity', soi.quantity,
          'price', soi.price,
          'created_at', soi.created_at,
          'updated_at', soi.updated_at
        ) ORDER BY soi.created_at
      ) as items
    FROM shopify_orders so
    LEFT JOIN shopify_order_items soi ON so.id = soi.order_id
    LEFT JOIN stores s ON so.store_id = s.id
    GROUP BY so.id, s.name
    ORDER BY so.created_at DESC
  `)

  return result.rows.map((row) => ({
    ...row,
    items: row.items.filter((item: any) => item.id !== null),
  }))
}

export async function createShopifyOrder(
  order: Omit<ShopifyOrder, "id" | "created_at" | "updated_at" | "items">,
  items: Omit<ShopifyOrderItem, "id" | "order_id" | "created_at" | "updated_at">[],
): Promise<ShopifyOrder> {
  return await transaction(async (client: PoolClient) => {
    // Create shopify order
    const orderResult = await client.query(
      `INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_email, total_amount, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        order.store_id,
        order.shopify_order_id,
        order.order_number,
        order.customer_email,
        order.total_amount,
        order.status,
      ],
    )

    const createdOrder = orderResult.rows[0]

    // Create order items and update inventory
    const createdItems = []
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO shopify_order_items (order_id, product_id, sku, product_name, quantity, price) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [createdOrder.id, item.product_id, item.sku, item.product_name, item.quantity, item.price],
      )
      createdItems.push(itemResult.rows[0])

      // Update product stock (FIFO)
      await client.query(
        "UPDATE products SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [item.quantity, item.product_id],
      )

      // Create inventory transaction
      await client.query(
        `INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_id, reference_type) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.product_id, "sale", -item.quantity, item.price, createdOrder.id, "shopify_order"],
      )
    }

    return {
      ...createdOrder,
      items: createdItems,
    }
  })
}

// Inventory operations
export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  const result = await query(`
    SELECT 
      it.*,
      p.name as product_name,
      p.sku as product_sku
    FROM inventory_transactions it
    LEFT JOIN products p ON it.product_id = p.id
    ORDER BY it.created_at DESC
  `)
  return result.rows
}

export async function createInventoryAdjustment(
  productId: string,
  quantity: number,
  unitCost: number,
  notes?: string,
): Promise<InventoryTransaction> {
  return await transaction(async (client: PoolClient) => {
    // Update product stock
    await client.query(
      "UPDATE products SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [quantity, productId],
    )

    // Create inventory transaction
    const result = await client.query(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_id, reference_type) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [productId, "adjustment", quantity, unitCost, null, notes || "manual_adjustment"],
    )

    return result.rows[0]
  })
}
