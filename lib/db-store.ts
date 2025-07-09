import { executeQuery } from "./database"

// Purchase Order interfaces
export interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  order_date: string
  expected_delivery?: string
  status: "pending" | "approved" | "received" | "cancelled"
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreatePurchaseOrderData {
  po_number: string
  supplier_name: string
  order_date: string
  expected_delivery?: string
  status?: "pending" | "approved" | "received" | "cancelled"
  total_amount?: number
  notes?: string
}

// Purchase Order Store
export class PurchaseOrderStore {
  static async getAll(): Promise<PurchaseOrder[]> {
    const result = await executeQuery(`
      SELECT * FROM purchase_orders 
      ORDER BY created_at DESC
    `)
    return result.rows
  }

  static async getById(id: number): Promise<PurchaseOrder | null> {
    const result = await executeQuery("SELECT * FROM purchase_orders WHERE id = $1", [id])
    return result.rows[0] || null
  }

  static async create(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    const result = await executeQuery(
      `
      INSERT INTO purchase_orders (
        po_number, supplier_name, order_date, expected_delivery, 
        status, total_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        data.po_number,
        data.supplier_name,
        data.order_date,
        data.expected_delivery || null,
        data.status || "pending",
        data.total_amount || 0,
        data.notes || null,
      ],
    )
    return result.rows[0]
  }

  static async update(id: number, data: Partial<CreatePurchaseOrderData>): Promise<PurchaseOrder | null> {
    const fields = []
    const values = []
    let paramCount = 1

    if (data.po_number !== undefined) {
      fields.push(`po_number = $${paramCount++}`)
      values.push(data.po_number)
    }
    if (data.supplier_name !== undefined) {
      fields.push(`supplier_name = $${paramCount++}`)
      values.push(data.supplier_name)
    }
    if (data.order_date !== undefined) {
      fields.push(`order_date = $${paramCount++}`)
      values.push(data.order_date)
    }
    if (data.expected_delivery !== undefined) {
      fields.push(`expected_delivery = $${paramCount++}`)
      values.push(data.expected_delivery)
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`)
      values.push(data.status)
    }
    if (data.total_amount !== undefined) {
      fields.push(`total_amount = $${paramCount++}`)
      values.push(data.total_amount)
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`)
      values.push(data.notes)
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = await executeQuery(
      `
      UPDATE purchase_orders 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    const result = await executeQuery("DELETE FROM purchase_orders WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Inventory Item interfaces
export interface InventoryItem {
  id: number
  sku: string
  name: string
  description?: string
  category: string
  quantity: number
  unit_price: number
  reorder_level: number
  supplier: string
  created_at: string
  updated_at: string
}

export interface CreateInventoryItemData {
  sku: string
  name: string
  description?: string
  category: string
  quantity: number
  unit_price: number
  reorder_level: number
  supplier: string
}

// Inventory Store
export class InventoryStore {
  static async getAll(): Promise<InventoryItem[]> {
    const result = await executeQuery(`
      SELECT * FROM inventory_items 
      ORDER BY name ASC
    `)
    return result.rows
  }

  static async getById(id: number): Promise<InventoryItem | null> {
    const result = await executeQuery("SELECT * FROM inventory_items WHERE id = $1", [id])
    return result.rows[0] || null
  }

  static async create(data: CreateInventoryItemData): Promise<InventoryItem> {
    const result = await executeQuery(
      `
      INSERT INTO inventory_items (
        sku, name, description, category, quantity, 
        unit_price, reorder_level, supplier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        data.sku,
        data.name,
        data.description || null,
        data.category,
        data.quantity,
        data.unit_price,
        data.reorder_level,
        data.supplier,
      ],
    )
    return result.rows[0]
  }

  static async update(id: number, data: Partial<CreateInventoryItemData>): Promise<InventoryItem | null> {
    const fields = []
    const values = []
    let paramCount = 1

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`)
        values.push(value)
      }
    })

    if (fields.length === 0) {
      return this.getById(id)
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = await executeQuery(
      `
      UPDATE inventory_items 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    const result = await executeQuery("DELETE FROM inventory_items WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Shopify Store interfaces
export interface ShopifyStore {
  id: number
  store_name: string
  shop_domain: string
  access_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateShopifyStoreData {
  store_name: string
  shop_domain: string
  access_token: string
  is_active?: boolean
}

// Shopify Store Store
export class ShopifyStoreStore {
  static async getAll(): Promise<ShopifyStore[]> {
    const result = await executeQuery(`
      SELECT * FROM shopify_stores 
      ORDER BY store_name ASC
    `)
    return result.rows
  }

  static async getById(id: number): Promise<ShopifyStore | null> {
    const result = await executeQuery("SELECT * FROM shopify_stores WHERE id = $1", [id])
    return result.rows[0] || null
  }

  static async create(data: CreateShopifyStoreData): Promise<ShopifyStore> {
    const result = await executeQuery(
      `
      INSERT INTO shopify_stores (
        store_name, shop_domain, access_token, is_active
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [data.store_name, data.shop_domain, data.access_token, data.is_active !== undefined ? data.is_active : true],
    )
    return result.rows[0]
  }

  static async update(id: number, data: Partial<CreateShopifyStoreData>): Promise<ShopifyStore | null> {
    const fields = []
    const values = []
    let paramCount = 1

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`)
        values.push(value)
      }
    })

    if (fields.length === 0) {
      return this.getById(id)
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = await executeQuery(
      `
      UPDATE shopify_stores 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    const result = await executeQuery("DELETE FROM shopify_stores WHERE id = $1", [id])
    return result.rowCount > 0
  }
}
