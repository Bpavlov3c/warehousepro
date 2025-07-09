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
  supplier: string
  orderDate: string
  expectedDelivery: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  items: PurchaseOrderItem[]
  totalCost: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productName: string
  sku: string
  quantity: number
  unitCost: number
  deliveryCostPerUnit: number
  totalCost: number
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

export interface InventoryItem {
  id: string
  sku: string
  productName: string
  category: string
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderPoint: number
  reorderQuantity: number
  averageCost: number
  lastUpdated: string
  location?: string
  supplier?: string
}

export interface InventoryTransaction {
  id: string
  inventoryItemId: string
  type: "purchase" | "sale" | "adjustment" | "transfer"
  quantity: number
  unitCost?: number
  reference?: string
  notes?: string
  createdAt: string
}

export interface ShopifyStore {
  id: string
  name: string
  domain: string
  accessToken: string
  isActive: boolean
  lastSync?: string
  createdAt: string
  updatedAt: string
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
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const result = await query(`
    SELECT 
      po.*,
      json_agg(
        json_build_object(
          'id', poi.id,
          'purchaseOrderId', poi.purchase_order_id,
          'productName', poi.product_name,
          'sku', poi.sku,
          'quantity', poi.quantity,
          'unitCost', poi.unit_cost,
          'deliveryCostPerUnit', poi.delivery_cost_per_unit,
          'totalCost', poi.total_cost
        ) ORDER BY poi.product_name
      ) as items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    GROUP BY po.id
    ORDER BY po.order_date DESC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    supplier: row.supplier,
    orderDate: row.order_date,
    expectedDelivery: row.expected_delivery,
    status: row.status,
    totalCost: Number.parseFloat(row.total_cost),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.items.filter((item: any) => item.id !== null),
  }))
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  const result = await query(
    `
    SELECT 
      po.*,
      json_agg(
        json_build_object(
          'id', poi.id,
          'purchaseOrderId', poi.purchase_order_id,
          'productName', poi.product_name,
          'sku', poi.sku,
          'quantity', poi.quantity,
          'unitCost', poi.unit_cost,
          'deliveryCostPerUnit', poi.delivery_cost_per_unit,
          'totalCost', poi.total_cost
        ) ORDER BY poi.product_name
      ) as items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
    WHERE po.id = $1
    GROUP BY po.id
  `,
    [id],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    supplier: row.supplier,
    orderDate: row.order_date,
    expectedDelivery: row.expected_delivery,
    status: row.status,
    totalCost: Number.parseFloat(row.total_cost),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.items.filter((item: any) => item.id !== null),
  }
}

export async function createPurchaseOrder(
  po: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">,
): Promise<PurchaseOrder> {
  return await transaction(async (client: PoolClient) => {
    // Insert purchase order
    const poResult = await client.query(
      `
      INSERT INTO purchase_orders (supplier, order_date, expected_delivery, status, total_cost, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [po.supplier, po.orderDate, po.expectedDelivery, po.status, po.totalCost, po.notes],
    )

    const purchaseOrderId = poResult.rows[0].id

    // Insert purchase order items
    const items: PurchaseOrderItem[] = []
    for (const item of po.items) {
      const itemResult = await client.query(
        `
        INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          purchaseOrderId,
          item.productName,
          item.sku,
          item.quantity,
          item.unitCost,
          item.deliveryCostPerUnit,
          item.totalCost,
        ],
      )

      items.push({
        id: itemResult.rows[0].id,
        purchaseOrderId: itemResult.rows[0].purchase_order_id,
        productName: itemResult.rows[0].product_name,
        sku: itemResult.rows[0].sku,
        quantity: itemResult.rows[0].quantity,
        unitCost: Number.parseFloat(itemResult.rows[0].unit_cost),
        deliveryCostPerUnit: Number.parseFloat(itemResult.rows[0].delivery_cost_per_unit),
        totalCost: Number.parseFloat(itemResult.rows[0].total_cost),
      })
    }

    const createdPO = poResult.rows[0]
    return {
      id: createdPO.id,
      supplier: createdPO.supplier,
      orderDate: createdPO.order_date,
      expectedDelivery: createdPO.expected_delivery,
      status: createdPO.status,
      totalCost: Number.parseFloat(createdPO.total_cost),
      notes: createdPO.notes,
      createdAt: createdPO.created_at,
      updatedAt: createdPO.updated_at,
      items,
    }
  })
}

export async function updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> {
  return await transaction(async (client: PoolClient) => {
    // Update purchase order
    const poResult = await client.query(
      `
      UPDATE purchase_orders 
      SET supplier = COALESCE($2, supplier),
          order_date = COALESCE($3, order_date),
          expected_delivery = COALESCE($4, expected_delivery),
          status = COALESCE($5, status),
          total_cost = COALESCE($6, total_cost),
          notes = COALESCE($7, notes),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
      [
        id,
        updates.supplier,
        updates.orderDate,
        updates.expectedDelivery,
        updates.status,
        updates.totalCost,
        updates.notes,
      ],
    )

    if (poResult.rows.length === 0) return null

    // If items are provided, update them
    if (updates.items) {
      // Delete existing items
      await client.query("DELETE FROM purchase_order_items WHERE purchase_order_id = $1", [id])

      // Insert new items
      for (const item of updates.items) {
        await client.query(
          `
          INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [id, item.productName, item.sku, item.quantity, item.unitCost, item.deliveryCostPerUnit, item.totalCost],
        )
      }
    }

    // Return updated purchase order
    return await getPurchaseOrderById(id)
  })
}

export async function deletePurchaseOrder(id: string): Promise<boolean> {
  return await transaction(async (client: PoolClient) => {
    // Delete items first (foreign key constraint)
    await client.query("DELETE FROM purchase_order_items WHERE purchase_order_id = $1", [id])

    // Delete purchase order
    const result = await client.query("DELETE FROM purchase_orders WHERE id = $1", [id])

    return result.rowCount > 0
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
        [createdOrder.id, item.product_id, item.product_name, item.sku, item.quantity, item.price],
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

// Shopify Stores
export async function getAllShopifyStores(): Promise<ShopifyStore[]> {
  const result = await query(`
    SELECT * FROM shopify_stores 
    ORDER BY name
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    accessToken: row.access_token,
    isActive: row.is_active,
    lastSync: row.last_sync,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function getShopifyStoreById(id: string): Promise<ShopifyStore | null> {
  const result = await query("SELECT * FROM shopify_stores WHERE id = $1", [id])

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    accessToken: row.access_token,
    isActive: row.is_active,
    lastSync: row.last_sync,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createShopifyStore(
  store: Omit<ShopifyStore, "id" | "createdAt" | "updatedAt">,
): Promise<ShopifyStore> {
  const result = await query(
    `
    INSERT INTO shopify_stores (name, domain, access_token, is_active, last_sync)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    [store.name, store.domain, store.accessToken, store.isActive, store.lastSync],
  )

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    accessToken: row.access_token,
    isActive: row.is_active,
    lastSync: row.last_sync,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function updateShopifyStore(id: string, updates: Partial<ShopifyStore>): Promise<ShopifyStore | null> {
  const result = await query(
    `
    UPDATE shopify_stores 
    SET name = COALESCE($2, name),
        domain = COALESCE($3, domain),
        access_token = COALESCE($4, access_token),
        is_active = COALESCE($5, is_active),
        last_sync = COALESCE($6, last_sync),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
    [id, updates.name, updates.domain, updates.accessToken, updates.isActive, updates.lastSync],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    accessToken: row.access_token,
    isActive: row.is_active,
    lastSync: row.last_sync,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function deleteShopifyStore(id: string): Promise<boolean> {
  const result = await query("DELETE FROM shopify_stores WHERE id = $1", [id])
  return result.rowCount > 0
}

// Inventory Transactions
export async function createInventoryTransaction(
  transaction: Omit<InventoryTransaction, "id" | "createdAt">,
): Promise<InventoryTransaction> {
  const result = await query(
    `
    INSERT INTO inventory_transactions (inventory_item_id, type, quantity, unit_cost, reference, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
    [
      transaction.inventoryItemId,
      transaction.type,
      transaction.quantity,
      transaction.unitCost,
      transaction.reference,
      transaction.notes,
    ],
  )

  const row = result.rows[0]
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    type: row.type,
    quantity: row.quantity,
    unitCost: row.unit_cost ? Number.parseFloat(row.unit_cost) : undefined,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export async function getInventoryTransactionsByItemId(inventoryItemId: string): Promise<InventoryTransaction[]> {
  const result = await query(
    `
    SELECT * FROM inventory_transactions 
    WHERE inventory_item_id = $1 
    ORDER BY created_at DESC
  `,
    [inventoryItemId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    type: row.type,
    quantity: row.quantity,
    unitCost: row.unit_cost ? Number.parseFloat(row.unit_cost) : undefined,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
  }))
}

// Inventory Items
export async function getAllInventoryItems(): Promise<InventoryItem[]> {
  const result = await query(`
    SELECT * FROM inventory_items 
    ORDER BY product_name
  `)

  return result.rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    productName: row.product_name,
    category: row.category,
    currentStock: row.current_stock,
    reservedStock: row.reserved_stock,
    availableStock: row.available_stock,
    reorderPoint: row.reorder_point,
    reorderQuantity: row.reorder_quantity,
    averageCost: Number.parseFloat(row.average_cost),
    lastUpdated: row.last_updated,
    location: row.location,
    supplier: row.supplier,
  }))
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const result = await query("SELECT * FROM inventory_items WHERE id = $1", [id])

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    sku: row.sku,
    productName: row.product_name,
    category: row.category,
    currentStock: row.current_stock,
    reservedStock: row.reserved_stock,
    availableStock: row.available_stock,
    reorderPoint: row.reorder_point,
    reorderQuantity: row.reorder_quantity,
    averageCost: Number.parseFloat(row.average_cost),
    lastUpdated: row.last_updated,
    location: row.location,
    supplier: row.supplier,
  }
}

export async function createInventoryItem(item: Omit<InventoryItem, "id" | "lastUpdated">): Promise<InventoryItem> {
  const result = await query(
    `
    INSERT INTO inventory_items (sku, product_name, category, current_stock, reserved_stock, available_stock, reorder_point, reorder_quantity, average_cost, location, supplier)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `,
    [
      item.sku,
      item.productName,
      item.category,
      item.currentStock,
      item.reservedStock,
      item.availableStock,
      item.reorderPoint,
      item.reorderQuantity,
      item.averageCost,
      item.location,
      item.supplier,
    ],
  )

  const row = result.rows[0]
  return {
    id: row.id,
    sku: row.sku,
    productName: row.product_name,
    category: row.category,
    currentStock: row.current_stock,
    reservedStock: row.reserved_stock,
    availableStock: row.available_stock,
    reorderPoint: row.reorder_point,
    reorderQuantity: row.reorder_quantity,
    averageCost: Number.parseFloat(row.average_cost),
    lastUpdated: row.last_updated,
    location: row.location,
    supplier: row.supplier,
  }
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
  const result = await query(
    `
    UPDATE inventory_items 
    SET sku = COALESCE($2, sku),
        product_name = COALESCE($3, product_name),
        category = COALESCE($4, category),
        current_stock = COALESCE($5, current_stock),
        reserved_stock = COALESCE($6, reserved_stock),
        available_stock = COALESCE($7, available_stock),
        reorder_point = COALESCE($8, reorder_point),
        reorder_quantity = COALESCE($9, reorder_quantity),
        average_cost = COALESCE($10, average_cost),
        location = COALESCE($11, location),
        supplier = COALESCE($12, supplier),
        last_updated = NOW()
    WHERE id = $1
    RETURNING *
  `,
    [
      id,
      updates.sku,
      updates.productName,
      updates.category,
      updates.currentStock,
      updates.reservedStock,
      updates.availableStock,
      updates.reorderPoint,
      updates.reorderQuantity,
      updates.averageCost,
      updates.location,
      updates.supplier,
    ],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    sku: row.sku,
    productName: row.product_name,
    category: row.category,
    currentStock: row.current_stock,
    reservedStock: row.reserved_stock,
    availableStock: row.available_stock,
    reorderPoint: row.reorder_point,
    reorderQuantity: row.reorder_quantity,
    averageCost: Number.parseFloat(row.average_cost),
    lastUpdated: row.last_updated,
    location: row.location,
    supplier: row.supplier,
  }
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const result = await query("DELETE FROM inventory_items WHERE id = $1", [id])
  return result.rowCount > 0
}
