import { createClient } from "@supabase/supabase-js"

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key for admin operations
export const createServerClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseServiceKey) {
    throw new Error("Missing Supabase service role key")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: number
          sku: string
          product_name: string
          description: string | null
          category: string | null
          unit_of_measure: string
          reorder_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sku: string
          product_name: string
          description?: string | null
          category?: string | null
          unit_of_measure?: string
          reorder_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sku?: string
          product_name?: string
          description?: string | null
          category?: string | null
          unit_of_measure?: string
          reorder_level?: number
          created_at?: string
          updated_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: number
          po_number: string
          supplier_name: string
          po_date: string
          delivery_cost: number
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          po_number: string
          supplier_name: string
          po_date: string
          delivery_cost?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          po_number?: string
          supplier_name?: string
          po_date?: string
          delivery_cost?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      po_items: {
        Row: {
          id: number
          po_id: number
          sku: string
          product_name: string
          quantity: number
          unit_cost: number
          total_cost: number
          created_at: string
        }
        Insert: {
          id?: number
          po_id: number
          sku: string
          product_name: string
          quantity: number
          unit_cost: number
          created_at?: string
        }
        Update: {
          id?: number
          po_id?: number
          sku?: string
          product_name?: string
          quantity?: number
          unit_cost?: number
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: number
          sku: string
          product_name: string
          po_id: number | null
          batch_date: string
          quantity_received: number
          quantity_remaining: number
          unit_cost: number
          location: string | null
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sku: string
          product_name: string
          po_id?: number | null
          batch_date: string
          quantity_received: number
          quantity_remaining: number
          unit_cost: number
          location?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sku?: string
          product_name?: string
          po_id?: number | null
          batch_date?: string
          quantity_received?: number
          quantity_remaining?: number
          unit_cost?: number
          location?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shopify_stores: {
        Row: {
          id: number
          store_name: string
          shop_domain: string
          access_token: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          store_name: string
          shop_domain: string
          access_token?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          store_name?: string
          shop_domain?: string
          access_token?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      shopify_orders: {
        Row: {
          id: number
          shopify_order_id: number
          store_id: number
          order_number: string
          customer_email: string | null
          customer_name: string | null
          order_date: string
          total_amount: number
          currency: string
          fulfillment_status: string | null
          financial_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          shopify_order_id: number
          store_id: number
          order_number: string
          customer_email?: string | null
          customer_name?: string | null
          order_date: string
          total_amount: number
          currency?: string
          fulfillment_status?: string | null
          financial_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          shopify_order_id?: number
          store_id?: number
          order_number?: string
          customer_email?: string | null
          customer_name?: string | null
          order_date?: string
          total_amount?: number
          currency?: string
          fulfillment_status?: string | null
          financial_status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shopify_order_items: {
        Row: {
          id: number
          order_id: number
          shopify_variant_id: number | null
          sku: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: number
          order_id: number
          shopify_variant_id?: number | null
          sku?: string | null
          product_name: string
          quantity: number
          unit_price: number
          created_at?: string
        }
        Update: {
          id?: number
          order_id?: number
          shopify_variant_id?: number | null
          sku?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          created_at?: string
        }
      }
    }
    Views: {
      product_inventory_summary: {
        Row: {
          sku: string
          product_name: string
          category: string | null
          reorder_level: number
          current_stock: number
          avg_unit_cost: number
          total_value: number
          batch_count: number
        }
      }
      profit_analysis: {
        Row: {
          sku: string | null
          product_name: string
          total_sold: number
          avg_selling_price: number
          avg_cost_price: number
          avg_profit_per_unit: number
          total_revenue: number
          total_cost: number
          total_profit: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
  console.error("Supabase error:", error)

  if (error?.message) {
    return error.message
  }

  if (error?.details) {
    return error.details
  }

  return "An unexpected database error occurred"
}

// Test connection function
export async function testSupabaseConnection() {
  try {
    console.log("🔌 Testing Supabase connection...")

    const { data, error } = await supabase.from("products").select("count", { count: "exact", head: true })

    if (error) {
      throw error
    }

    console.log("✅ Supabase connection successful!")
    return true
  } catch (error) {
    console.error("❌ Supabase connection failed:", error)
    return false
  }
}
