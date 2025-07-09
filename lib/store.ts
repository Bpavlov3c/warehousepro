// Simple in-memory store for demo purposes
// In a real app, this would be replaced with a proper database/API

interface POItem {
  sku: string
  name: string
  quantity: number
  unitCost: number // Original product cost
  deliveryCostPerUnit: number // Delivery cost allocated per unit
  totalCost: number // (unitCost + deliveryCostPerUnit) * quantity
}

interface PurchaseOrder {
  id: string
  supplier: string
  date: string
  status: "Draft" | "Pending" | "In Transit" | "Delivered"
  totalCost: number
  itemCount: number
  deliveryCost: number
  items: POItem[]
  notes?: string
  createdAt: string
  updatedAt: string
}

interface InventoryItem {
  sku: string
  name: string
  inStock: number
  incoming: number
  reserved: number
}

interface ShopifyStore {
  id: string
  name: string
  shopifyDomain: string
  accessToken: string
  status: "Connected" | "Error" | "Testing" | "Disconnected"
  lastSync: string
  totalOrders: number
  monthlyRevenue: number
  webhookUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface ShopifyOrderItem {
  id: string
  sku: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface ShopifyOrder {
  id: string
  storeId: string
  storeName: string
  shopifyOrderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  orderDate: string
  status: string
  totalAmount: number
  shippingCost: number
  taxAmount: number
  items: ShopifyOrderItem[]
  shippingAddress: string
  profit: number
  createdAt: string
}

// FIFO inventory layer for cost tracking
interface InventoryLayer {
  sku: string
  poId: string
  quantity: number
  unitCostWithDelivery: number
  purchaseDate: string
}

class DataStore {
  private purchaseOrders: PurchaseOrder[] = []
  private inventory: Map<string, InventoryItem> = new Map()
  private inventoryLayers: InventoryLayer[] = [] // FIFO cost tracking
  private shopifyStores: ShopifyStore[] = []
  private shopifyOrders: ShopifyOrder[] = []

  constructor() {
    this.initializeData()
  }

  private initializeData() {
    // Initialize purchase orders with delivery cost distribution
    const rawPOs = [
      {
        id: "PO-2024-001",
        supplier: "Tech Supplies Co.",
        date: "2024-01-15",
        status: "Delivered",
        deliveryCost: 250.0,
        items: [
          { sku: "WH-001", name: "Wireless Headphones", quantity: 50, unitCost: 75.0 },
          { sku: "SW-002", name: "Smart Watch", quantity: 25, unitCost: 120.0 },
          { sku: "PC-003", name: "Phone Case", quantity: 100, unitCost: 15.0 },
        ],
        notes: "Initial stock order",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      },
      {
        id: "PO-2024-002",
        supplier: "Electronics Hub",
        date: "2024-01-18",
        status: "In Transit",
        deliveryCost: 150.0,
        items: [
          { sku: "BS-004", name: "Bluetooth Speaker", quantity: 30, unitCost: 85.0 },
          { sku: "CB-005", name: "USB Cable", quantity: 200, unitCost: 8.5 },
        ],
        createdAt: "2024-01-18T14:30:00Z",
        updatedAt: "2024-01-18T14:30:00Z",
      },
      {
        id: "PO-2024-003",
        supplier: "Global Gadgets",
        date: "2024-01-20",
        status: "Pending",
        deliveryCost: 200.0,
        items: [
          { sku: "TB-006", name: "Tablet", quantity: 15, unitCost: 280.0 },
          { sku: "KD-007", name: "Keyboard", quantity: 40, unitCost: 45.0 },
        ],
        createdAt: "2024-01-20T09:15:00Z",
        updatedAt: "2024-01-20T09:15:00Z",
      },
    ]

    // Process POs and calculate delivery cost distribution
    this.purchaseOrders = rawPOs.map((po) => this.processPurchaseOrder(po))

    // Initialize inventory
    this.inventory = new Map([
      ["WH-001", { sku: "WH-001", name: "Wireless Headphones", inStock: 45, incoming: 0, reserved: 5 }],
      ["SW-002", { sku: "SW-002", name: "Smart Watch", inStock: 12, incoming: 0, reserved: 3 }],
      ["PC-003", { sku: "PC-003", name: "Phone Case", inStock: 156, incoming: 0, reserved: 10 }],
      ["BS-004", { sku: "BS-004", name: "Bluetooth Speaker", inStock: 8, incoming: 30, reserved: 2 }],
      ["CB-005", { sku: "CB-005", name: "USB Cable", inStock: 180, incoming: 200, reserved: 20 }],
      ["TB-006", { sku: "TB-006", name: "Tablet", inStock: 0, incoming: 15, reserved: 0 }],
      ["KD-007", { sku: "KD-007", name: "Keyboard", inStock: 0, incoming: 40, reserved: 0 }],
    ])

    // Initialize FIFO inventory layers
    this.inventoryLayers = [
      // From PO-2024-001 (Delivered)
      { sku: "WH-001", poId: "PO-2024-001", quantity: 45, unitCostWithDelivery: 76.67, purchaseDate: "2024-01-15" },
      { sku: "SW-002", poId: "PO-2024-001", quantity: 12, unitCostWithDelivery: 123.33, purchaseDate: "2024-01-15" },
      { sku: "PC-003", poId: "PO-2024-001", quantity: 156, unitCostWithDelivery: 16.67, purchaseDate: "2024-01-15" },
    ]

    // Initialize stores
    this.shopifyStores = [
      {
        id: "1",
        name: "Main Store",
        shopifyDomain: "main-store.myshopify.com",
        accessToken: "shpat_***************",
        status: "Connected",
        lastSync: "2 hours ago",
        totalOrders: 1247,
        monthlyRevenue: 45680.5,
        webhookUrl: "https://yourapp.com/webhook/store1",
        notes: "Primary store with highest volume",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        name: "EU Store",
        shopifyDomain: "eu-store.myshopify.com",
        accessToken: "shpat_***************",
        status: "Connected",
        lastSync: "1 hour ago",
        totalOrders: 892,
        monthlyRevenue: 32150.75,
        webhookUrl: "https://yourapp.com/webhook/store2",
        notes: "European market store",
        createdAt: "2024-01-18T14:30:00Z",
        updatedAt: "2024-01-18T14:30:00Z",
      },
      {
        id: "3",
        name: "Test Store",
        shopifyDomain: "test-store.myshopify.com",
        accessToken: "shpat_***************",
        status: "Error",
        lastSync: "2 days ago",
        totalOrders: 45,
        monthlyRevenue: 1250.0,
        notes: "Development and testing store",
        createdAt: "2024-01-20T09:15:00Z",
        updatedAt: "2024-01-20T09:15:00Z",
      },
    ]

    // Initialize sample orders with proper profit calculation
    this.shopifyOrders = [
      {
        id: "order-1",
        storeId: "1",
        storeName: "Main Store",
        shopifyOrderId: "5234567890123",
        orderNumber: "#1001",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        orderDate: "2024-01-20T14:30:00Z",
        status: "Fulfilled",
        totalAmount: 299.99,
        shippingCost: 9.99,
        taxAmount: 24.0,
        items: [
          {
            id: "item-1",
            sku: "WH-001",
            productName: "Wireless Headphones",
            quantity: 2,
            unitPrice: 149.99,
            totalPrice: 299.98,
          },
        ],
        shippingAddress: "123 Main St, New York, NY 10001",
        profit: 0, // Will be calculated
        createdAt: "2024-01-20T14:30:00Z",
      },
      {
        id: "order-2",
        storeId: "2",
        storeName: "EU Store",
        shopifyOrderId: "5234567890124",
        orderNumber: "#1002",
        customerName: "Jane Smith",
        customerEmail: "jane@example.com",
        orderDate: "2024-01-20T15:45:00Z",
        status: "Processing",
        totalAmount: 189.99,
        shippingCost: 12.99,
        taxAmount: 15.2,
        items: [
          {
            id: "item-2",
            sku: "SW-002",
            productName: "Smart Watch",
            quantity: 1,
            unitPrice: 189.99,
            totalPrice: 189.99,
          },
        ],
        shippingAddress: "456 Oak Ave, Los Angeles, CA 90210",
        profit: 0, // Will be calculated
        createdAt: "2024-01-20T15:45:00Z",
      },
      {
        id: "order-3",
        storeId: "1",
        storeName: "Main Store",
        shopifyOrderId: "5234567890125",
        orderNumber: "#1003",
        customerName: "Bob Johnson",
        customerEmail: "bob@example.com",
        orderDate: "2024-01-19T16:20:00Z",
        status: "Shipped",
        totalAmount: 45.99,
        shippingCost: 7.99,
        taxAmount: 3.68,
        items: [
          {
            id: "item-3",
            sku: "PC-003",
            productName: "Phone Case",
            quantity: 3,
            unitPrice: 15.33,
            totalPrice: 45.99,
          },
        ],
        shippingAddress: "789 Pine St, Chicago, IL 60601",
        profit: 0, // Will be calculated
        createdAt: "2024-01-19T16:20:00Z",
      },
    ]

    // Calculate profit for existing orders
    this.shopifyOrders.forEach((order) => {
      order.profit = this.calculateOrderProfit(order)
    })
  }

  private processPurchaseOrder(rawPO: any): PurchaseOrder {
    // Calculate total item cost (without delivery)
    const totalItemCost = rawPO.items.reduce((sum: number, item: any) => sum + item.quantity * item.unitCost, 0)
    const totalQuantity = rawPO.items.reduce((sum: number, item: any) => sum + item.quantity, 0)

    // Distribute delivery cost equally across all items by quantity
    const deliveryCostPerUnit = totalQuantity > 0 ? rawPO.deliveryCost / totalQuantity : 0

    const itemsWithDelivery = rawPO.items.map((item: any) => {
      const deliveryCostPerUnitRounded = Number.parseFloat(deliveryCostPerUnit.toFixed(2))
      const totalCost = (item.unitCost + deliveryCostPerUnitRounded) * item.quantity

      return {
        ...item,
        deliveryCostPerUnit: deliveryCostPerUnitRounded,
        totalCost: Number.parseFloat(totalCost.toFixed(2)),
      }
    })

    return {
      ...rawPO,
      items: itemsWithDelivery,
      totalCost: totalItemCost + rawPO.deliveryCost,
      itemCount: rawPO.items.length,
    }
  }

  // Purchase Orders
  getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders]
  }

