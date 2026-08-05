import crypto from 'crypto';
import config from '../config/index.js';

// Razorpay integration with a mock fallback so the app works in dev
// without API keys. When keys are configured, real payment orders are
// created and verified; otherwise orders are auto-marked 'paid'.

export const isRazorpayConfigured = () =>
  Boolean(config.razorpayKeyId && config.razorpayKeySecret);

const getRazorpay = async () => {
  const { default: Razorpay } = await import('razorpay');
  return new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
};

// Create a payment order (Razorpay) or signal mock mode.
export const createPaymentOrder = async ({ amount, receipt }) => {
  if (!isRazorpayConfigured()) {
    return { mode: 'mock', mock: true };
  }
  const razorpay = await getRazorpay();
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
  });
  return { mode: 'razorpay', mock: false, razorpayOrder };
};

// Verify a Razorpay signature after a successful client-side payment.
export const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', config.razorpayKeySecret)
    .update(body)
    .digest('hex');
  return expected === razorpaySignature;
};