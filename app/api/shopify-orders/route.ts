import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Mock Shopify orders data for now
    const mockOrders = [
      {
        id: 1,
        order_number: "#1001",
        customer_name: "John Doe",
        email: "john@example.com",
        total_price: 99.99,
        status: "fulfilled",
        created_at: "2024-01-15T10:30:00Z",
        items: [
          { name: "Wireless Mouse", quantity: 1, price: 25.99 },
          { name: "USB Cable", quantity: 2, price: 12.5 },
        ],
      },
      {
        id: 2,
        order_number: "#1002",
        customer_name: "Jane Smith",
        email: "jane@example.com",
        total_price: 149.5,
        status: "pending",
        created_at: "2024-01-16T14:20:00Z",
        items: [
          { name: "Laptop Stand", quantity: 1, price: 45.0 },
          { name: "Bluetooth Headphones", quantity: 1, price: 89.99 },
        ],
      },
    ]

    return NextResponse.json(mockOrders)
  } catch (error) {
    console.error("❌ Error fetching Shopify orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch Shopify orders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
