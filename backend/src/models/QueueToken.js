import mongoose from 'mongoose';

const queueTokenSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    tokenNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ['waiting', 'preparing', 'ready', 'picked'],
      default: 'waiting',
    },
    estimatedWaitMin: { type: Number },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('QueueToken', queueTokenSchema);
