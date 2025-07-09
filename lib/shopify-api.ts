export interface ShopifyOrder {
  id: number
  order_number: string
  customer_name: string
  email: string
  total_price: number
  status: string
  created_at: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
}

export class ShopifyAPI {
  private domain: string
  private accessToken: string

  constructor(domain: string, accessToken: string) {
    this.domain = domain
    this.accessToken = accessToken
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `https://${this.domain}/admin/api/2023-10/${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest("shop.json")
      return true
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }

  async getOrders(
    params: {
      status?: "open" | "closed" | "cancelled" | "any"
      limit?: number
      since_id?: number
      created_at_min?: string
      created_at_max?: string
    } = {},
  ): Promise<ShopifyOrder[]> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `orders.json?${searchParams.toString()}`
    const data = await this.makeRequest(endpoint)
    return data.orders
  }

  async getOrder(orderId: number): Promise<ShopifyOrder> {
    const data = await this.makeRequest(`orders/${orderId}.json`)
    return data.order
  }

  async getOrdersCount(
    params: {
      status?: "open" | "closed" | "cancelled" | "any"
      created_at_min?: string
      created_at_max?: string
    } = {},
  ): Promise<number> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `orders/count.json?${searchParams.toString()}`
    const data = await this.makeRequest(endpoint)
    return data.count
  }

  async getProducts(
    params: {
      limit?: number
      since_id?: number
      published_status?: "published" | "unpublished" | "any"
    } = {},
  ): Promise<any[]> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    const endpoint = `products.json?${searchParams.toString()}`
    const data = await this.makeRequest(endpoint)
    return data.products
  }

  async createWebhook(topic: string, address: string): Promise<any> {
    const webhook = {
      webhook: {
        topic,
        address,
        format: "json",
      },
    }

    const data = await this.makeRequest("webhooks.json", {
      method: "POST",
      body: JSON.stringify(webhook),
    })

    return data.webhook
  }

  async getWebhooks(): Promise<any[]> {
    const data = await this.makeRequest("webhooks.json")
    return data.webhooks
  }
}

// Utility function to create API instance
export function createShopifyAPI(domain: string, accessToken: string): ShopifyAPI {
  return new ShopifyAPI(domain, accessToken)
}

// Helper function to sync orders for a store
export async function syncStoreOrders(domain: string, accessToken: string, lastSyncDate?: string) {
  const api = new ShopifyAPI(domain, accessToken)

  const params: any = {
    status: "any",
    limit: 250,
  }

  if (lastSyncDate) {
    params.created_at_min = lastSyncDate
  }

  try {
    const orders = await api.getOrders(params)

    // Process orders and save to database
    const processedOrders = orders.map((order) => ({
      shopifyOrderId: order.id.toString(),
      orderNumber: order.order_number,
      customerEmail: order.email,
      customerName: order.customer_name,
      orderDate: order.created_at,
      status: order.status,
      totalAmount: order.total_price,
      shippingCost: 0, // Calculate from shipping lines if needed
      taxAmount: 0, // Calculate from tax lines if needed
      currency: "USD", // Assume currency is USD for now
      shippingAddress: "", // Calculate from shipping address if needed
      items: order.items.map((item) => ({
        sku: "", // Assume SKU is not available for now
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
      })),
    }))

    console.log(`Processed ${processedOrders.length} orders from ${domain}`)
    return processedOrders
  } catch (error) {
    console.error(`Failed to sync orders for ${domain}:`, error)
    throw error
  }
}

// Mock Shopify API functions for now
export async function fetchShopifyOrders(storeId: number): Promise<ShopifyOrder[]> {
  // Mock implementation - replace with actual Shopify API calls
  return [
    {
      id: 1,
      order_number: "#1001",
      customer_name: "John Doe",
      email: "john@example.com",
      total_price: 99.99,
      status: "fulfilled",
      created_at: "2024-01-15T10:30:00Z",
      items: [
        { name: "Wireless Mouse", quantity: 1, price: 25.99 },
        { name: "USB Cable", quantity: 2, price: 12.5 },
      ],
    },
  ]
}

export async function testShopifyConnection(shopDomain: string, accessToken: string): Promise<boolean> {
  // Mock implementation - replace with actual Shopify API test
  console.log(`Testing connection to ${shopDomain}`)
  return true
}
