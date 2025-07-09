import { NextResponse } from "next/server"

/**
 * POST body → { domain: string; accessToken: string; sinceId?: string }
 * Response  → { ok: true; orders: any[] }  OR  { ok: false; error: string }
 */
export async function POST(req: Request) {
  const { domain, accessToken, sinceId } = await req.json()

  if (!domain || !accessToken) {
    return NextResponse.json({ ok: false, error: "Missing domain or accessToken" }, { status: 400 })
  }

  const searchParams = new URLSearchParams({
    status: "any",
    limit: "250",
  })
  if (sinceId) searchParams.set("since_id", sinceId)

  try {
    const res = await fetch(`https://${domain}/admin/api/2023-10/orders.json?${searchParams}`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Shopify responded with ${res.status}` }, { status: 400 })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, orders: data.orders })
  } catch (err) {
    console.error("Order sync proxy error:", err)
    return NextResponse.json({ ok: false, error: "Network error – unable to reach Shopify" }, { status: 500 })
  }
}
