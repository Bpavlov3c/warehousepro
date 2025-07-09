import { query, transaction } from "./database"
import type { PurchaseOrder, POItem, InventoryItem, ShopifyStore, ShopifyOrder } from "./store"

export class DatabaseStore {
  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const result = await query(`
      SELECT 
        po.*,
        json_agg(
          json_build_object(
            'sku', poi.sku,
            'name', poi.product_name,
            'quantity', poi.quantity,
            'unitCost', poi.unit_cost,
            'deliveryCostPerUnit', COALESCE(po.delivery_cost / NULLIF(SUM(poi.quantity) OVER (PARTITION BY po.id), 0), 0),
            'totalCost', poi.total_cost + COALESCE(po.delivery_cost / NULLIF(SUM(poi.quantity) OVER (PARTITION BY po.id), 0) * poi.quantity, 0)
          ) ORDER BY poi.id
        ) as items
      FROM purchase_orders po
      LEFT JOIN po_items poi ON po.id = poi.po_id
      GROUP BY po.id
      ORDER BY po.created_at DESC
    `)

    return result.rows.map((row) => ({
      id: row.po_number,
      supplier: row.supplier_name,
      date: row.po_date,
      status: row.status,
      totalCost:
        Number.parseFloat(row.delivery_cost || 0) +
        (row.items?.reduce((sum: number, item: any) => sum + item.quantity * item.unitCost, 0) || 0),
      itemCount: row.items?.filter((item: any) => item.sku).length || 0,
      deliveryCost: Number.parseFloat(row.delivery_cost || 0),
      items: row.items?.filter((item: any) => item.sku) || [],
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  async createPurchaseOrder(po: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): Promise<PurchaseOrder> {
    return await transaction(async (client) => {
      // Generate PO number
      const poNumberResult = await client.query(
        "SELECT 'PO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD((COUNT(*) + 1)::text, 3, '0') as po_number FROM purchase_orders WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())",
      )
      const poNumber = poNumberResult.rows[0].po_number

      // Insert purchase order
      const poResult = await client.query(
        `
        INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [poNumber, po.supplier, po.date, po.deliveryCost, po.status, po.notes],
      )

      const poId = poResult.rows[0].id

      // Insert PO items
      for (const item of po.items) {
        await client.query(
          `
          INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost)
          VALUES ($1, $2, $3, $4, $5)
        `,
          [poId, item.sku, item.name, item.quantity, item.unitCost],
        )

        // Ensure product exists
        await client.query(
          `
          INSERT INTO products (sku, name) VALUES ($1, $2)
          ON CONFLICT (sku) DO NOTHING
        `,
          [item.sku, item.name],
        )
      }

      // If delivered, update inventory
      if (po.status === "Delivered") {
        await this.updateInventoryFromPO(client, poResult.rows[0], po.items)
      }

      return {
        id: poNumber,
        supplier: po.supplier,
        date: po.date,
        status: po.status,
        totalCost: po.totalCost,
        itemCount: po.items.length,
        deliveryCost: po.deliveryCost,
        items: po.items,
        notes: po.notes,
        createdAt: poResult.rows[0].created_at,
        updatedAt: poResult.rows[0].updated_at,
      }
    })
  }

  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> {
    return await transaction(async (client) => {
      // Update purchase order
      const updateFields = []
      const values = []
      let paramIndex = 1

      if (updates.supplier) {
        updateFields.push(`supplier_name = $${paramIndex++}`)
        values.push(updates.supplier)
      }
      if (updates.date) {
        updateFields.push(`po_date = $${paramIndex++}`)
        values.push(updates.date)
      }
      if (updates.status) {
        updateFields.push(`status = $${paramIndex++}`)
        values.push(updates.status)
      }
      if (updates.deliveryCost !== undefined) {
        updateFields.push(`delivery_cost = $${paramIndex++}`)
        values.push(updates.deliveryCost)
      }
      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`)
        values.push(updates.notes)
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

      const poResult = await client.query(
        `UPDATE purchase_orders SET ${updateFields.join(", ")} WHERE po_number = $${paramIndex} RETURNING *`,
        values,
      )

      if (poResult.rows.length === 0) return null

      const po = poResult.rows[0]

      // If items are being updated, replace them
      if (updates.items) {
        // Delete existing items
        await client.query("DELETE FROM po_items WHERE po_id = $1", [po.id])

        // Insert new items
        for (const item of updates.items) {
          await client.query(
            `INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost)
             VALUES ($1, $2, $3, $4, $5)`,
            [po.id, item.sku, item.name, item.quantity, item.unitCost],
          )

          // Ensure product exists
          await client.query(`INSERT INTO products (sku, name) VALUES ($1, $2) ON CONFLICT (sku) DO NOTHING`, [
            item.sku,
            item.name,
          ])
        }
      }

      // If status changed to delivered, update inventory
      if (updates.status === "Delivered") {
        await this.updateInventoryFromPO(client, po, updates.items || [])
      }

      // Return updated PO
      const updatedPOs = await this.getPurchaseOrders()
      return updatedPOs.find((p) => p.id === id) || null
    })
  }

  private async updateInventoryFromPO(client: any, po: any, items: POItem[]) {
    for (const item of items) {
      // Get product ID
      const productResult = await client.query("SELECT id FROM products WHERE sku = $1", [item.sku])
      if (productResult.rows.length === 0) continue

      const productId = productResult.rows[0].id

      // Get PO item ID
      const poItemResult = await client.query("SELECT id FROM po_items WHERE po_id = $1 AND sku = $2", [
        po.id,
        item.sku,
      ])
      if (poItemResult.rows.length === 0) continue

      const poItemId = poItemResult.rows[0].id

      // Add to inventory
      await client.query(
        `
        INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [productId, poItemId, item.quantity, item.unitCost + (item.deliveryCostPerUnit || 0), po.po_date],
      )
    }
  }

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    const result = await query(`
      SELECT 
        p.sku,
        p.name,
        COALESCE(SUM(i.quantity_available), 0) as in_stock,
        COALESCE(SUM(CASE WHEN po.status IN ('Pending', 'In Transit') THEN poi.quantity ELSE 0 END), 0) as incoming,
        0 as reserved,
        COALESCE(AVG(i.unit_cost), 0) as unit_cost
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN po_items poi ON p.sku = poi.sku
      LEFT JOIN purchase_orders po ON poi.po_id = po.id
      GROUP BY p.sku, p.name
      ORDER BY p.name
    `)

    return result.rows.map((row) => ({
      sku: row.sku,
      name: row.name,
      inStock: Number.parseInt(row.in_stock),
      incoming: Number.parseInt(row.incoming),
      reserved: Number.parseInt(row.reserved),
      unitCost: Number.parseFloat(row.unit_cost),
    }))
  }

  async updateInventoryQuantity(sku: string, newQuantity: number): Promise<boolean> {
    try {
      await transaction(async (client) => {
        // Get product ID
        const productResult = await client.query("SELECT id FROM products WHERE sku = $1", [sku])
        if (productResult.rows.length === 0) {
          throw new Error(`Product with SKU ${sku} not found`)
        }

        const productId = productResult.rows[0].id

        // Get current inventory
        const inventoryResult = await client.query(
          "SELECT SUM(quantity_available) as current_stock FROM inventory WHERE product_id = $1",
          [productId],
        )

        const currentStock = Number.parseInt(inventoryResult.rows[0]?.current_stock || 0)
        const difference = newQuantity - currentStock

        if (difference > 0) {
          // Add inventory (manual adjustment)
          await client.query(
            `INSERT INTO inventory (product_id, quantity_available, unit_cost, purchase_date)
             VALUES ($1, $2, $3, CURRENT_DATE)`,
            [productId, difference, 0], // Manual adjustments have 0 cost
          )
        } else if (difference < 0) {
          // Remove inventory (FIFO)
          let toRemove = Math.abs(difference)
          const inventoryLots = await client.query(
            `SELECT id, quantity_available FROM inventory 
             WHERE product_id = $1 AND quantity_available > 0 
             ORDER BY purchase_date ASC, id ASC`,
            [productId],
          )

          for (const lot of inventoryLots.rows) {
            if (toRemove <= 0) break

            const removeFromLot = Math.min(toRemove, lot.quantity_available)
            await client.query("UPDATE inventory SET quantity_available = quantity_available - $1 WHERE id = $2", [
              removeFromLot,
              lot.id,
            ])
            toRemove -= removeFromLot
          }
        }
      })
      return true
    } catch (error) {
      console.error("Error updating inventory:", error)
      return false
    }
  }

  // Shopify Stores
  async getShopifyStores(): Promise<ShopifyStore[]> {
    const result = await query(`
      SELECT 
        s.*,
        COUNT(so.id) as total_orders,
        COALESCE(SUM(so.total_amount), 0) as monthly_revenue
      FROM shopify_stores s
      LEFT JOIN shopify_orders so ON s.id = so.store_id 
        AND so.order_date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `)

    return result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      shopifyDomain: row.shopify_domain,
      accessToken: row.access_token,
      status: row.status,
      lastSync: row.last_sync ? this.formatTimeAgo(row.last_sync) : "Never",
      totalOrders: Number.parseInt(row.total_orders),
      monthlyRevenue: Number.parseFloat(row.monthly_revenue),
      webhookUrl: row.webhook_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  async createShopifyStore(store: Omit<ShopifyStore, "id" | "createdAt" | "updatedAt">): Promise<ShopifyStore> {
    const result = await query(
      `
      INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [store.name, store.shopifyDomain, store.accessToken, store.webhookUrl, store.status],
    )

    const row = result.rows[0]
    return {
      id: row.id.toString(),
      name: row.name,
      shopifyDomain: row.shopify_domain,
      accessToken: row.access_token,
      status: row.status,
      lastSync: "Never",
      totalOrders: 0,
      monthlyRevenue: 0,
      webhookUrl: row.webhook_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  // Shopify Orders
  async getShopifyOrders(): Promise<ShopifyOrder[]> {
    const result = await query(`
      SELECT 
        so.*,
        s.name as store_name,
        json_agg(
          json_build_object(
            'id', soi.id,
            'sku', soi.sku,
            'productName', soi.product_name,
            'quantity', soi.quantity,
            'unitPrice', soi.unit_price,
            'totalPrice', soi.total_price
          ) ORDER BY soi.id
        ) as items
      FROM shopify_orders so
      JOIN shopify_stores s ON so.store_id = s.id
      LEFT JOIN shopify_order_items soi ON so.id = soi.order_id
      GROUP BY so.id, s.name
      ORDER BY so.order_date DESC
    `)

    return result.rows.map((row) => ({
      id: row.id.toString(),
      storeId: row.store_id.toString(),
      storeName: row.store_name,
      shopifyOrderId: row.shopify_order_id,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      orderDate: row.order_date,
      status: row.status,
      totalAmount: Number.parseFloat(row.total_amount),
      shippingCost: Number.parseFloat(row.shipping_cost || 0),
      taxAmount: Number.parseFloat(row.tax_amount || 0),
      items: row.items?.filter((item: any) => item.sku) || [],
      shippingAddress: row.shipping_address,
      profit: this.calculateOrderProfit(row),
      createdAt: row.created_at,
    }))
  }

  private calculateOrderProfit(order: any): number {
    // Simplified profit calculation - in real implementation, use FIFO costing
    const revenue =
      Number.parseFloat(order.total_amount) -
      Number.parseFloat(order.shipping_cost || 0) -
      Number.parseFloat(order.tax_amount || 0)
    const estimatedCost = revenue * 0.6 // Assume 40% margin
    return revenue - estimatedCost
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return "Less than 1 hour ago"
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  }
}

export const dbStore = new DatabaseStore()
