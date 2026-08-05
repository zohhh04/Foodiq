import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    image: { type: String },
    tags: [{ type: String }],
    inStock: { type: Boolean, default: true },
    prepTimeMin: { type: Number, default: 5, min: 0 },
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

foodItemSchema.index({ name: 'text', tags: 'text', description: 'text' });

export default mongoose.model('FoodItem', foodItemSchema);
