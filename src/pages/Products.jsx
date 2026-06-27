import { useState } from 'react';
import { useListProductsQuery, useCreateProductMutation, useUpdateProductMutation } from '../features/products/productsApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader, Badge, Field } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, apiError } from '../lib/format';
import { SITE_URL } from '../lib/config';

// Flat form shape. Nested API fields (specs, seo, images) are flattened here for
// simple inputs and re-nested in `save()`.
const BLANK_PRODUCT = {
  name: '', slug: '', shortDesc: '', longDesc: '', category: 'general',
  priceFrom: 0, featured: false, active: true,
  specs: { cell: '', bms: '', voltage: 0, ah: 0 },
  seoKeywords: '', imageUrl: '',
};

export default function Products() {
  const toast = useToast();
  const { data, isFetching } = useListProductsQuery({ limit: 100 });
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  // `modal` is null (closed), {} (new), or { id } (editing).
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK_PRODUCT);

  const openNew = () => { setForm(BLANK_PRODUCT); setModal({}); };

  const openEdit = (p) => {
    setForm({
      ...BLANK_PRODUCT,
      ...p,
      specs: { ...BLANK_PRODUCT.specs, ...(p.specs || {}) },
      seoKeywords: (p.seo?.keywords || []).join(', '),
      imageUrl: p.images?.[0]?.url || '',
    });
    setModal({ id: p._id });
  };

  const save = async () => {
    // Re-nest the flat form into the API's shape.
    const body = {
      name: form.name,
      slug: form.slug || undefined, // blank → let the server auto-generate
      shortDesc: form.shortDesc,
      longDesc: form.longDesc,
      category: form.category,
      priceFrom: Number(form.priceFrom),
      featured: !!form.featured,
      active: !!form.active,
      specs: {
        cell: form.specs.cell,
        bms: form.specs.bms,
        voltage: Number(form.specs.voltage),
        ah: Number(form.specs.ah),
      },
      seo: { keywords: (form.seoKeywords || '').split(',').map((s) => s.trim()).filter(Boolean) },
      images: form.imageUrl ? [{ url: form.imageUrl, alt: form.name }] : [],
    };

    try {
      if (modal.id) await updateProduct({ id: modal.id, ...body }).unwrap();
      else await createProduct(body).unwrap();
      toast.success('Product saved');
      setModal(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const columns = [
    {
      key: 'name', header: 'Product',
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-slate-400">/{r.slug}</div>
        </div>
      ),
    },
    { key: 'specs', header: 'Spec', render: (r) => `${r.specs?.voltage || 0}V · ${r.specs?.ah || 0}Ah` },
    { key: 'priceFrom', header: 'From', align: 'right', render: (r) => inr(r.priceFrom) },
    { key: 'featured', header: '', render: (r) => (r.featured ? <Badge color="bg-amber-100 text-amber-700">featured</Badge> : null) },
    {
      key: 'active', header: '',
      render: (r) => (
        <Badge color={r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>
          {r.active ? 'live' : 'hidden'}
        </Badge>
      ),
    },
    {
      key: 'view', header: '',
      render: (r) => (
        <a className="text-xs text-brand-700 hover:underline" href={`${SITE_URL}/products/${r.slug}`} target="_blank" rel="noreferrer">View ↗</a>
      ),
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(r)}>Edit</button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Website / Products"
        subtitle="Storefront catalogue — each product is SEO-rendered & indexable"
        actions={(
          <>
            <a className="btn-ghost" href={`${SITE_URL}/`} target="_blank" rel="noreferrer">View site ↗</a>
            <button className="btn-primary" onClick={openNew}>+ Product</button>
          </>
        )}
      />

      <div className="card p-5">
        <DataTable columns={columns} rows={data?.data || []} loading={isFetching} emptyText="No products." />
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        wide
        title={modal?.id ? 'Edit product' : 'New product'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Slug (blank = auto)">
            <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Price from (₹)">
            <input className="input" type="number" value={form.priceFrom} onChange={(e) => setForm({ ...form, priceFrom: e.target.value })} />
          </Field>
          <Field label="Image URL">
            <input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </Field>
        </div>

        <Field label="Short description">
          <input className="input" value={form.shortDesc} onChange={(e) => setForm({ ...form, shortDesc: e.target.value })} />
        </Field>
        <Field label="Long description">
          <textarea className="input" rows={2} value={form.longDesc} onChange={(e) => setForm({ ...form, longDesc: e.target.value })} />
        </Field>

        <div className="grid grid-cols-4 gap-3">
          <Field label="Cell">
            <input className="input" value={form.specs.cell} onChange={(e) => setForm({ ...form, specs: { ...form.specs, cell: e.target.value } })} />
          </Field>
          <Field label="BMS">
            <input className="input" value={form.specs.bms} onChange={(e) => setForm({ ...form, specs: { ...form.specs, bms: e.target.value } })} />
          </Field>
          <Field label="Voltage">
            <input className="input" type="number" value={form.specs.voltage} onChange={(e) => setForm({ ...form, specs: { ...form.specs, voltage: e.target.value } })} />
          </Field>
          <Field label="Ah">
            <input className="input" type="number" value={form.specs.ah} onChange={(e) => setForm({ ...form, specs: { ...form.specs, ah: e.target.value } })} />
          </Field>
        </div>

        <Field label="SEO keywords (comma sep)">
          <input className="input" value={form.seoKeywords} onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })} />
        </Field>

        <div className="mt-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active (live on site)
          </label>
        </div>
      </Modal>
    </div>
  );
}
