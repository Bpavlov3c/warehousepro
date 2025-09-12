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

// GET /api/v1/orders/[id] - Get specific order
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { id } = params

    // Get order with items
    const { data, error } = await supabase
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
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Order not found" },
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }

      console.error("Error fetching order:", error)
      return NextResponse.json(
        { error: "Failed to fetch order" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Transform data to match API format
    const order = {
      id: data.id,
      order_id: data.shopify_order_id,
      order_number: data.order_number,
      customer: {
        name: data.customer_name,
        email: data.customer_email,
      },
      order_date: data.order_date,
      status: data.status,
      totals: {
        subtotal: data.total_amount - (data.shipping_cost || 0) - (data.tax_amount || 0),
        shipping: data.shipping_cost || 0,
        tax: data.tax_amount || 0,
        total: data.total_amount,
      },
      shipping_address: data.shipping_address,
      items:
        data.shopify_order_items?.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })) || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in order GET API:", error)
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

// PUT /api/v1/orders/[id] - Update order status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { id } = params

    // Parse request body
    const body = await request.json()
    const { status, shipping_address } = body

    // Build update object with only provided fields
    const updates: any = {}
    if (status !== undefined) updates.status = status
    if (shipping_address !== undefined) updates.shipping_address = shipping_address

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Update order
    const { data, error } = await supabase
      .from("shopify_orders")
      .update(updates)
      .eq("id", id)
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
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Order not found" },
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }

      console.error("Error updating order:", error)
      return NextResponse.json(
        { error: "Failed to update order" },
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
      id: data.id,
      order_id: data.shopify_order_id,
      order_number: data.order_number,
      customer: {
        name: data.customer_name,
        email: data.customer_email,
      },
      order_date: data.order_date,
      status: data.status,
      totals: {
        subtotal: data.total_amount - (data.shipping_cost || 0) - (data.tax_amount || 0),
        shipping: data.shipping_cost || 0,
        tax: data.tax_amount || 0,
        total: data.total_amount,
      },
      shipping_address: data.shipping_address,
      items:
        data.shopify_order_items?.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })) || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in order PUT API:", error)
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
