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

// GET /api/v1/inventory/[id] - Get specific inventory item
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

    const { id } = params

    // Get inventory item
    const { data, error } = await supabase
      .from("inventory")
      .select(`
        id,
        sku,
        product_name,
        quantity_available,
        unit_cost_with_delivery,
        purchase_date,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Inventory item not found" },
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }

      console.error("Error fetching inventory item:", error)
      return NextResponse.json(
        { error: "Failed to fetch inventory item" },
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
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in inventory GET API:", error)
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

// PUT /api/v1/inventory/[id] - Update inventory item
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

    const { id } = params

    // Parse request body
    const body = await request.json()
    const { sku, name, quantity, unit_cost } = body

    // Build update object with only provided fields
    const updates: any = {}
    if (sku !== undefined) updates.sku = sku
    if (name !== undefined) updates.product_name = name
    if (quantity !== undefined) {
      if (typeof quantity !== "number") {
        return NextResponse.json(
          { error: "quantity must be a number" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }
      updates.quantity_available = quantity
    }
    if (unit_cost !== undefined) {
      if (typeof unit_cost !== "number") {
        return NextResponse.json(
          { error: "unit_cost must be a number" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }
      updates.unit_cost_with_delivery = unit_cost
    }

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

    // Update inventory item
    const { data, error } = await supabase.from("inventory").update(updates).eq("id", id).select().single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Inventory item not found" },
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
          },
        )
      }

      console.error("Error updating inventory item:", error)
      return NextResponse.json(
        { error: "Failed to update inventory item" },
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
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in inventory PUT API:", error)
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

// DELETE /api/v1/inventory/[id] - Delete inventory item
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { id } = params

    // Delete inventory item
    const { error } = await supabase.from("inventory").delete().eq("id", id)

    if (error) {
      console.error("Error deleting inventory item:", error)
      return NextResponse.json(
        { error: "Failed to delete inventory item" },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Inventory item deleted successfully",
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Error in inventory DELETE API:", error)
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

// OPTIONS /api/v1/inventory/[id] - Handle CORS preflight requests
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
