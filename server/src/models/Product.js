import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, alt: { type: String, default: '' } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    shortDesc: { type: String, default: '' },
    longDesc: { type: String, default: '' },
    specs: {
      cell: { type: String, default: '' },
      bms: { type: String, default: '' },
      voltage: { type: Number, default: 0 },
      ah: { type: Number, default: 0 },
      sizeMm: { type: String, default: '' },
    },
    priceFrom: { type: Number, default: 0, min: 0 },
    images: { type: [imageSchema], default: [] },
    category: { type: String, default: 'general' },
    seo: {
      title: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      keywords: { type: [String], default: [] },
    },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
