export async function GET(request: Request) {
  console.log("[v0] API route hit - /api/inventory")

  try {
    // Simple test response first
    const testData = {
      products: [
        {
          SKU: "TEST-001",
          ProductName: "Test Product",
          InStock: 100,
          Incoming: 0,
          Reserved: 0,
          UnitCost: 10.0,
        },
      ],
    }

    console.log("[v0] Returning test data:", testData)

    return new Response(JSON.stringify(testData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  } catch (error) {
    console.error("[v0] API Error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
