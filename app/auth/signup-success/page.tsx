import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-green-600 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Check Your Email</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-green-600">Account Created Successfully!</CardTitle>
            <CardDescription className="text-center">Please verify your email to complete registration</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              We've sent a confirmation email to your inbox. Please click the verification link to activate your account
              and access the warehouse management system.
            </p>
            <div className="pt-4">
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 text-sm">
                Return to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
