import { supabase } from './supabase/client'

export type Product = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string
  stripe_price_id: string | null
  sku: string | null
  fulfillment_type: 'manual' | 'printful' | 'printify'
  pod_variant_id: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export type ProductDetails = {
  gallery: string[]
  sizes: string[] | null
  highlights: string[]
  care: string | null
  shipping: string
}

const PRODUCT_SELECT =
  'id, name, description, price, image_url, category, stripe_price_id, sku, fulfillment_type, pod_variant_id, is_active, display_order, created_at'

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const DEFAULT_SHIPPING =
  'Ships in 3–7 business days within the US & Canada. Tracking emailed after fulfillment.'

/** Placeholder catalog for client preview until real products + Stripe go live. */
export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-logo-tee',
    name: 'CreaseTalk Logo Tee',
    description:
      'Heavyweight black tee with the orange CreaseTalk mark. Cut for everyday wear — soft hand-feel, reinforced collar, and a print that holds up after wash cycles.',
    price: 32,
    image_url:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-TEE-01',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 1,
    created_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'demo-hoodie',
    name: 'Night Session Hoodie',
    description:
      'Oversized fleece for late drops and long mixes. Kangaroo pocket, brushed interior, and a quiet CreaseTalk chest hit.',
    price: 68,
    image_url:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-HOOD-01',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 2,
    created_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'demo-cap',
    name: 'Signal Cap',
    description:
      'Structured five-panel with embroidered CreaseTalk wordmark. Adjustable strap, breathable crown.',
    price: 28,
    image_url:
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1200&q=80',
    category: 'Accessories',
    stripe_price_id: null,
    sku: 'CT-CAP-01',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 3,
    created_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'demo-tote',
    name: 'Vinyl Run Tote',
    description:
      'Heavy canvas tote built for records, cables, and weekend runs. Interior pocket + reinforced straps.',
    price: 24,
    image_url:
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80',
    category: 'Accessories',
    stripe_price_id: null,
    sku: 'CT-TOTE-01',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 4,
    created_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'demo-poster',
    name: 'CreaseTalk City Poster',
    description:
      '18×24 archival print — orange type on black. Ships flat in a protective mailer. Limited preview drop.',
    price: 22,
    image_url:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    category: 'Prints',
    stripe_price_id: null,
    sku: 'CT-POST-01',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 5,
    created_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'demo-socks',
    name: 'Studio Socks',
    description:
      'Two-pack crew socks with the CT stripe. Cushioned sole for long studio days.',
    price: 18,
    image_url:
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=1200&q=80',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-SOCK-01',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 6,
    created_at: '2026-08-11T00:00:00.000Z',
  },
]

const DEMO_DETAILS: Record<string, ProductDetails> = {
  'demo-logo-tee': {
    gallery: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=80',
    ],
    sizes: APPAREL_SIZES,
    highlights: [
      '6.5 oz heavyweight cotton',
      'Screen-printed CreaseTalk mark',
      'Unisex fit — size up for oversized',
    ],
    care: 'Machine wash cold, inside out. Tumble dry low. Do not iron print.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-hoodie': {
    gallery: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578587018452-892baccfdcfa?auto=format&fit=crop&w=1200&q=80',
    ],
    sizes: APPAREL_SIZES,
    highlights: [
      'Brushed fleece interior',
      'Oversized street cut',
      'Kangaroo pocket + ribbed cuffs',
    ],
    care: 'Wash cold, hang dry preferred.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-cap': {
    gallery: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1200&q=80',
    ],
    sizes: ['One size'],
    highlights: ['Embroidered wordmark', 'Adjustable strap', 'Structured crown'],
    care: 'Spot clean only.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-tote': {
    gallery: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80',
    ],
    sizes: null,
    highlights: ['12 oz canvas', 'Interior zip pocket', 'Fits 12" records'],
    care: 'Spot clean. Air dry.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-poster': {
    gallery: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ],
    sizes: ['18×24'],
    highlights: ['Archival matte stock', 'Ships flat', 'Numbered preview run'],
    care: null,
    shipping: 'Ships flat in a rigid mailer within 5 business days.',
  },
  'demo-socks': {
    gallery: [
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=1200&q=80',
    ],
    sizes: ['S/M', 'L/XL'],
    highlights: ['Two-pack', 'Cushioned sole', 'CT stripe detail'],
    care: 'Machine wash warm. Tumble dry low.',
    shipping: DEFAULT_SHIPPING,
  },
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function isDemoProduct(product: Product | { id: string }) {
  return product.id.startsWith('demo-')
}

export function canCheckout(product: Product) {
  return Boolean(product.stripe_price_id) && !isDemoProduct(product)
}

export function getProductDetails(product: Product): ProductDetails {
  const demo = DEMO_DETAILS[product.id]
  if (demo) return demo

  const needsSize =
    product.category === 'Apparel' || product.category === 'Accessories'
  return {
    gallery: product.image_url ? [product.image_url] : [],
    sizes: needsSize ? APPAREL_SIZES : null,
    highlights: [
      product.fulfillment_type === 'manual'
        ? 'Fulfilled by CreaseTalk'
        : `Print-on-demand via ${product.fulfillment_type}`,
      product.sku ? `SKU ${product.sku}` : 'Official CreaseTalk merch',
    ],
    care:
      product.category === 'Apparel'
        ? 'Machine wash cold. Tumble dry low.'
        : null,
    shipping: DEFAULT_SHIPPING,
  }
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as Product[]
  return rows.length > 0 ? rows : DEMO_PRODUCTS
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const demo = DEMO_PRODUCTS.find((p) => p.id === id)
  if (demo) {
    // Prefer live catalog when present; demo ids only resolve if catalog empty
    const catalog = await fetchActiveProducts()
    return catalog.find((p) => p.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return (data as Product | null) ?? null
}

export async function fetchRelatedProducts(
  product: Product,
  limit = 3,
): Promise<Product[]> {
  const all = await fetchActiveProducts()
  return all
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      const aSame = a.category === product.category ? 0 : 1
      const bSame = b.category === product.category ? 0 : 1
      return aSame - bSame
    })
    .slice(0, limit)
}

export type CheckoutLine = {
  priceId: string
  quantity: number
}

/** Creates a Stripe Checkout session (edge function). Requires STRIPE_SECRET_KEY. */
export async function startCheckout(
  lines: CheckoutLine[],
  urls?: { successUrl?: string; cancelUrl?: string },
) {
  if (lines.length === 0) throw new Error('Cart is empty')

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      items: lines,
      // legacy single-item shape still accepted by the function
      priceId: lines[0]?.priceId,
      quantity: lines[0]?.quantity ?? 1,
      successUrl:
        urls?.successUrl ?? `${window.location.origin}/shop?checkout=success`,
      cancelUrl:
        urls?.cancelUrl ?? `${window.location.origin}/shop?checkout=cancel`,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { url?: string }
}
