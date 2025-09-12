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

// GET /api/v1/inventory - Get all inventory items
export async function GET(request: NextRequest) {
  console.log("[v0] =================================")
  console.log("[v0] Inventory API GET called")
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request pathname:", request.nextUrl.pathname)
  console.log("[v0] Request method:", request.method)
  console.log("[v0] Request headers:", Object.fromEntries(request.headers.entries()))
  console.log("[v0] =================================")

  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("authorization")
    const apiKey = authHeader?.replace("Bearer ", "")

    console.log("[v0] Auth header:", authHeader)
    console.log("[v0] Extracted API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "none")

    if (!apiKey) {
      console.log("[v0] No API key provided")
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
    console.log("[v0] Validating API key...")
    const validation = await validateApiKey(apiKey)
    console.log("[v0] API key validation result:", validation)

    if (!validation.valid) {
      console.log("[v0] API key validation failed:", validation.error)
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
    if (!validation.permissions?.inventory) {
      console.log("[v0] Insufficient permissions:", validation.permissions)
      return NextResponse.json(
        { error: "Insufficient permissions for inventory access" },
        {
          status: 403,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    console.log("[v0] Fetching inventory data...")
    // Get inventory data with aggregated quantities
    const { data: inventoryData, error } = await supabase
      .from("inventory")
      .select(`
        sku,
        product_name,
        quantity_available,
        unit_cost_with_delivery
      `)
      .order("sku", { ascending: true })

    if (error) {
      console.error("Error fetching inventory:", error)
      return NextResponse.json(
        { error: "Failed to fetch inventory data" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    const { data: incomingData } = await supabase
      .from("purchase_orders")
      .select(`
        items,
        status
      `)
      .in("status", ["Pending", "Ordered", "Shipped"])

    const { data: reservedData } = await supabase
      .from("shopify_orders")
      .select(`
        line_items,
        fulfillment_status
      `)
      .neq("fulfillment_status", "fulfilled")

    const incomingBySku: Record<string, number> = {}
    incomingData?.forEach((po) => {
      if (po.items && Array.isArray(po.items)) {
        po.items.forEach((item: any) => {
          if (item.sku && item.quantity) {
            incomingBySku[item.sku] = (incomingBySku[item.sku] || 0) + item.quantity
          }
        })
      }
    })

    const reservedBySku: Record<string, number> = {}
    reservedData?.forEach((order) => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item: any) => {
          if (item.sku && item.quantity) {
            reservedBySku[item.sku] = (reservedBySku[item.sku] || 0) + item.quantity
          }
        })
      }
    })

    const inventoryBySku: Record<string, any> = {}
    inventoryData?.forEach((item) => {
      if (!inventoryBySku[item.sku]) {
        inventoryBySku[item.sku] = {
          sku: item.sku,
          product_name: item.product_name,
          in_stock: 0,
          unit_cost: item.unit_cost_with_delivery || 0,
        }
      }
      inventoryBySku[item.sku].in_stock += item.quantity_available || 0
      // Use the most recent unit cost
      if (item.unit_cost_with_delivery) {
        inventoryBySku[item.sku].unit_cost = item.unit_cost_with_delivery
      }
    })

    const inventory = Object.values(inventoryBySku).map((item: any) => ({
      SKU: item.sku,
      ProductName: item.product_name,
      InStock: item.in_stock,
      Incoming: incomingBySku[item.sku] || 0,
      Reserved: reservedBySku[item.sku] || 0,
      UnitCost: Number.parseFloat((item.unit_cost || 0).toFixed(2)),
    }))

    console.log("[v0] Successfully returning inventory data with", inventory.length, "items")
    return NextResponse.json(
      { products: inventory },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error in inventory API:", error)
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

// POST /api/v1/inventory - Add new inventory item
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
    if (!validation.permissions?.inventory) {
      return NextResponse.json(
        { error: "Insufficient permissions for inventory access" },
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
    const { sku, name, quantity, unit_cost } = body

    // Validate required fields
    if (!sku || !name || quantity === undefined || unit_cost === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: sku, name, quantity, unit_cost" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Validate data types
    if (typeof quantity !== "number" || typeof unit_cost !== "number") {
      return NextResponse.json(
        { error: "quantity and unit_cost must be numbers" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Create inventory item
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        sku,
        product_name: name,
        quantity_available: quantity,
        unit_cost_with_delivery: unit_cost,
        purchase_date: new Date().toISOString().split("T")[0],
        po_id: null, // Manual inventory entry
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating inventory item:", error)
      return NextResponse.json(
        { error: "Failed to create inventory item" },
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
    const inventoryItem = {
      id: data.id,
      sku: data.sku,
      name: data.product_name,
      quantity: data.quantity_available,
      unit_cost: data.unit_cost_with_delivery,
      purchase_date: data.purchase_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(
      {
        success: true,
        data: inventoryItem,
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
    console.error("Error in inventory POST API:", error)
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
