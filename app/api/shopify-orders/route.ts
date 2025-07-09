import { type NextRequest, NextResponse } from "next/server"
import { getAllShopifyOrders, createShopifyOrder } from "@/lib/db-store"

export async function GET() {
  try {
    const orders = await getAllShopifyOrders()
    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching Shopify orders:", error)
    return NextResponse.json({ error: "Failed to fetch Shopify orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.shopify_order_id || !body.order_number || !body.total_price || !body.order_date) {
      return NextResponse.json(
        { error: "Missing required fields: shopify_order_id, order_number, total_price, order_date" },
        { status: 400 },
      )
    }

    const order = await createShopifyOrder({
      shopify_order_id: body.shopify_order_id,
      store_id: body.store_id,
      order_number: body.order_number,
      customer_email: body.customer_email,
      customer_name: body.customer_name,
      total_price: body.total_price,
      currency: body.currency || "USD",
      fulfillment_status: body.fulfillment_status,
      financial_status: body.financial_status,
      order_date: body.order_date,
      shipping_address: body.shipping_address,
      line_items: body.line_items,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating Shopify order:", error)
    return NextResponse.json({ error: "Failed to create Shopify order" }, { status: 500 })
  }
}
