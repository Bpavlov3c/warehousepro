import { query } from "./database"

// Type definitions
export interface Product {
  id: number
  sku: string
  product_name: string
  description?: string
  category?: string
  unit_of_measure: string
  reorder_level: number
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost: number
  status: "Pending" | "Approved" | "Delivered" | "Cancelled"
  notes?: string
  created_at: string
  updated_at: string
  items?: POItem[]
}

export interface POItem {
  id: number
  po_id: number
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  created_at: string
}

export interface InventoryItem {
  id: number
  sku: string
  product_name: string
  po_id?: number
  batch_date: string
  quantity_received: number
  quantity_remaining: number
  unit_cost: number
  location?: string
  expiry_date?: string
  created_at: string
  updated_at: string
}

export interface ShopifyStore {
  id: number
  store_name: string
  shop_domain: string
  access_token?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ShopifyOrder {
  id: number
  shopify_order_id: number
  store_id: number
  order_number: string
  customer_email?: string
  customer_name?: string
  order_date: string
  total_amount: number
  currency: string
  fulfillment_status: string
  financial_status: string
  created_at: string
  updated_at: string
  items?: ShopifyOrderItem[]
}

export interface ShopifyOrderItem {
  id: number
  order_id: number
  shopify_variant_id?: number
  sku?: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Purchase Orders
export class PurchaseOrderStore {
  static async getAll(page = 1, limit = 10): Promise<PaginatedResult<PurchaseOrder>> {
    const offset = (page - 1) * limit

    const countResult = await query("SELECT COUNT(*) FROM purchase_orders")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await query(
      `
      SELECT po.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', poi.id,
                   'po_id', poi.po_id,
                   'sku', poi.sku,
                   'product_name', poi.product_name,
                   'quantity', poi.quantity,
                   'unit_cost', poi.unit_cost,
                   'total_cost', poi.total_cost,
                   'created_at', poi.created_at
                 ) ORDER BY poi.id
               ) FILTER (WHERE poi.id IS NOT NULL), 
               '[]'
             ) as items
      FROM purchase_orders po
      LEFT JOIN po_items poi ON po.id = poi.po_id
      GROUP BY po.id
      ORDER BY po.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    return {
      data: result.rows.map((row) => ({
        ...row,
        delivery_cost: Number.parseFloat(row.delivery_cost) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  static async getById(id: number): Promise<PurchaseOrder | null> {
    const result = await query(
      `
      SELECT po.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', poi.id,
                   'po_id', poi.po_id,
                   'sku', poi.sku,
                   'product_name', poi.product_name,
                   'quantity', poi.quantity,
                   'unit_cost', poi.unit_cost,
                   'total_cost', poi.total_cost,
                   'created_at', poi.created_at
                 ) ORDER BY poi.id
               ) FILTER (WHERE poi.id IS NOT NULL), 
               '[]'
             ) as items
      FROM purchase_orders po
      LEFT JOIN po_items poi ON po.id = poi.po_id
      WHERE po.id = $1
      GROUP BY po.id
    `,
      [id],
    )

    if (result.rows.length === 0) return null

    return {
      ...result.rows[0],
      delivery_cost: Number.parseFloat(result.rows[0].delivery_cost) || 0,
    }
  }

  static async create(data: Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "items">): Promise<PurchaseOrder> {
    const result = await query(
      `
      INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [data.po_number, data.supplier_name, data.po_date, data.delivery_cost, data.status, data.notes],
    )

