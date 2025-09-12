export async function GET() {
  console.log("[v0] Public inventory endpoint called")

  const testData = {
    products: [
      {
        SKU: "TEST-001",
        ProductName: "Test Product 1",
        InStock: 100,
        Incoming: 25,
        Reserved: 10,
        UnitCost: 15.99,
      },
      {
        SKU: "TEST-002",
        ProductName: "Test Product 2",
        InStock: 50,
        Incoming: 0,
        Reserved: 5,
        UnitCost: 29.99,
      },
    ],
  }

  return new Response(JSON.stringify(testData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
