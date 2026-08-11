import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LineIn = { priceId?: string; quantity?: number };

/**
 * Stripe Checkout session creator.
 * Set secret STRIPE_SECRET_KEY in Edge Function secrets before enabling Buy Now.
 * Accepts `{ items: [{ priceId, quantity }] }` or legacy `{ priceId, quantity }`.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return json(
        {
          error:
            "Stripe is not configured yet. Add STRIPE_SECRET_KEY to Edge Function secrets.",
        },
        503,
      );
    }

    const body = await req.json().catch(() => ({}));
    const successUrl = body?.successUrl as string | undefined;
    const cancelUrl = body?.cancelUrl as string | undefined;

    const rawItems: LineIn[] = Array.isArray(body?.items)
      ? body.items
      : body?.priceId
        ? [{ priceId: body.priceId, quantity: body.quantity ?? 1 }]
        : [];

    const items = rawItems
      .map((item) => ({
        priceId: String(item?.priceId ?? ""),
        quantity: Math.max(1, Math.min(20, Math.floor(Number(item?.quantity) || 1))),
      }))
      .filter((item) => item.priceId.startsWith("price_"));

    if (items.length === 0) {
      return json({ error: "Valid Stripe priceId required" }, 400);
    }
    if (!successUrl || !cancelUrl) {
      return json({ error: "successUrl and cancelUrl required" }, 400);
    }

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("shipping_address_collection[allowed_countries][0]", "US");
    params.set("shipping_address_collection[allowed_countries][1]", "CA");

    items.forEach((item, index) => {
      params.set(`line_items[${index}][price]`, item.priceId);
      params.set(`line_items[${index}][quantity]`, String(item.quantity));
    });

    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return json(
        {
          error: session?.error?.message ?? "Stripe Checkout session failed",
        },
        502,
      );
    }

    return json({ url: session.url, id: session.id });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      500,
    );
  }
});
