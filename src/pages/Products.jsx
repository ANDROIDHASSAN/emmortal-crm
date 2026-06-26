import { useState } from 'react';
import { useListProductsQuery, useCreateProductMutation, useUpdateProductMutation } from '../features/products/productsApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader, Badge, Field } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, apiError } from '../lib/format';
import { SITE_URL } from '../lib/config';

const blank = { name: '', slug: '', shortDesc: '', longDesc: '', category: 'general', priceFrom: 0, featured: false, active: true, specs: { cell: '', bms: '', voltage: 0, ah: 0 }, seoKeywords: '', imageUrl: '' };

export default function Products() {
  const toast = useToast();
  const { data, isFetching } = useListProductsQuery({ limit: 100 });
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [modal, setModal] = useState(null);
  const [f, setF] = useState(blank);

  const openEdit = (p) => { setF({ ...blank, ...p, specs: { ...blank.specs, ...(p.specs || {}) }, seoKeywords: (p.seo?.keywords || []).join(', '), imageUrl: p.images?.[0]?.url || '' }); setModal({ id: p._id }); };
  const save = async () => {
    const body = { name: f.name, slug: f.slug || undefined, shortDesc: f.shortDesc, longDesc: f.longDesc, category: f.category, priceFrom: Number(f.priceFrom), featured: !!f.featured, active: !!f.active, specs: { cell: f.specs.cell, bms: f.specs.bms, voltage: Number(f.specs.voltage), ah: Number(f.specs.ah) }, seo: { keywords: (f.seoKeywords || '').split(',').map((s) => s.trim()).filter(Boolean) }, images: f.imageUrl ? [{ url: f.imageUrl, alt: f.name }] : [] };
    try { if (modal.id) await updateProduct({ id: modal.id, ...body }).unwrap(); else await createProduct(body).unwrap(); toast.success('Product saved'); setModal(null); } catch (e) { toast.error(apiError(e)); }
  };

  const cols = [
    { key: 'name', header: 'Product', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">/{r.slug}</div></div> },
    { key: 'specs', header: 'Spec', render: (r) => `${r.specs?.voltage || 0}V · ${r.specs?.ah || 0}Ah` },
    { key: 'priceFrom', header: 'From', align: 'right', render: (r) => inr(r.priceFrom) },
    { key: 'featured', header: '', render: (r) => r.featured ? <Badge color="bg-amber-100 text-amber-700">featured</Badge> : null },
    { key: 'active', header: '', render: (r) => <Badge color={r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>{r.active ? 'live' : 'hidden'}</Badge> },
    { key: 'view', header: '', render: (r) => <a className="text-xs text-brand-700 hover:underline" href={`${SITE_URL}/products/${r.slug}`} target="_blank" rel="noreferrer">View ↗</a> },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(r)}>Edit</button> },
  ];

  return (
    <div>
      <PageHeader title="Website / Products" subtitle="Storefront catalogue — each product is SEO-rendered & indexable"
        actions={<><a className="btn-ghost" href={`${SITE_URL}/`} target="_blank" rel="noreferrer">View site ↗</a><button className="btn-primary" onClick={() => { setF(blank); setModal({}); }}>+ Product</button></>} />
      <div className="card p-5"><DataTable columns={cols} rows={data?.data || []} loading={isFetching} emptyText="No products." /></div>

      <Modal open={!!modal} onClose={() => setModal(null)} wide title={modal?.id ? 'Edit product' : 'New product'}
        footer={<><button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Slug (blank = auto)"><input className="input" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
          <Field label="Price from (₹)"><input className="input" type="number" value={f.priceFrom} onChange={(e) => setF({ ...f, priceFrom: e.target.value })} /></Field>
          <Field label="Image URL"><input className="input" value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} /></Field>
        </div>
        <Field label="Short description"><input className="input" value={f.shortDesc} onChange={(e) => setF({ ...f, shortDesc: e.target.value })} /></Field>
        <Field label="Long description"><textarea className="input" rows={2} value={f.longDesc} onChange={(e) => setF({ ...f, longDesc: e.target.value })} /></Field>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Cell"><input className="input" value={f.specs.cell} onChange={(e) => setF({ ...f, specs: { ...f.specs, cell: e.target.value } })} /></Field>
          <Field label="BMS"><input className="input" value={f.specs.bms} onChange={(e) => setF({ ...f, specs: { ...f.specs, bms: e.target.value } })} /></Field>
          <Field label="Voltage"><input className="input" type="number" value={f.specs.voltage} onChange={(e) => setF({ ...f, specs: { ...f.specs, voltage: e.target.value } })} /></Field>
          <Field label="Ah"><input className="input" type="number" value={f.specs.ah} onChange={(e) => setF({ ...f, specs: { ...f.specs, ah: e.target.value } })} /></Field>
        </div>
        <Field label="SEO keywords (comma sep)"><input className="input" value={f.seoKeywords} onChange={(e) => setF({ ...f, seoKeywords: e.target.value })} /></Field>
        <div className="mt-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active (live on site)</label>
        </div>
      </Modal>
    </div>
  );
}
