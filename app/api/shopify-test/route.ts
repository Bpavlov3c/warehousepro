import { NextResponse } from "next/server"

/**
 * Body: { domain: string; accessToken: string }
 * Returns: { ok: boolean; error?: string }
 */
export async function POST(request: Request) {
  const { domain, accessToken } = await request.json()

  // Basic validation
  if (!domain || !accessToken) {
    return NextResponse.json({ ok: false, error: "Missing domain or accessToken" }, { status: 400 })
  }

  try {
    const res = await fetch(`https://${domain}/admin/api/2023-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      // A short timeout so the UI isn’t stuck on bad domains
      next: { revalidate: 0 }, // disable caching
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Shopify responded with ${res.status}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Shopify connection error:", err)
    return NextResponse.json({ ok: false, error: "Network error – unable to reach Shopify" }, { status: 500 })
  }
}
