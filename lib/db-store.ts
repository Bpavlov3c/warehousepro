import { executeQuery } from "./database"

// Purchase Order interfaces
export interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost: number
  status: "Pending" | "Approved" | "Delivered" | "Cancelled"
  notes?: string
  items?: POItem[]
  created_at: string
  updated_at: string
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

export interface CreatePurchaseOrderData {
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost?: number
  status?: "Pending" | "Approved" | "Delivered" | "Cancelled"
  notes?: string
  items?: CreatePOItemData[]
}

export interface CreatePOItemData {
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
}

// Product interfaces
export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  min_stock: number
  max_stock: number
  created_at: string
  updated_at: string
}

export interface CreateProductData {
  sku: string
  name: string
  description?: string
  min_stock?: number
  max_stock?: number
}

// Inventory interfaces
export interface Inventory {
  id: number
  product_id: number
  po_item_id: number
  quantity_available: number
  unit_cost: number
  purchase_date: string
  created_at: string
}

export interface ProductInventorySummary {
  sku: string
  name: string
  current_stock: number
  avg_cost: number
  total_value: number
  min_stock: number
  max_stock: number
}

// Shopify Store interfaces
export interface ShopifyStore {
  id: number
  name: string
  shopify_domain: string
  access_token: string
  webhook_url?: string
  status: "Active" | "Inactive" | "Error"
  last_sync?: string
  created_at: string
}

export interface CreateShopifyStoreData {
  name: string
  shopify_domain: string
  access_token: string
  webhook_url?: string
  status?: "Active" | "Inactive" | "Error"
}

// Shopify Order interfaces
export interface ShopifyOrder {
  id: number
  store_id: number
  shopify_order_id: string
  order_number: string
  customer_name?: string
  customer_email?: string
  order_date: string
  status: string
  total_amount: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  shipping_address?: string
  items?: ShopifyOrderItem[]
  created_at: string
}

export interface ShopifyOrderItem {
  id: number
  order_id: number
  sku: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

// Purchase Order Store
export class PurchaseOrderStore {
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        po_date DATE NOT NULL,
        delivery_cost DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS po_items (
        id SERIAL PRIMARY KEY,
        po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        po_date,
        COALESCE(delivery_cost, 0) as delivery_cost,
        status,
        notes,
        created_at,
        updated_at
      FROM purchase_orders 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    // Get items for each PO
    const orders = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await executeQuery(
          `
          SELECT 
            id, po_id, sku, product_name, quantity, 
            unit_cost, total_cost, created_at
          FROM po_items 
          WHERE po_id = $1
          ORDER BY created_at
        `,
          [order.id],
        )
        return {
          ...order,
          items: itemsResult.rows,
        }
      }),
    )

    return {
      data: orders,
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
        po_date,
        COALESCE(delivery_cost, 0) as delivery_cost,
        status,
        notes,
        created_at,
        updated_at
      FROM purchase_orders 
      WHERE id = $1
    `,
      [id],
    )

    if (result.rows.length === 0) return null

    const order = result.rows[0]

    // Get items for this PO
    const itemsResult = await executeQuery(
      `
      SELECT 
        id, po_id, sku, product_name, quantity, 
        unit_cost, total_cost, created_at
      FROM po_items 
      WHERE po_id = $1
      ORDER BY created_at
    `,
      [id],
    )

    return {
      ...order,
      items: itemsResult.rows,
    }
  }

  static async create(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    await this.ensureTable()

    // Create the purchase order
    const result = await executeQuery(
      `
      INSERT INTO purchase_orders (
        po_number, supplier_name, po_date, delivery_cost, 
        status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        po_number,
        supplier_name,
        po_date,
        COALESCE(delivery_cost, 0) as delivery_cost,
        status,
        notes,
        created_at,
        updated_at
    `,
      [
        data.po_number,
        data.supplier_name,
        data.po_date,
        data.delivery_cost || 0,
        data.status || "Pending",
        data.notes || null,
      ],
    )

    const order = result.rows[0]

    // Create PO items if provided
    if (data.items && data.items.length > 0) {
      const items = await Promise.all(
        data.items.map(async (item) => {
          const itemResult = await executeQuery(
            `
            INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, po_id, sku, product_name, quantity, unit_cost, total_cost, created_at
          `,
            [order.id, item.sku, item.product_name, item.quantity, item.unit_cost],
          )
          return itemResult.rows[0]
        }),
      )
      order.items = items
    }

    return order
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
    if (data.po_date !== undefined) {
      fields.push(`po_date = $${paramCount++}`)
      values.push(data.po_date)
    }
    if (data.delivery_cost !== undefined) {
      fields.push(`delivery_cost = $${paramCount++}`)
      values.push(data.delivery_cost)
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`)
      values.push(data.status)
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`)
      values.push(data.notes)
    }

    if (fields.length === 0) {
      return this.getById(id)
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
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
        po_date,
        COALESCE(delivery_cost, 0) as delivery_cost,
        status,
        notes,
        created_at,
        updated_at
    `,
      values,
    )

    if (result.rows.length === 0) return null

    return this.getById(id)
  }

  static async delete(id: number): Promise<boolean> {
    await this.ensureTable()
    const result = await executeQuery("DELETE FROM purchase_orders WHERE id = $1", [id])
    return result.rowCount > 0
  }

  static async addItem(poId: number, item: CreatePOItemData): Promise<POItem | null> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, po_id, sku, product_name, quantity, unit_cost, total_cost, created_at
    `,
      [poId, item.sku, item.product_name, item.quantity, item.unit_cost],
    )
    return result.rows[0] || null
  }

  static async updateItem(itemId: number, data: Partial<CreatePOItemData>): Promise<POItem | null> {
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

    if (fields.length === 0) return null

    values.push(itemId)

    const result = await executeQuery(
      `
      UPDATE po_items 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, po_id, sku, product_name, quantity, unit_cost, total_cost, created_at
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async deleteItem(itemId: number): Promise<boolean> {
    await this.ensureTable()
    const result = await executeQuery("DELETE FROM po_items WHERE id = $1", [itemId])
    return result.rowCount > 0
  }
}

