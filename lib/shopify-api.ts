export interface ShopifyConfig {
  shopDomain: string
  accessToken: string
}

export interface ShopifyOrder {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
  cancelled_at: string | null
  closed_at: string | null
  processed_at: string
  customer: {
    id: number
    email: string
    created_at: string
    updated_at: string
    first_name: string
    last_name: string
    orders_count: number
    state: string
    total_spent: string
    last_order_id: number
    note: string | null
    verified_email: boolean
    multipass_identifier: string | null
    tax_exempt: boolean
    phone: string | null
    tags: string
    last_order_name: string
    currency: string
    addresses: any[]
    accepts_marketing: boolean
    accepts_marketing_updated_at: string
    marketing_opt_in_level: string | null
    tax_exemptions: any[]
    admin_graphql_api_id: string
    default_address: any
  }
  billing_address: {
    first_name: string
    address1: string
    phone: string | null
    city: string
    zip: string
    province: string | null
    country: string
    last_name: string
    address2: string | null
    company: string | null
    latitude: number | null
    longitude: number | null
    name: string
    country_code: string
    province_code: string | null
  }
  shipping_address: {
    first_name: string
    address1: string
    phone: string | null
    city: string
    zip: string
    province: string | null
    country: string
    last_name: string
    address2: string | null
    company: string | null
    latitude: number | null
    longitude: number | null
    name: string
    country_code: string
    province_code: string | null
  }
  line_items: Array<{
    id: number
    variant_id: number | null
    title: string
    quantity: number
    sku: string
    variant_title: string | null
    vendor: string
    fulfillment_service: string
    product_id: number
    requires_shipping: boolean
    taxable: boolean
    gift_card: boolean
    name: string
    variant_inventory_management: string | null
    properties: any[]
    product_exists: boolean
    fulfillable_quantity: number
    grams: number
    price: string
    total_discount: string
    fulfillment_status: string | null
    price_set: {
      shop_money: {
        amount: string
        currency_code: string
      }
      presentment_money: {
        amount: string
        currency_code: string
      }
    }
    total_discount_set: {
      shop_money: {
        amount: string
        currency_code: string
      }
      presentment_money: {
        amount: string
        currency_code: string
      }
    }
    discount_allocations: any[]
    duties: any[]
    admin_graphql_api_id: string
    tax_lines: any[]
  }>
  shipping_lines: Array<{
    id: number
    title: string
    price: string
    code: string
    source: string
    phone: string | null
    requested_fulfillment_service_id: string | null
    delivery_category: string | null
    carrier_identifier: string | null
    discounted_price: string
    price_set: {
      shop_money: {
        amount: string
        currency_code: string
      }
      presentment_money: {
        amount: string
        currency_code: string
      }
    }
    discounted_price_set: {
      shop_money: {
        amount: string
        currency_code: string
      }
      presentment_money: {
        amount: string
        currency_code: string
      }
    }
    discount_allocations: any[]
    tax_lines: any[]
  }>
  tax_lines: Array<{
    price: string
    rate: number
    title: string
    price_set: {
      shop_money: {
        amount: string
        currency_code: string
      }
      presentment_money: {
        amount: string
        currency_code: string
      }
    }
    channel_liable: boolean
  }>
  total_discounts: string
  total_discounts_set: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
  total_line_items_price: string
  total_line_items_price_set: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
  total_price: string
  total_price_set: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
  total_shipping_price_set: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
  total_tax: string
  total_tax_set: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
  total_tip_received: string
  total_weight: number
  currency: string
  financial_status: string
  confirmed: boolean
  total_outstanding: string
  fulfillment_status: string | null
  gateway: string
  presentment_currency: string
  checkout_id: number
  checkout_token: string
  reference: string | null
  source_identifier: string | null
  source_url: string | null
  device_id: number | null
  phone: string | null
  customer_locale: string | null
  app_id: number
  browser_ip: string | null
  landing_site: string | null
  referring_site: string | null
  source: string | null
  order_status_url: string
  cancel_reason: string | null
  tags: string
  note: string | null
  note_attributes: any[]
  discount_codes: any[]
  fulfillments: any[]
  refunds: any[]
  admin_graphql_api_id: string
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[]
}

