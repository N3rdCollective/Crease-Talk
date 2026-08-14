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
  /** Colorways — selecting one swaps the hero image */
  colors?: Array<{ name: string; image: string }>
  highlights: string[]
  care: string | null
  shipping: string
}

export type ProductInput = {
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  category?: string
  sku?: string | null
  stripe_price_id?: string | null
  fulfillment_type?: Product['fulfillment_type']
  is_active?: boolean
  display_order?: number
}

const PRODUCT_SELECT =
  'id, name, description, price, image_url, category, stripe_price_id, sku, fulfillment_type, pod_variant_id, is_active, display_order, created_at'

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SHORT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const DEFAULT_SHIPPING =
  'Ships in 3–7 business days within the US & Canada. Tracking emailed after fulfillment.'

/** Placeholder catalog using local CreaseTalk tee mockups until live products are added. */
export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-tee-hustlers',
    name: 'Hustlers Tee',
    description:
      'Cream oversized tee — CreaseTalk mark on the front, “Be careful how you treat hustlers…” quote on the back.',
    price: 40,
    image_url: '/shop/tee-hustlers-front.png',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-TEE-HUSTLERS',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 1,
    created_at: '2026-08-14T00:00:00.000Z',
  },
  {
    id: 'demo-tee-stack-black',
    name: 'Dear Black Girl Tee',
    description:
      'Statement tee with the Dear Black Girl back graphic. Placeholder mockup for the shop.',
    price: 40,
    image_url: '/shop/tee-stack-on-black.png',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-TEE-DBG',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 2,
    created_at: '2026-08-14T00:00:00.000Z',
  },
  {
    id: 'demo-tee-black-white',
    name: 'CreaseTalk Black Mark Tee',
    description:
      'Black tee with red CreaseTalk mark. Clean contrast for everyday fits.',
    price: 35,
    image_url: '/shop/tee-black-on-white.png',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-TEE-BLACK',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 3,
    created_at: '2026-08-14T00:00:00.000Z',
  },
  {
    id: 'demo-shorts-beware',
    name: 'Beware of the Crease Shorts',
    description:
      'Mesh athletic shorts with the Beware of the Crease crest and CREASE leg print. Four colorways — Black, Blue, Sage, Red.',
    price: 45,
    image_url: '/shop/shorts-black.png',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-SHORTS-BEWARE',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 4,
    created_at: '2026-08-14T00:00:00.000Z',
  },
  {
    id: 'demo-tee-mark',
    name: 'CreaseTalk Isolated Mark',
    description:
      'Orange CreaseTalk mark treatment — placeholder art for upcoming colorways.',
    price: 35,
    image_url: '/shop/tee-mark.png',
    category: 'Apparel',
    stripe_price_id: null,
    sku: 'CT-TEE-MARK',
    fulfillment_type: 'manual',
    pod_variant_id: null,
    is_active: true,
    display_order: 5,
    created_at: '2026-08-14T00:00:00.000Z',
  },
]

const DEMO_DETAILS: Record<string, ProductDetails> = {
  'demo-tee-hustlers': {
    gallery: [
      '/shop/tee-hustlers-front.png',
      '/shop/tee-hustlers-back.png',
    ],
    sizes: APPAREL_SIZES,
    highlights: [
      'Front: CreaseTalk script mark',
      'Back: Hustlers quote print',
      'Oversized cream blank',
    ],
    care: 'Machine wash cold, inside out. Tumble dry low. Do not iron print.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-tee-stack-black': {
    gallery: ['/shop/tee-stack-on-black.png'],
    sizes: APPAREL_SIZES,
    highlights: [
      'Dear Black Girl back graphic',
      'Unisex fit — size up for oversized',
      'CreaseTalk merch placeholder',
    ],
    care: 'Machine wash cold, inside out. Tumble dry low. Do not iron print.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-tee-black-white': {
    gallery: ['/shop/tee-black-on-white.png'],
    sizes: APPAREL_SIZES,
    highlights: [
      'Red CreaseTalk chest mark',
      'Unisex fit — size up for oversized',
      'CreaseTalk merch placeholder',
    ],
    care: 'Machine wash cold, inside out. Tumble dry low. Do not iron print.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-shorts-beware': {
    gallery: [
      '/shop/shorts-black.png',
      '/shop/shorts-blue.png',
      '/shop/shorts-green.png',
      '/shop/shorts-red.png',
    ],
    sizes: SHORT_SIZES,
    colors: [
      { name: 'Black', image: '/shop/shorts-black.png' },
      { name: 'Blue', image: '/shop/shorts-blue.png' },
      { name: 'Sage', image: '/shop/shorts-green.png' },
      { name: 'Red', image: '/shop/shorts-red.png' },
    ],
    highlights: [
      'Four colorways: Black, Blue, Sage, Red',
      'Beware of the Crease crest + CREASE leg print',
      'Mesh athletic cut with drawstring',
    ],
    care: 'Machine wash cold. Hang dry preferred.',
    shipping: DEFAULT_SHIPPING,
  },
  'demo-tee-mark': {
    gallery: ['/shop/tee-mark.png'],
    sizes: APPAREL_SIZES,
    highlights: [
      'Isolated mark artwork',
      'Placeholder for upcoming colorways',
    ],
    care: 'Machine wash cold, inside out. Tumble dry low. Do not iron print.',
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

export async function fetchAllProductsForAdmin(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Product[]
}

export async function fetchProductById(id: string): Promise<Product | null> {
  if (id.startsWith('demo-')) {
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

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      image_url: input.image_url?.trim() || null,
      category: input.category?.trim() || 'Apparel',
      sku: input.sku?.trim() || null,
      stripe_price_id: input.stripe_price_id?.trim() || null,
      fulfillment_type: input.fulfillment_type ?? 'manual',
      is_active: input.is_active ?? true,
      display_order: input.display_order ?? 0,
    })
    .select(PRODUCT_SELECT)
    .single()
  if (error) throw error
  return data as Product
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<Product> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null
  }
  if (input.price !== undefined) patch.price = input.price
  if (input.image_url !== undefined) {
    patch.image_url = input.image_url?.trim() || null
  }
  if (input.category !== undefined) {
    patch.category = input.category.trim() || 'Apparel'
  }
  if (input.sku !== undefined) patch.sku = input.sku?.trim() || null
  if (input.stripe_price_id !== undefined) {
    patch.stripe_price_id = input.stripe_price_id?.trim() || null
  }
  if (input.fulfillment_type !== undefined) {
    patch.fulfillment_type = input.fulfillment_type
  }
  if (input.is_active !== undefined) patch.is_active = input.is_active
  if (input.display_order !== undefined) {
    patch.display_order = input.display_order
  }

  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single()
  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg'
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
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