// Product Store
export class ProductStore {
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        min_stock INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  static async getAll(page = 1, limit = 10): Promise<{ data: Product[]; total: number }> {
    await this.ensureTable()

    const offset = (page - 1) * limit

    const countResult = await executeQuery("SELECT COUNT(*) FROM products")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await executeQuery(
      `
      SELECT 
        id, sku, name, description, min_stock, max_stock, created_at, updated_at
      FROM products 
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

  static async getById(id: number): Promise<Product | null> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id, sku, name, description, min_stock, max_stock, created_at, updated_at
      FROM products 
      WHERE id = $1
    `,
      [id],
    )
    return result.rows[0] || null
  }

  static async getBySku(sku: string): Promise<Product | null> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id, sku, name, description, min_stock, max_stock, created_at, updated_at
      FROM products 
      WHERE sku = $1
    `,
      [sku],
    )
    return result.rows[0] || null
  }

  static async create(data: CreateProductData): Promise<Product> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      INSERT INTO products (sku, name, description, min_stock, max_stock)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, sku, name, description, min_stock, max_stock, created_at, updated_at
    `,
      [data.sku, data.name, data.description || null, data.min_stock || 0, data.max_stock || 100],
    )
    return result.rows[0]
  }

  static async update(id: number, data: Partial<CreateProductData>): Promise<Product | null> {
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

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await executeQuery(
      `
      UPDATE products 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, sku, name, description, min_stock, max_stock, created_at, updated_at
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async delete(id: number): Promise<boolean> {
    await this.ensureTable()
    const result = await executeQuery("DELETE FROM products WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Inventory Store
export class InventoryStore {
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        po_item_id INTEGER REFERENCES po_items(id) ON DELETE CASCADE,
        quantity_available INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        purchase_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create the view if it doesn't exist
    await executeQuery(`
      CREATE OR REPLACE VIEW product_inventory_summary AS
      SELECT 
        p.sku,
        p.name,
        COALESCE(SUM(i.quantity_available), 0) as current_stock,
        COALESCE(AVG(i.unit_cost), 0) as avg_cost,
        COALESCE(SUM(i.quantity_available * i.unit_cost), 0) as total_value,
        p.min_stock,
        p.max_stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      GROUP BY p.id, p.sku, p.name, p.min_stock, p.max_stock;
    `)
  }

  static async getInventorySummary(page = 1, limit = 10): Promise<{ data: ProductInventorySummary[]; total: number }> {
    await this.ensureTable()

    const offset = (page - 1) * limit

    const countResult = await executeQuery("SELECT COUNT(*) FROM products")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await executeQuery(
      `
      SELECT * FROM product_inventory_summary 
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

  static async getByProduct(productId: number): Promise<Inventory[]> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id, product_id, po_item_id, quantity_available, 
        unit_cost, purchase_date, created_at
      FROM inventory 
      WHERE product_id = $1
      ORDER BY purchase_date ASC
    `,
      [productId],
    )
    return result.rows
  }

  static async addStock(
    productId: number,
    poItemId: number,
    quantity: number,
    unitCost: number,
    purchaseDate: string,
  ): Promise<Inventory> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, product_id, po_item_id, quantity_available, unit_cost, purchase_date, created_at
    `,
      [productId, poItemId, quantity, unitCost, purchaseDate],
    )
    return result.rows[0]
  }

  static async reduceStock(productId: number, quantityToReduce: number): Promise<boolean> {
    await this.ensureTable()

    // Get available inventory for this product (FIFO order)
    const inventoryResult = await executeQuery(
      `
      SELECT id, quantity_available FROM inventory 
      WHERE product_id = $1 AND quantity_available > 0
      ORDER BY purchase_date ASC
    `,
      [productId],
    )

    let remainingToReduce = quantityToReduce

    for (const inv of inventoryResult.rows) {
      if (remainingToReduce <= 0) break

      const reduceFromThis = Math.min(remainingToReduce, inv.quantity_available)
      const newQuantity = inv.quantity_available - reduceFromThis

      await executeQuery(`UPDATE inventory SET quantity_available = $1 WHERE id = $2`, [newQuantity, inv.id])

      remainingToReduce -= reduceFromThis
    }

    return remainingToReduce === 0
  }
}

