import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

ratingSchema.index({ user: 1, order: 1 }, { unique: true, sparse: true });

export default mongoose.model('Rating', ratingSchema);
