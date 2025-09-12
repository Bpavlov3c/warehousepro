import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-store"

// Helper function to validate API key
async function validateApiKey(apiKey: string) {
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, store_id, permissions, is_active, last_used")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single()

    if (error || !data) {
      return { valid: false, error: "Invalid API key" }
    }

    // Update last_used timestamp
    await supabase.from("api_keys").update({ last_used: new Date().toISOString() }).eq("id", data.id)

    return {
      valid: true,
      storeId: data.store_id,
      permissions: data.permissions,
    }
  } catch (error) {
    console.error("Error validating API key:", error)
    return { valid: false, error: "API key validation failed" }
  }
}

// OPTIONS /api/v1/orders - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  })
}

// GET /api/v1/orders - Get all orders
export async function GET(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("authorization")
    const apiKey = authHeader?.replace("Bearer ", "")

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Validate API key
    const validation = await validateApiKey(apiKey)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Check permissions
    if (!validation.permissions?.orders) {
      return NextResponse.json(
        { error: "Insufficient permissions for orders access" },
        {
          status: 403,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "50")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")
    const status = url.searchParams.get("status")

    // Build query
    let query = supabase
      .from("shopify_orders")
      .select(`
        id,
        shopify_order_id,
        order_number,
        customer_name,
        customer_email,
        order_date,
        status,
        total_amount,
        shipping_cost,
        tax_amount,
        shipping_address,
        created_at,
        updated_at,
        shopify_order_items (
          id,
          sku,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order("order_date", { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: ordersData, error } = await query

    if (error) {
      console.error("Error fetching orders:", error)
      return NextResponse.json(
        { error: "Failed to fetch orders data" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Get total count for pagination
    let countQuery = supabase.from("shopify_orders").select("*", { count: "exact", head: true })

    if (status) {
      countQuery = countQuery.eq("status", status)
    }

    const { count } = await countQuery

    // Transform data to match API format
    const orders =
      ordersData?.map((order) => ({
        id: order.id,
        order_id: order.shopify_order_id,
        order_number: order.order_number,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
        },
        order_date: order.order_date,
        status: order.status,
        totals: {
          subtotal: order.total_amount - (order.shipping_cost || 0) - (order.tax_amount || 0),
          shipping: order.shipping_cost || 0,
          tax: order.tax_amount || 0,
          total: order.total_amount,
        },
        shipping_address: order.shipping_address,
        items:
          order.shopify_order_items?.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })) || [],
        created_at: order.created_at,
        updated_at: order.updated_at,
      })) || []

    return NextResponse.json(
      {
        success: true,
        data: orders,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: offset + limit < (count || 0),
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in orders API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  }
}

// POST /api/v1/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("authorization")
    const apiKey = authHeader?.replace("Bearer ", "")

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Validate API key
    const validation = await validateApiKey(apiKey)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Check permissions
    if (!validation.permissions?.orders) {
      return NextResponse.json(
        { error: "Insufficient permissions for orders access" },
        {
          status: 403,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Parse request body
    const body = await request.json()
    const { order_id, order_number, customer, order_date, status, totals, shipping_address, items } = body

    // Validate required fields
    if (!order_id || !order_number || !customer?.name || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Missing required fields: order_id, order_number, customer.name, items" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.sku || !item.name || item.quantity === undefined || item.unit_price === undefined) {
        return NextResponse.json(
          { error: "Each item must have: sku, name, quantity, unit_price" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }
    }

    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from("shopify_orders")
      .insert({
        store_id: validation.storeId,
        shopify_order_id: order_id,
        order_number,
        customer_name: customer.name,
        customer_email: customer.email || null,
        order_date: order_date || new Date().toISOString(),
        status: status || "pending",
        total_amount: totals?.total || 0,
        shipping_cost: totals?.shipping || 0,
        tax_amount: totals?.tax || 0,
        shipping_address: shipping_address || null,
        inventory_processed: false,
      })
      .select()
      .single()

    if (orderError) {
      console.error("Error creating order:", orderError)
      return NextResponse.json(
        { error: "Failed to create order" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      sku: item.sku,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price || item.quantity * item.unit_price,
    }))

    const { data: itemsData, error: itemsError } = await supabase
      .from("shopify_order_items")
      .insert(orderItems)
      .select()

    if (itemsError) {
      console.error("Error creating order items:", itemsError)
      // Clean up the order if items creation failed
      await supabase.from("shopify_orders").delete().eq("id", orderData.id)

      return NextResponse.json(
        { error: "Failed to create order items" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Transform response data
    const order = {
      id: orderData.id,
      order_id: orderData.shopify_order_id,
      order_number: orderData.order_number,
      customer: {
        name: orderData.customer_name,
        email: orderData.customer_email,
      },
      order_date: orderData.order_date,
      status: orderData.status,
      totals: {
        subtotal: orderData.total_amount - (orderData.shipping_cost || 0) - (orderData.tax_amount || 0),
        shipping: orderData.shipping_cost || 0,
        tax: orderData.tax_amount || 0,
        total: orderData.total_amount,
      },
      shipping_address: orderData.shipping_address,
      items:
        itemsData?.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })) || [],
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
    }

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in orders POST API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  }
}
