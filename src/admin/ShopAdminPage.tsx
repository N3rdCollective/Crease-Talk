import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import {
  createProduct,
  deleteProduct,
  fetchAllProductsForAdmin,
  formatPrice,
  updateProduct,
  uploadProductImage,
  type Product,
} from '../lib/products'
import { useAdminToast } from './AdminToast'

const CATEGORIES = ['Apparel', 'Accessories', 'Prints', 'Other']

type FormState = {
  name: string
  description: string
  price: string
  category: string
  sku: string
  stripe_price_id: string
  display_order: string
  is_active: boolean
  image_url: string
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  price: '35',
  category: 'Apparel',
  sku: '',
  stripe_price_id: '',
  display_order: '0',
  is_active: true,
  image_url: '',
})

function formFromProduct(p: Product): FormState {
  return {
    name: p.name,
    description: p.description ?? '',
    price: String(p.price),
    category: p.category,
    sku: p.sku ?? '',
    stripe_price_id: p.stripe_price_id ?? '',
    display_order: String(p.display_order),
    is_active: p.is_active,
    image_url: p.image_url ?? '',
  }
}

export function ShopAdminPage() {
  const toast = useAdminToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setProducts(await fetchAllProductsForAdmin())
    } catch (err) {
      toast.push(
        err instanceof Error ? err.message : 'Failed to load products',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditingId(product.id)
    setForm(formFromProduct(product))
    setFormOpen(true)
  }

  async function onUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.push('Use a JPEG, PNG, WebP, or GIF image.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.push('Image must be 5MB or smaller.', 'error')
      return
    }
    setBusy(true)
    try {
      const url = await uploadProductImage(file)
      setForm((f) => ({ ...f, image_url: url }))
      toast.push('Image uploaded', 'success')
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    const price = Number(form.price)
    if (!name) {
      toast.push('Name is required', 'error')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.push('Enter a valid price', 'error')
      return
    }

    setBusy(true)
    try {
      const payload = {
        name,
        description: form.description.trim() || null,
        price,
        category: form.category,
        sku: form.sku.trim() || null,
        stripe_price_id: form.stripe_price_id.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
        image_url: form.image_url.trim() || null,
      }
      if (editingId) {
        await updateProduct(editingId, payload)
        toast.push('Product updated', 'success')
      } else {
        await createProduct(payload)
        toast.push('Product added', 'success')
      }
      setFormOpen(false)
      setEditingId(null)
      setForm(emptyForm())
      await load()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(product: Product) {
    if (
      !window.confirm(
        `Remove “${product.name}” from the shop? This cannot be undone.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteProduct(product.id)
      toast.push('Product removed', 'success')
      await load()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Delete failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(product: Product) {
    setBusy(true)
    try {
      await updateProduct(product.id, { is_active: !product.is_active })
      await load()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Shop products
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Add, edit, or remove merch. Placeholder tees show on /shop until
            you publish live items here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/shop"
            target="_blank"
            className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase"
          >
            View shop
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-ct-orange px-4 py-2 text-xs font-bold text-black uppercase"
          >
            <Plus className="size-3.5" />
            Add product
          </button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-6 border border-neutral-200 bg-white p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black tracking-tight uppercase">
              {editingId ? 'Edit product' : 'New product'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false)
                setEditingId(null)
              }}
              className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
            <div>
              <div className="aspect-[4/5] border border-neutral-200 bg-neutral-50">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-neutral-300 py-2 text-[10px] font-bold uppercase disabled:opacity-50"
              >
                <Upload className="size-3.5" />
                Upload image
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Price (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  SKU
                </span>
                <input
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Display order
                </span>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, display_order: e.target.value }))
                  }
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Image URL
                </span>
                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image_url: e.target.value }))
                  }
                  placeholder="/shop/tee.png or https://…"
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  Stripe price ID (optional)
                </span>
                <input
                  value={form.stripe_price_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stripe_price_id: e.target.value,
                    }))
                  }
                  placeholder="price_…"
                  className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                />
                Active on public shop
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-5 bg-black px-4 py-2.5 text-xs font-bold text-white uppercase disabled:opacity-50"
          >
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add to shop'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto border border-neutral-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-neutral-500">Loading products…</p>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-neutral-500">
              No products in the database yet. The public shop is showing
              placeholder tees. Add a product here to replace them.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 bg-ct-orange px-4 py-2 text-xs font-bold text-black uppercase"
            >
              Add first product
            </button>
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black text-xs tracking-wide text-white uppercase">
              <tr>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">Price</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-14 shrink-0 bg-neutral-100">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold uppercase">
                          {product.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {product.category}
                          {product.sku ? ` · ${product.sku}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-bold">
                    {formatPrice(Number(product.price))}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(product)}
                      className={`text-[10px] font-bold uppercase ${
                        product.is_active
                          ? 'text-emerald-700'
                          : 'text-neutral-400'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-neutral-500">
                    {product.display_order}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Edit"
                        disabled={busy}
                        onClick={() => openEdit(product)}
                        className="border border-neutral-200 p-1.5 hover:bg-neutral-50"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        disabled={busy}
                        onClick={() => void onDelete(product)}
                        className="border border-neutral-200 p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
