import mongoose from 'mongoose';

// Customer / supplier master used by accounting + rework.
const partySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ['debtor', 'creditor', 'both'], default: 'both' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    gstin: { type: String, default: '' },
    address: { type: String, default: '' },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Party = mongoose.models.Party || mongoose.model('Party', partySchema);
export default Party;
