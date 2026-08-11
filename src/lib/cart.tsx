import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from './products'

const STORAGE_KEY = 'creasetalk-cart-v1'

export type CartLine = {
  productId: string
  name: string
  price: number
  image_url: string | null
  stripe_price_id: string | null
  size: string | null
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  subtotal: number
  addItem: (
    product: Product,
    opts: { size: string | null; quantity: number },
  ) => void
  setQuantity: (productId: string, size: string | null, quantity: number) => void
  removeItem: (productId: string, size: string | null) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function lineKey(productId: string, size: string | null) {
  return `${productId}::${size ?? ''}`
}

function loadStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartLine[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() =>
    typeof window === 'undefined' ? [] : loadStored(),
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    const subtotal = lines.reduce(
      (sum, line) => sum + line.price * line.quantity,
      0,
    )

    return {
      lines,
      count,
      subtotal,
      addItem(product, opts) {
        const qty = Math.max(1, Math.min(20, Math.floor(opts.quantity)))
        setLines((prev) => {
          const key = lineKey(product.id, opts.size)
          const existing = prev.find(
            (l) => lineKey(l.productId, l.size) === key,
          )
          if (existing) {
            return prev.map((l) =>
              lineKey(l.productId, l.size) === key
                ? { ...l, quantity: Math.min(20, l.quantity + qty) }
                : l,
            )
          }
          return [
            ...prev,
            {
              productId: product.id,
              name: product.name,
              price: Number(product.price),
              image_url: product.image_url,
              stripe_price_id: product.stripe_price_id,
              size: opts.size,
              quantity: qty,
            },
          ]
        })
      },
      setQuantity(productId, size, quantity) {
        const next = Math.floor(quantity)
        setLines((prev) => {
          if (next <= 0) {
            return prev.filter((l) => lineKey(l.productId, l.size) !== lineKey(productId, size))
          }
          return prev.map((l) =>
            lineKey(l.productId, l.size) === lineKey(productId, size)
              ? { ...l, quantity: Math.min(20, next) }
              : l,
          )
        })
      },
      removeItem(productId, size) {
        setLines((prev) =>
          prev.filter(
            (l) => lineKey(l.productId, l.size) !== lineKey(productId, size),
          ),
        )
      },
      clear() {
        setLines([])
      },
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
