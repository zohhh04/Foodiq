import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
      {
        foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
        qty: { type: Number, required: true, min: 1, default: 1 },
        price: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
