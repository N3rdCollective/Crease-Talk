import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import {
  fetchActiveProducts,
  formatPrice,
  isDemoProduct,
  type Product,
} from '../lib/products'

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const checkoutState = searchParams.get('checkout')

  useEffect(() => {
    window.scrollTo(0, 0)
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchActiveProducts()
        if (!cancelled) setProducts(rows)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load shop')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <PageHeader
          title="THE SHOP"
          description="Official CreaseTalk gear. Open an item for sizes, quantity, and checkout."
          backTo="/"
        />

        {checkoutState === 'success' && (
          <p className="mt-8 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Payment received — thanks for supporting CreaseTalk.
          </p>
        )}
        {checkoutState === 'cancel' && (
          <p className="mt-8 border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Checkout canceled. Your cart was not charged.
          </p>
        )}

        {loading && (
          <p className="mt-10 text-sm text-black/60">Loading gear…</p>
        )}
        {error && <p className="mt-10 text-sm text-red-600">{error}</p>}

        {!loading && products.length > 0 && (
          <>
            {isDemoProduct(products[0]) && (
              <p className="mt-8 border border-ct-border bg-[#f7f7f7] px-4 py-3 text-sm text-black/70">
                Preview catalog — sample items for layout. Real drops replace
                these automatically when added in admin.
              </p>
            )}
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/shop/${product.id}`}
                  className="group flex flex-col border border-ct-border"
                >
                  <div className="relative aspect-[4/5] bg-neutral-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                    ) : null}
                    <span className="absolute top-3 left-3 bg-black px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
                      {product.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h2 className="text-xl font-black tracking-tight uppercase group-hover:underline">
                      {product.name}
                    </h2>
                    {product.description && (
                      <p className="line-clamp-2 text-sm text-black/60">
                        {product.description}
                      </p>
                    )}
                    <p className="text-lg font-bold">
                      {formatPrice(Number(product.price))}
                    </p>
                    <span className="mt-4 w-full bg-black px-4 py-3 text-center text-xs font-bold tracking-wide text-white uppercase transition-colors group-hover:bg-ct-orange group-hover:text-black">
                      View item
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