export class ShopifyAPI {
  private config: ShopifyConfig

  constructor(config: ShopifyConfig) {
    this.config = config
  }

  private async makeRequest(endpoint: string): Promise<{ data: any; headers: Headers }> {
    const url = `https://${this.config.shopDomain}/admin/api/2024-10/${endpoint}`

    console.log(`Making Shopify API request to: ${url}`)

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": this.config.accessToken,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Shopify API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return { data, headers: response.headers }
  }

  private parseLinkHeader(linkHeader: string | null): string | null {
    if (!linkHeader) return null

    const links = linkHeader.split(",")
    for (const link of links) {
      const [url, rel] = link.split(";")
      if (rel && rel.trim() === 'rel="next"') {
        return url.trim().slice(1, -1) // Remove < and >
      }
    }
    return null
  }

  async getAllOrders(onProgress?: (current: number, total: number) => void): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = []
    let nextUrl: string | null = "orders.json?limit=250&status=any"
    let currentPage = 0
    let totalEstimate = 250 // Initial estimate

    console.log("Starting to fetch all Shopify orders...")

    while (nextUrl) {
      try {
        currentPage++
        console.log(`Fetching page ${currentPage}...`)

        const { data, headers } = await this.makeRequest(nextUrl)
        const orders = data.orders || []

        allOrders.push(...orders)
        console.log(`Fetched ${orders.length} orders (total: ${allOrders.length})`)

        // Update progress
        if (onProgress) {
          // Estimate total based on current progress
          if (orders.length === 250) {
            totalEstimate = Math.max(totalEstimate, allOrders.length * 2)
          } else {
            totalEstimate = allOrders.length
          }
          onProgress(allOrders.length, totalEstimate)
        }

        // Parse Link header for next page
        const linkHeader = headers.get("Link")
        nextUrl = this.parseLinkHeader(linkHeader)

        if (nextUrl) {
          // Extract just the path and query from the full URL
          const url = new URL(nextUrl)
          nextUrl = `${url.pathname.replace("/admin/api/2024-10/", "")}${url.search}`
          console.log(`Next page URL: ${nextUrl}`)
        } else {
          console.log("No more pages to fetch")
        }

        // Rate limiting: wait 500ms between requests
        if (nextUrl) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error)
        throw error
      }
    }

    console.log(`Completed fetching all orders. Total: ${allOrders.length}`)
    return allOrders
  }

  async getOrders(limit = 50): Promise<ShopifyOrder[]> {
    const { data } = await this.makeRequest(`orders.json?limit=${limit}&status=any`)
    return data.orders || []
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest("orders.json?limit=1")
      return true
    } catch (error) {
      console.error("Shopify connection test failed:", error)
      return false
    }
  }

  transformOrderForDatabase(order: ShopifyOrder, storeId: string): any {
    const shippingAddress = order.shipping_address
      ? `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.country}`
      : ""

    return {
      store_id: storeId,
      shopify_order_id: order.id.toString(),
      order_number: order.name,
      customer_name: order.customer
        ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
        : "Guest",
      customer_email: order.customer?.email || order.email || "",
      order_date: order.created_at,
      status: order.fulfillment_status || order.financial_status || "pending",
      total_amount: Number.parseFloat(order.total_price),
      shipping_cost: order.shipping_lines.reduce((sum, line) => sum + Number.parseFloat(line.price), 0),
      tax_amount: Number.parseFloat(order.total_tax),
      shipping_address: shippingAddress,
      profit: 0, // Will be calculated later
      items: order.line_items.map((item) => ({
        sku: item.sku || `shopify-${item.variant_id || item.product_id}`,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: Number.parseFloat(item.price),
        total_price: Number.parseFloat(item.price) * item.quantity,
      })),
    }
  }
}
