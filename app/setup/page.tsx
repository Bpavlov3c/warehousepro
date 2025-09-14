"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function SetupPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = createClient()

  const createAdminUser = async () => {
    setIsCreating(true)
    setMessage("")

    try {
      // Create the admin user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "bogomilpavlov@bebemama.bg",
        password: "Bob1rad1",
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      })

      if (authError) {
        console.error("Auth error:", authError)
        setMessage(`Error creating user: ${authError.message}`)
        return
      }

      if (authData.user) {
        // Create profile for the user
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: "bogomilpavlov@bebemama.bg",
          full_name: "Admin User",
          role: "admin",
        })

        if (profileError) {
          console.error("Profile error:", profileError)
          setMessage(`User created but profile error: ${profileError.message}`)
        } else {
          setMessage("✅ Admin user created successfully! You can now login with: bogomilpavlov@bebemama.bg / Bob1rad1")
        }
      }
    } catch (error) {
      console.error("Setup error:", error)
      setMessage(`Setup error: ${error}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>Create the admin user account for the warehouse management system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              <strong>Email:</strong> bogomilpavlov@bebemama.bg
            </p>
            <p>
              <strong>Password:</strong> Bob1rad1
            </p>
            <p>
              <strong>Role:</strong> Admin
            </p>
          </div>

          <Button onClick={createAdminUser} disabled={isCreating} className="w-full">
            {isCreating ? "Creating Admin User..." : "Create Admin User"}
          </Button>

          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.includes("✅")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            After creating the admin user, go to{" "}
            <a href="/auth/login" className="text-blue-600 hover:underline">
              /auth/login
            </a>{" "}
            to sign in
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
