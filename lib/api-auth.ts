import { createServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"

interface ApiKey {
  id: string
  store_id: string
  key_name: string
  api_key: string
  permissions: {
    inventory: boolean
    orders: boolean
  }
  is_active: boolean
  last_used: string | null
}

export async function validateApiKey(request: NextRequest): Promise<ApiKey | null> {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

  // Create Supabase client
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get: () => "",
      set: () => {},
      remove: () => {},
    },
  })

  try {
    // Validate API key and get permissions
    const { data: keyData, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single()

    if (error || !keyData) {
      return null
    }

    // Update last_used timestamp
    await supabase.from("api_keys").update({ last_used: new Date().toISOString() }).eq("id", keyData.id)

    return keyData as ApiKey
  } catch (error) {
    console.error("API key validation error:", error)
    return null
  }
}

export function hasPermission(apiKey: ApiKey, permission: "inventory" | "orders"): boolean {
  return apiKey.permissions[permission] === true
}

export function createApiResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export function createErrorResponse(message: string, status = 400) {
  return createApiResponse({ error: message }, status)
}
