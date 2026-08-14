import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Minus, Plus, Share2 } from 'lucide-react'
import { useCart } from '../lib/cart'
import {
  canCheckout,
  fetchProductById,
  fetchRelatedProducts,
  formatPrice,
  getProductDetails,
  isDemoProduct,
  startCheckout,
  type Product,
} from '../lib/products'

export function ShopProductPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null)
  const [added, setAdded] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    window.scrollTo(0, 0)
    setLoading(true)
    setError(null)
    setQuantity(1)
    setActiveImage(0)
    setAdded(false)

    async function load() {
      try {
        const row = await fetchProductById(productId!)
        if (cancelled) return
        if (!row) {
          setProduct(null)
          setError('Item not found.')
          return
        }
        setProduct(row)
        const details = getProductDetails(row)
        setSize(details.sizes?.[0] ?? null)
        setColor(details.colors?.[0]?.name ?? null)
        setActiveImage(0)
        const more = await fetchRelatedProducts(row)
        if (!cancelled) setRelated(more)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load item')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [productId])

  const details = product ? getProductDetails(product) : null
  const colors = details?.colors ?? []
  const selectedColor = colors.find((c) => c.name === color) ?? colors[0] ?? null
  const gallery = details?.gallery.length
    ? details.gallery
    : product?.image_url
      ? [product.image_url]
      : []
  const heroImage =
    selectedColor?.image ?? gallery[activeImage] ?? product?.image_url ?? null
  const needsSize = Boolean(details?.sizes?.length)
  const needsColor = colors.length > 0
  const checkoutReady = product ? canCheckout(product) : false

  function validateSelection() {
    if (needsSize && !size) {
      setError('Choose a size to continue.')
      return false
    }
    if (needsColor && !color) {
      setError('Choose a color to continue.')
      return false
    }
    return true
  }

  function onAddToCart() {
    if (!product || !validateSelection()) return
    setError(null)
    setBusy('cart')
    addItem(product, {
      size,
      color,
      quantity,
      image_url: heroImage,
    })
    setAdded(true)
    setBusy(null)
    window.setTimeout(() => setAdded(false), 2000)
  }

  async function onBuyNow() {
    if (!product || !validateSelection()) return
    if (!checkoutReady || !product.stripe_price_id) {
      setError(
        isDemoProduct(product)
          ? 'Preview item — checkout unlocks when real products and Stripe go live.'
          : 'This item is not linked to Stripe yet.',
      )
      return
    }
    setBusy('buy')
    setError(null)
    try {
      const { url } = await startCheckout(
        [{ priceId: product.stripe_price_id, quantity }],
        {
          successUrl: `${window.location.origin}/shop?checkout=success`,
          cancelUrl: `${window.location.origin}/shop/${product.id}?checkout=cancel`,
        },
      )
      if (!url) throw new Error('No checkout URL returned')
      window.location.href = url
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Checkout is not available yet — Stripe keys coming soon.',
      )
      setBusy(null)
    }
  }

  async function onShare() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name ?? 'CreaseTalk Shop',
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // user cancelled share — ignore
    }
  }

  if (loading) {
    return (
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-sm text-black/60">Loading item…</p>
        </div>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="bg-white py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Link
            to="/shop"
            className="mb-6 inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Back to shop
          </Link>
          <p className="text-sm text-red-600">{error ?? 'Item not found.'}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Link
          to="/shop"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back to shop
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="aspect-[4/5] bg-neutral-100">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={
                    selectedColor
                      ? `${product.name} — ${selectedColor.name}`
                      : product.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map((src, i) => {
                  const colorForThumb = colors.find((c) => c.image === src)
                  const selected =
                    (selectedColor?.image ?? gallery[activeImage]) === src
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setActiveImage(i)
                        if (colorForThumb) setColor(colorForThumb.name)
                      }}
                      className={`aspect-square overflow-hidden border ${
                        selected
                          ? 'border-ct-orange'
                          : 'border-ct-border'
                      }`}
                    >
                      <img
                        src={src}
                        alt={colorForThumb?.name ?? ''}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-ct-orange uppercase">
              {product.category}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight uppercase md:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 text-2xl font-bold">
              {formatPrice(Number(product.price))}
            </p>
            {product.sku && (
              <p className="mt-1 text-xs text-black/45">SKU {product.sku}</p>
            )}

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-black/70">
                {product.description}
              </p>
            )}

            {needsColor && (
              <div className="mt-8">
                <p className="text-xs font-bold tracking-wide uppercase">
                  Color{color ? ` — ${color}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {colors.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => {
                        setColor(option.name)
                        const idx = gallery.indexOf(option.image)
                        if (idx >= 0) setActiveImage(idx)
                      }}
                      className={`border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
                        color === option.name
                          ? 'border-black bg-black text-white'
                          : 'border-ct-border bg-white text-black hover:border-black'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {needsSize && details?.sizes && (
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-wide uppercase">
                    Size
                  </p>
                  {product.category === 'Apparel' && (
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('size-guide')
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }
                      className="text-[10px] font-bold tracking-wide text-black/50 uppercase underline-offset-2 hover:text-ct-orange hover:underline"
                    >
                      Size guide
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {details.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      className={`min-w-12 border px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
                        size === option
                          ? 'border-black bg-black text-white'
                          : 'border-ct-border bg-white text-black hover:border-black'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <p className="text-xs font-bold tracking-wide uppercase">
                Quantity
              </p>
              <div className="mt-3 inline-flex items-center border border-ct-border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 hover:bg-neutral-50"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-10 text-center text-sm font-bold">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  className="p-3 hover:bg-neutral-50"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={busy !== null}
                onClick={onAddToCart}
                className="flex-1 border border-black bg-white px-4 py-3.5 text-xs font-bold tracking-wide text-black uppercase transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                {added ? (
                  <span className="inline-flex items-center gap-2">
                    <Check className="size-4" /> Added
                  </span>
                ) : busy === 'cart' ? (
                  'Adding…'
                ) : (
                  'Add to cart'
                )}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void onBuyNow()}
                className="flex-1 bg-black px-4 py-3.5 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-ct-orange hover:text-black disabled:opacity-50"
              >
                {busy === 'buy'
                  ? 'Redirecting…'
                  : checkoutReady
                    ? 'Buy now'
                    : 'Coming soon'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void onShare()}
                className="inline-flex items-center gap-2 text-[10px] font-bold tracking-wide text-black/55 uppercase hover:text-ct-orange"
              >
                <Share2 className="size-3.5" />
                {copied ? 'Link copied' : 'Share'}
              </button>
              {added && (
                <button
                  type="button"
                  onClick={() => navigate('/shop/cart')}
                  className="text-[10px] font-bold tracking-wide text-ct-orange uppercase"
                >
                  View cart →
                </button>
              )}
            </div>

            {isDemoProduct(product) && (
              <p className="mt-6 border border-ct-border bg-[#f7f7f7] px-4 py-3 text-xs text-black/65">
                Preview item for layout. Add to cart works locally; Stripe Buy
                Now activates when live products are connected.
              </p>
            )}

            {details && details.highlights.length > 0 && (
              <ul className="mt-8 space-y-2 border-t border-ct-border pt-8">
                {details.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm text-black/70 before:mt-2 before:block before:size-1.5 before:shrink-0 before:bg-ct-orange"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {details?.care && (
              <div className="mt-6">
                <p className="text-xs font-bold tracking-wide uppercase">
                  Care
                </p>
                <p className="mt-2 text-sm text-black/65">{details.care}</p>
              </div>
            )}

            <div className="mt-6">
              <p className="text-xs font-bold tracking-wide uppercase">
                Shipping
              </p>
              <p className="mt-2 text-sm text-black/65">
                {details?.shipping}
              </p>
            </div>

            {product.category === 'Apparel' && (
              <div id="size-guide" className="mt-8 border border-ct-border p-5">
                <p className="text-xs font-bold tracking-wide uppercase">
                  Size guide
                </p>
                <p className="mt-2 text-sm text-black/65">
                  Unisex fit. Chest measurements (inches): XS 32–34 · S 35–37 ·
                  M 38–40 · L 41–43 · XL 44–46 · XXL 47–49. When between sizes,
                  size up for an oversized look.
                </p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16 border-t border-ct-border pt-12">
            <h2 className="text-xl font-black tracking-tight uppercase">
              You may also like
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/shop/${item.id}`}
                  className="group block border border-ct-border"
                >
                  <div className="aspect-[4/5] bg-neutral-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-bold uppercase group-hover:underline">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {formatPrice(Number(item.price))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
