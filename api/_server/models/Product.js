import mongoose from 'mongoose';

// Storefront catalogue product (public website) — SEO-friendly.
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    shortDesc: { type: String, default: '' },
    longDesc: { type: String, default: '' },
    category: { type: String, default: 'general' },
    priceFrom: { type: Number, default: 0 },
    specs: {
      cell: { type: String, default: '' },
      bms: { type: String, default: '' },
      voltage: { type: Number, default: 0 },
      ah: { type: Number, default: 0 },
      sizeMm: { type: String, default: '' },
    },
    images: [{ url: String, alt: String }],
    applications: { type: [String], default: [] },
    seo: { title: String, metaDescription: String, keywords: [String] },
    active: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