    return {
      ...result.rows[0],
      delivery_cost: Number.parseFloat(result.rows[0].delivery_cost) || 0,
    }
  }

  static async update(
    id: number,
    data: Partial<Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "items">>,
  ): Promise<PurchaseOrder | null> {
    const fields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

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

    if (result.rows.length === 0) return null

    return {
      ...result.rows[0],
      delivery_cost: Number.parseFloat(result.rows[0].delivery_cost) || 0,
    }
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query("DELETE FROM purchase_orders WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Products
export class ProductStore {
  static async getAll(page = 1, limit = 10): Promise<PaginatedResult<Product>> {
    const offset = (page - 1) * limit

    const countResult = await query("SELECT COUNT(*) FROM products")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await query(
      `
      SELECT * FROM products
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  static async getById(id: number): Promise<Product | null> {
    const result = await query("SELECT * FROM products WHERE id = $1", [id])
    return result.rows[0] || null
  }

  static async getBySku(sku: string): Promise<Product | null> {
    const result = await query("SELECT * FROM products WHERE sku = $1", [sku])
    return result.rows[0] || null
  }

  static async create(data: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
    const result = await query(
      `
      INSERT INTO products (sku, product_name, description, category, unit_of_measure, reorder_level)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [data.sku, data.product_name, data.description, data.category, data.unit_of_measure, data.reorder_level],
    )

    return result.rows[0]
  }

  static async update(
    id: number,
    data: Partial<Omit<Product, "id" | "created_at" | "updated_at">>,
  ): Promise<Product | null> {
    const fields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

    values.push(id)

    const result = await query(
      `
      UPDATE products 
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query("DELETE FROM products WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Inventory
export class InventoryStore {
  static async getAll(page = 1, limit = 10): Promise<PaginatedResult<InventoryItem>> {
    const offset = (page - 1) * limit

    const countResult = await query("SELECT COUNT(*) FROM inventory")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await query(
      `
      SELECT i.*, po.po_number, po.supplier_name
      FROM inventory i
      LEFT JOIN purchase_orders po ON i.po_id = po.id
      ORDER BY i.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    return {
      data: result.rows.map((row) => ({
        ...row,
        unit_cost: Number.parseFloat(row.unit_cost) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  static async getInventorySummary(): Promise<any[]> {
    const result = await query("SELECT * FROM product_inventory_summary ORDER BY product_name")
    return result.rows.map((row) => ({
      ...row,
      avg_unit_cost: Number.parseFloat(row.avg_unit_cost) || 0,
      total_value: Number.parseFloat(row.total_value) || 0,
    }))
  }

  static async getById(id: number): Promise<InventoryItem | null> {
    const result = await query("SELECT * FROM inventory WHERE id = $1", [id])
    if (result.rows.length === 0) return null

    return {
      ...result.rows[0],
      unit_cost: Number.parseFloat(result.rows[0].unit_cost) || 0,
    }
  }

  static async create(data: Omit<InventoryItem, "id" | "created_at" | "updated_at">): Promise<InventoryItem> {
    const result = await query(
      `
      INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location, expiry_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        data.sku,
        data.product_name,
        data.po_id,
        data.batch_date,
        data.quantity_received,
        data.quantity_remaining,
        data.unit_cost,
        data.location,
        data.expiry_date,
      ],
    )

    return {
      ...result.rows[0],
      unit_cost: Number.parseFloat(result.rows[0].unit_cost) || 0,
    }
  }

  static async update(
    id: number,
    data: Partial<Omit<InventoryItem, "id" | "created_at" | "updated_at">>,
  ): Promise<InventoryItem | null> {
    const fields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

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

    if (result.rows.length === 0) return null

    return {
      ...result.rows[0],
      unit_cost: Number.parseFloat(result.rows[0].unit_cost) || 0,
    }
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query("DELETE FROM inventory WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Shopify Stores
export class ShopifyStoreStore {
  static async getAll(): Promise<ShopifyStore[]> {
    const result = await query("SELECT * FROM shopify_stores ORDER BY created_at DESC")
    return result.rows
  }

  static async getById(id: number): Promise<ShopifyStore | null> {
    const result = await query("SELECT * FROM shopify_stores WHERE id = $1", [id])
    return result.rows[0] || null
  }

  static async create(data: Omit<ShopifyStore, "id" | "created_at" | "updated_at">): Promise<ShopifyStore> {
    const result = await query(
      `
      INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [data.store_name, data.shop_domain, data.access_token, data.is_active],
    )

    return result.rows[0]
  }

  static async update(
    id: number,
    data: Partial<Omit<ShopifyStore, "id" | "created_at" | "updated_at">>,
  ): Promise<ShopifyStore | null> {
    const fields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

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

  static async delete(id: number): Promise<boolean> {
    const result = await query("DELETE FROM shopify_stores WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Shopify Orders
export class ShopifyOrderStore {
  static async getAll(page = 1, limit = 10): Promise<PaginatedResult<ShopifyOrder>> {
    const offset = (page - 1) * limit

    const countResult = await query("SELECT COUNT(*) FROM shopify_orders")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await query(
      `
      SELECT so.*, ss.store_name,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', soi.id,
                   'order_id', soi.order_id,
                   'shopify_variant_id', soi.shopify_variant_id,
                   'sku', soi.sku,
                   'product_name', soi.product_name,
                   'quantity', soi.quantity,
                   'unit_price', soi.unit_price,
                   'total_price', soi.total_price,
                   'created_at', soi.created_at
                 ) ORDER BY soi.id
               ) FILTER (WHERE soi.id IS NOT NULL), 
               '[]'
             ) as items
      FROM shopify_orders so
      LEFT JOIN shopify_stores ss ON so.store_id = ss.id
      LEFT JOIN shopify_order_items soi ON so.id = soi.order_id
      GROUP BY so.id, ss.store_name
      ORDER BY so.order_date DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    return {
      data: result.rows.map((row) => ({
        ...row,
        total_amount: Number.parseFloat(row.total_amount) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  static async getById(id: number): Promise<ShopifyOrder | null> {
    const result = await query(
      `
      SELECT so.*, ss.store_name,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', soi.id,
                   'order_id', soi.order_id,
                   'shopify_variant_id', soi.shopify_variant_id,
                   'sku', soi.sku,
                   'product_name', soi.product_name,
                   'quantity', soi.quantity,
                   'unit_price', soi.unit_price,
                   'total_price', soi.total_price,
                   'created_at', soi.created_at
                 ) ORDER BY soi.id
               ) FILTER (WHERE soi.id IS NOT NULL), 
               '[]'
             ) as items
      FROM shopify_orders so
      LEFT JOIN shopify_stores ss ON so.store_id = ss.id
      LEFT JOIN shopify_order_items soi ON so.id = soi.order_id
      WHERE so.id = $1
      GROUP BY so.id, ss.store_name
    `,
      [id],
    )

    if (result.rows.length === 0) return null

    return {
      ...result.rows[0],
      total_amount: Number.parseFloat(result.rows[0].total_amount) || 0,
    }
  }

  static async create(data: Omit<ShopifyOrder, "id" | "created_at" | "updated_at" | "items">): Promise<ShopifyOrder> {
    const result = await query(
      `
      INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, currency, fulfillment_status, financial_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        data.shopify_order_id,
        data.store_id,
        data.order_number,
        data.customer_email,
        data.customer_name,
        data.order_date,
        data.total_amount,
        data.currency,
        data.fulfillment_status,
        data.financial_status,
      ],
    )

    return {
      ...result.rows[0],
      total_amount: Number.parseFloat(result.rows[0].total_amount) || 0,
    }
  }

  static async update(
    id: number,
    data: Partial<Omit<ShopifyOrder, "id" | "created_at" | "updated_at" | "items">>,
  ): Promise<ShopifyOrder | null> {
    const fields = []
    const values = []
    let paramCount = 1

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

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

    if (result.rows.length === 0) return null

    return {
      ...result.rows[0],
      total_amount: Number.parseFloat(result.rows[0].total_amount) || 0,
    }
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query("DELETE FROM shopify_orders WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Export all stores
