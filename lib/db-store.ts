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
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_name VARCHAR(255) NOT NULL,
        order_date DATE NOT NULL,
        expected_delivery DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

  static async getAll(page = 1, limit = 10): Promise<{ data: PurchaseOrder[]; total: number }> {
    await this.ensureTable()

    const offset = (page - 1) * limit

    const countResult = await executeQuery("SELECT COUNT(*) FROM purchase_orders")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await executeQuery(
      `
      SELECT 
        id,
        po_number,
        supplier_name,
        order_date,
        expected_delivery,
        status,
        COALESCE(total_amount, 0) as total_amount,
        notes,
        created_at,
        updated_at
      FROM purchase_orders 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    return {
      data: result.rows,
      total,
    }
  }

  static async getById(id: number): Promise<PurchaseOrder | null> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id,
        po_number,
        supplier_name,
        order_date,
        expected_delivery,
        status,
        COALESCE(total_amount, 0) as total_amount,
        notes,
        created_at,
        updated_at
      FROM purchase_orders 
      WHERE id = $1
    `,
      [id],
    )
    return result.rows[0] || null
  }

  static async create(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      INSERT INTO purchase_orders (
        po_number, supplier_name, order_date, expected_delivery, 
        status, total_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        po_number,
        supplier_name,
        order_date,
        expected_delivery,
        status,
        COALESCE(total_amount, 0) as total_amount,
        notes,
        created_at,
        updated_at
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
    await this.ensureTable()
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
      RETURNING 
        id,
        po_number,
        supplier_name,
        order_date,
        expected_delivery,
        status,
        COALESCE(total_amount, 0) as total_amount,
        notes,
        created_at,
        updated_at
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    await this.ensureTable()
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
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 0,
        supplier VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

  static async getAll(page = 1, limit = 10): Promise<{ data: InventoryItem[]; total: number }> {
    await this.ensureTable()

    const offset = (page - 1) * limit

    const countResult = await executeQuery("SELECT COUNT(*) FROM inventory_items")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await executeQuery(
      `
      SELECT 
        id,
        sku,
        name,
        description,
        category,
        COALESCE(quantity, 0) as quantity,
        COALESCE(unit_price, 0) as unit_price,
        COALESCE(reorder_level, 0) as reorder_level,
        supplier,
        created_at,
        updated_at
      FROM inventory_items 
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    return {
      data: result.rows,
      total,
    }
  }

  static async getById(id: number): Promise<InventoryItem | null> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id,
        sku,
        name,
        description,
        category,
        COALESCE(quantity, 0) as quantity,
        COALESCE(unit_price, 0) as unit_price,
        COALESCE(reorder_level, 0) as reorder_level,
        supplier,
        created_at,
        updated_at
      FROM inventory_items 
      WHERE id = $1
    `,
      [id],
    )
    return result.rows[0] || null
  }

  static async create(data: CreateInventoryItemData): Promise<InventoryItem> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      INSERT INTO inventory_items (
        sku, name, description, category, quantity, 
        unit_price, reorder_level, supplier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        sku,
        name,
        description,
        category,
        COALESCE(quantity, 0) as quantity,
        COALESCE(unit_price, 0) as unit_price,
        COALESCE(reorder_level, 0) as reorder_level,
        supplier,
        created_at,
        updated_at
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
    await this.ensureTable()
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
      RETURNING 
        id,
        sku,
        name,
        description,
        category,
        COALESCE(quantity, 0) as quantity,
        COALESCE(unit_price, 0) as unit_price,
        COALESCE(reorder_level, 0) as reorder_level,
        supplier,
        created_at,
        updated_at
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    await this.ensureTable()
    const result = await executeQuery("DELETE FROM inventory_items WHERE id = $1", [id])
    return result.rowCount > 0
  }
}
