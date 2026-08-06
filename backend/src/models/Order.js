import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
        name: { type: String },
        qty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'placed',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ['upi', 'card', 'cash'], default: 'upi' },
    tokenNumber: { type: Number },
    queuePosition: { type: Number },
    estimatedWaitMin: { type: Number },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Order', orderSchema);