  getPurchaseOrder(id: string): PurchaseOrder | undefined {
    return this.purchaseOrders.find((po) => po.id === id)
  }

  createPurchaseOrder(po: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): PurchaseOrder {
    const processedPO = this.processPurchaseOrder({
      ...po,
      id: `PO-${new Date().getFullYear()}-${String(this.purchaseOrders.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    this.purchaseOrders.unshift(processedPO)
    this.updateInventoryFromPO(processedPO, null)
    return processedPO
  }

  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): PurchaseOrder | null {
    const index = this.purchaseOrders.findIndex((po) => po.id === id)
    if (index === -1) return null

    const oldPO = this.purchaseOrders[index]
    const updatedPO = {
      ...oldPO,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Reprocess if items or delivery cost changed
    if (updates.items || updates.deliveryCost !== undefined) {
      const reprocessed = this.processPurchaseOrder(updatedPO)
      this.purchaseOrders[index] = reprocessed
      this.updateInventoryFromPO(reprocessed, oldPO)
      return reprocessed
    } else {
      this.purchaseOrders[index] = updatedPO
      this.updateInventoryFromPO(updatedPO, oldPO)
      return updatedPO
    }
  }

  private updateInventoryFromPO(newPO: PurchaseOrder, oldPO: PurchaseOrder | null) {
    // Remove old PO impact on inventory
    if (oldPO) {
      oldPO.items.forEach((item) => {
        const inventoryItem = this.inventory.get(item.sku)
        if (inventoryItem) {
          if (oldPO.status === "Delivered") {
            inventoryItem.inStock = Math.max(0, inventoryItem.inStock - item.quantity)
            // Remove from FIFO layers
            this.inventoryLayers = this.inventoryLayers.filter(
              (layer) => !(layer.poId === oldPO.id && layer.sku === item.sku),
            )
          } else if (oldPO.status === "Pending" || oldPO.status === "In Transit") {
            inventoryItem.incoming = Math.max(0, inventoryItem.incoming - item.quantity)
          }
        }
      })
    }

    // Add new PO impact on inventory
    newPO.items.forEach((item) => {
      let inventoryItem = this.inventory.get(item.sku)
      if (!inventoryItem) {
        inventoryItem = {
          sku: item.sku,
          name: item.name,
          inStock: 0,
          incoming: 0,
          reserved: 0,
        }
        this.inventory.set(item.sku, inventoryItem)
      }

      if (newPO.status === "Delivered") {
        inventoryItem.inStock += item.quantity
        // Add to FIFO layers with total unit cost (including delivery)
        this.inventoryLayers.push({
          sku: item.sku,
          poId: newPO.id,
          quantity: item.quantity,
          unitCostWithDelivery: item.unitCost + item.deliveryCostPerUnit,
          purchaseDate: newPO.date,
        })
      } else if (newPO.status === "Pending" || newPO.status === "In Transit") {
        inventoryItem.incoming += item.quantity
      }
    })
  }

  // Inventory
  getInventory(): InventoryItem[] {
    return Array.from(this.inventory.values())
  }

  getInventoryItem(sku: string): InventoryItem | undefined {
    return this.inventory.get(sku)
  }

  // Manual inventory management
  updateInventoryQuantity(sku: string, newInStock: number): boolean {
    const inventoryItem = this.inventory.get(sku)
    if (!inventoryItem) return false

    inventoryItem.inStock = Math.max(0, newInStock)
    return true
  }

  addManualInventory(sku: string, name: string, quantity: number, unitCost: number): boolean {
    let inventoryItem = this.inventory.get(sku)

    if (!inventoryItem) {
      // Create new inventory item
      inventoryItem = {
        sku,
        name,
        inStock: quantity,
        incoming: 0,
        reserved: 0,
      }
      this.inventory.set(sku, inventoryItem)
    } else {
      // Add to existing inventory
      inventoryItem.inStock += quantity
    }

    // Add to FIFO layers for cost tracking
    this.inventoryLayers.push({
      sku,
      poId: `MANUAL-${Date.now()}`,
      quantity,
      unitCostWithDelivery: unitCost,
      purchaseDate: new Date().toISOString().split("T")[0],
    })

    return true
  }

  // Get average unit cost for inventory item
  getInventoryUnitCost(sku: string): number {
    const layers = this.inventoryLayers
      .filter((layer) => layer.sku === sku)
      .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())

    if (layers.length === 0) return 0

    const totalCost = layers.reduce((sum, layer) => sum + layer.quantity * layer.unitCostWithDelivery, 0)
    const totalQuantity = layers.reduce((sum, layer) => sum + layer.quantity, 0)

    return totalQuantity > 0 ? totalCost / totalQuantity : 0
  }

  // Shopify Stores
  getShopifyStores(): ShopifyStore[] {
    return [...this.shopifyStores]
  }

  getShopifyStore(id: string): ShopifyStore | undefined {
    return this.shopifyStores.find((store) => store.id === id)
  }

  createShopifyStore(store: Omit<ShopifyStore, "id" | "createdAt" | "updatedAt">): ShopifyStore {
    const newStore: ShopifyStore = {
      ...store,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.shopifyStores.push(newStore)
    return newStore
  }

  updateShopifyStore(id: string, updates: Partial<ShopifyStore>): ShopifyStore | null {
    const index = this.shopifyStores.findIndex((store) => store.id === id)
    if (index === -1) return null

    const updatedStore = {
      ...this.shopifyStores[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    this.shopifyStores[index] = updatedStore
    return updatedStore
  }

  deleteShopifyStore(id: string): boolean {
    const index = this.shopifyStores.findIndex((store) => store.id === id)
    if (index === -1) return false

    this.shopifyOrders = this.shopifyOrders.filter((order) => order.storeId !== id)
    this.shopifyStores.splice(index, 1)
    return true
  }

  // Shopify Orders
  getShopifyOrders(): ShopifyOrder[] {
    return [...this.shopifyOrders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
  }

  getShopifyOrdersByStore(storeId: string): ShopifyOrder[] {
    return this.shopifyOrders.filter((order) => order.storeId === storeId)
  }

  createShopifyOrder(order: Omit<ShopifyOrder, "id" | "createdAt">): ShopifyOrder {
    const newOrder: ShopifyOrder = {
      ...order,
      id: `order-${Date.now()}`,
      profit: this.calculateOrderProfit(order),
      createdAt: new Date().toISOString(),
    }

    this.shopifyOrders.unshift(newOrder)
    return newOrder
  }

  addShopifyOrders(orders: Omit<ShopifyOrder, "id" | "createdAt">[]): ShopifyOrder[] {
    const newOrders = orders.map((order) => ({
      ...order,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profit: this.calculateOrderProfit(order),
      createdAt: new Date().toISOString(),
    }))

    const existingOrderIds = new Set(this.shopifyOrders.map((order) => `${order.storeId}-${order.shopifyOrderId}`))

    const uniqueNewOrders = newOrders.filter(
      (order) => !existingOrderIds.has(`${order.storeId}-${order.shopifyOrderId}`),
    )

    this.shopifyOrders.unshift(...uniqueNewOrders)
    return uniqueNewOrders
  }

  // FIFO-based profit calculation
  calculateOrderProfit(order: ShopifyOrder): number {
    let totalCost = 0
    const revenue = order.totalAmount - order.shippingCost - order.taxAmount

    order.items.forEach((item) => {
      // Get FIFO cost for this SKU
      const layers = this.inventoryLayers
        .filter((layer) => layer.sku === item.sku)
        .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())

      let remainingQty = item.quantity
      let itemCost = 0

      for (const layer of layers) {
        if (remainingQty <= 0) break

        const qtyFromThisLayer = Math.min(remainingQty, layer.quantity)
        itemCost += qtyFromThisLayer * layer.unitCostWithDelivery
        remainingQty -= qtyFromThisLayer
      }

      // If we don't have enough inventory layers, use a default cost
      if (remainingQty > 0) {
        itemCost += remainingQty * 50 // Default cost
      }

      totalCost += itemCost
    })

    return revenue - totalCost
  }

  // Get FIFO cost breakdown for an order (for reporting)
  getOrderCostBreakdown(order: ShopifyOrder): any {
    const breakdown: any = {}

    order.items.forEach((item) => {
      const layers = this.inventoryLayers
        .filter((layer) => layer.sku === item.sku)
        .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())

      let remainingQty = item.quantity
      const itemBreakdown: any[] = []

      for (const layer of layers) {
        if (remainingQty <= 0) break

        const qtyFromThisLayer = Math.min(remainingQty, layer.quantity)
        itemBreakdown.push({
          poId: layer.poId,
          quantity: qtyFromThisLayer,
          unitCostWithDelivery: layer.unitCostWithDelivery,
          totalCost: qtyFromThisLayer * layer.unitCostWithDelivery,
        })
        remainingQty -= qtyFromThisLayer
      }

      breakdown[item.sku] = itemBreakdown
    })

    return breakdown
  }
}

// Singleton instance
export const dataStore = new DataStore()

// Export types
export type { PurchaseOrder, POItem, InventoryItem, ShopifyStore, ShopifyOrder, ShopifyOrderItem }
