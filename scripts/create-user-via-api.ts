// Script to create the admin user via Supabase Auth API
// This ensures proper security and password hashing

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createAdminUser() {
  try {
    console.log("[v0] Creating admin user account...")

    // Create the user with admin role
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: "bogomilpavlov@bebemama.bg",
      password: "Bob1rad1",
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        full_name: "Bogomil Pavlov",
        role: "admin",
      },
    })

    if (createError) {
      console.error("[v0] Error creating user:", createError.message)
      return
    }

    console.log("[v0] Admin user created successfully:", user.user?.email)
    console.log("[v0] User ID:", user.user?.id)

    // Update the user's profile with admin role
    if (user.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.user.id,
        email: user.user.email,
        full_name: "Bogomil Pavlov",
        role: "admin",
      })

      if (profileError) {
        console.error("[v0] Error updating profile:", profileError.message)
      } else {
        console.log("[v0] Admin profile updated successfully")
      }
    }

    console.log("[v0] Admin user setup complete!")
    console.log("[v0] Login credentials:")
    console.log("[v0] Email: bogomilpavlov@bebemama.bg")
    console.log("[v0] Password: Bob1rad1")
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
  }
}

// Execute the function
createAdminUser()
