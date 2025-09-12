export async function GET() {
  console.log("[v0] Test API endpoint hit")

  return new Response(
    JSON.stringify({
      message: "API routing is working",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  )
}
