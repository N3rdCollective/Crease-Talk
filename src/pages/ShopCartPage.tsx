import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../lib/cart'
import { formatPrice, startCheckout } from '../lib/products'

export function ShopCartPage() {
  const { lines, subtotal, setQuantity, removeItem, clear } = useCart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkoutLines = lines.filter((l) => l.stripe_price_id)
  const hasDemoOnly =
    lines.length > 0 && checkoutLines.length === 0

  async function onCheckout() {
    if (checkoutLines.length === 0) {
      setError(
        hasDemoOnly
          ? 'Preview cart — checkout unlocks when real products and Stripe go live.'
          : 'No checkout-ready items in your cart.',
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { url } = await startCheckout(
        checkoutLines.map((l) => ({
          priceId: l.stripe_price_id!,
          quantity: l.quantity,
        })),
        {
          successUrl: `${window.location.origin}/shop?checkout=success`,
          cancelUrl: `${window.location.origin}/shop/cart?checkout=cancel`,
        },
      )
      if (!url) throw new Error('No checkout URL returned')
      clear()
      window.location.href = url
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Checkout is not available yet — Stripe keys coming soon.',
      )
      setBusy(false)
    }
  }

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <Link
          to="/shop"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Continue shopping
        </Link>

        <h1 className="text-3xl font-black tracking-tight uppercase md:text-4xl">
          Cart
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-ct-orange" />

        {lines.length === 0 ? (
          <p className="mt-10 text-sm text-black/60">
            Your cart is empty.{' '}
            <Link to="/shop" className="font-bold text-ct-orange underline">
              Browse the shop
            </Link>
          </p>
        ) : (
          <>
            <ul className="mt-10 divide-y divide-ct-border border-y border-ct-border">
              {lines.map((line) => (
                <li
                  key={`${line.productId}-${line.size ?? ''}-${line.color ?? ''}`}
                  className="flex gap-4 py-5"
                >
                  <Link
                    to={`/shop/${line.productId}`}
                    className="size-24 shrink-0 bg-neutral-100"
                  >
                    {line.image_url ? (
                      <img
                        src={line.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/shop/${line.productId}`}
                      className="text-sm font-bold uppercase hover:underline"
                    >
                      {line.name}
                    </Link>
                    {(line.color || line.size) && (
                      <p className="mt-1 text-xs text-black/50">
                        {[line.color, line.size ? `Size ${line.size}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-bold">
                      {formatPrice(line.price)}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex items-center border border-ct-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            setQuantity(
                              line.productId,
                              line.size,
                              line.color,
                              line.quantity - 1,
                            )
                          }
                          className="p-2 hover:bg-neutral-50"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-xs font-bold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setQuantity(
                              line.productId,
                              line.size,
                              line.color,
                              line.quantity + 1,
                            )
                          }
                          className="p-2 hover:bg-neutral-50"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() =>
                          removeItem(line.productId, line.size, line.color)
                        }
                        className="p-2 text-black/45 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {formatPrice(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-wide text-black/50 uppercase">
                  Subtotal
                </p>
                <p className="mt-1 text-2xl font-black">
                  {formatPrice(subtotal)}
                </p>
                <p className="mt-1 text-xs text-black/45">
                  Shipping calculated at checkout.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onCheckout()}
                className="bg-black px-6 py-3.5 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-ct-orange hover:text-black disabled:opacity-50"
              >
                {busy
                  ? 'Redirecting…'
                  : hasDemoOnly
                    ? 'Coming soon'
                    : 'Checkout'}
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {hasDemoOnly && (
              <p className="mt-4 border border-ct-border bg-[#f7f7f7] px-4 py-3 text-xs text-black/65">
                Preview cart — quantities and sizes are saved on this device.
                Stripe checkout activates with live products.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