// Shopify Store Management
export class ShopifyStoreStore {
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        shopify_domain VARCHAR(255) NOT NULL,
        access_token VARCHAR(255) NOT NULL,
        webhook_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'Active',
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  static async getAll(): Promise<ShopifyStore[]> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id, name, shopify_domain, access_token, webhook_url, 
        status, last_sync, created_at
      FROM shopify_stores 
      ORDER BY created_at DESC
    `,
    )
    return result.rows
  }

  static async getById(id: number): Promise<ShopifyStore | null> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      SELECT 
        id, name, shopify_domain, access_token, webhook_url, 
        status, last_sync, created_at
      FROM shopify_stores 
      WHERE id = $1
    `,
      [id],
    )
    return result.rows[0] || null
  }

  static async create(data: CreateShopifyStoreData): Promise<ShopifyStore> {
    await this.ensureTable()
    const result = await executeQuery(
      `
      INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, shopify_domain, access_token, webhook_url, status, last_sync, created_at
    `,
      [data.name, data.shopify_domain, data.access_token, data.webhook_url || null, data.status || "Active"],
    )
    return result.rows[0]
  }

  static async update(id: number, data: Partial<CreateShopifyStoreData>): Promise<ShopifyStore | null> {
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

    values.push(id)

    const result = await executeQuery(
      `
      UPDATE shopify_stores 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, shopify_domain, access_token, webhook_url, status, last_sync, created_at
    `,
      values,
    )

    return result.rows[0] || null
  }

  static async updateLastSync(id: number): Promise<boolean> {
    await this.ensureTable()
    const result = await executeQuery(`UPDATE shopify_stores SET last_sync = CURRENT_TIMESTAMP WHERE id = $1`, [id])
    return result.rowCount > 0
  }

  static async delete(id: number): Promise<boolean> {
    await this.ensureTable()
    const result = await executeQuery("DELETE FROM shopify_stores WHERE id = $1", [id])
    return result.rowCount > 0
  }
}

// Shopify Orders Store
export class ShopifyOrderStore {
  private static async ensureTable() {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_orders (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES shopify_stores(id) ON DELETE CASCADE,
        shopify_order_id VARCHAR(100) NOT NULL,
        order_number VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        order_date TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        shipping_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(store_id, shopify_order_id)
      );
    `)

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES shopify_orders(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  static async getAll(page = 1, limit = 10): Promise<{ data: ShopifyOrder[]; total: number }> {
    await this.ensureTable()

    const offset = (page - 1) * limit

    const countResult = await executeQuery("SELECT COUNT(*) FROM shopify_orders")
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await executeQuery(
      `
      SELECT 
        id, store_id, shopify_order_id, order_number, customer_name, customer_email,
        order_date, status, total_amount, shipping_cost, tax_amount, discount_amount,
        shipping_address, created_at
      FROM shopify_orders 
      ORDER BY order_date DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    // Get items for each order
    const orders = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await executeQuery(
          `
          SELECT 
            id, order_id, sku, product_name, quantity, 
            unit_price, total_price, created_at
          FROM shopify_order_items 
          WHERE order_id = $1
          ORDER BY created_at
        `,
          [order.id],
        )
        return {
          ...order,
          items: itemsResult.rows,
        }
      }),
    )

    return {
      data: orders,
      total,
    }
  }

  static async create(
    storeId: number,
    orderData: Omit<ShopifyOrder, "id" | "store_id" | "created_at">,
    items: Omit<ShopifyOrderItem, "id" | "order_id" | "total_price" | "created_at">[],
  ): Promise<ShopifyOrder> {
    await this.ensureTable()

    // Create the order
    const orderResult = await executeQuery(
      `
      INSERT INTO shopify_orders (
        store_id, shopify_order_id, order_number, customer_name, customer_email,
        order_date, status, total_amount, shipping_cost, tax_amount, discount_amount,
        shipping_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, store_id, shopify_order_id, order_number, customer_name, customer_email,
        order_date, status, total_amount, shipping_cost, tax_amount, discount_amount,
        shipping_address, created_at
    `,
      [
        storeId,
        orderData.shopify_order_id,
        orderData.order_number,
        orderData.customer_name || null,
        orderData.customer_email || null,
        orderData.order_date,
        orderData.status,
        orderData.total_amount,
        orderData.shipping_cost || 0,
        orderData.tax_amount || 0,
        orderData.discount_amount || 0,
        orderData.shipping_address || null,
      ],
    )

    const order = orderResult.rows[0]

    // Create order items
    if (items && items.length > 0) {
      const orderItems = await Promise.all(
        items.map(async (item) => {
          const itemResult = await executeQuery(
            `
            INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, order_id, sku, product_name, quantity, unit_price, total_price, created_at
          `,
            [order.id, item.sku, item.product_name, item.quantity, item.unit_price],
          )
          return itemResult.rows[0]
        }),
      )
      order.items = orderItems
    }

    return order
  }

  static async getByStore(storeId: number, page = 1, limit = 10): Promise<{ data: ShopifyOrder[]; total: number }> {
    await this.ensureTable()

    const offset = (page - 1) * limit

    const countResult = await executeQuery("SELECT COUNT(*) FROM shopify_orders WHERE store_id = $1", [storeId])
    const total = Number.parseInt(countResult.rows[0].count)

    const result = await executeQuery(
      `
      SELECT 
        id, store_id, shopify_order_id, order_number, customer_name, customer_email,
        order_date, status, total_amount, shipping_cost, tax_amount, discount_amount,
        shipping_address, created_at
      FROM shopify_orders 
      WHERE store_id = $1
      ORDER BY order_date DESC
      LIMIT $2 OFFSET $3
    `,
      [storeId, limit, offset],
    )

    return {
      data: result.rows,
      total,
    }
  }
}
