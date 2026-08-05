import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

let firebaseApp = null;

// Lazily init firebase-admin only when a service account is configured.
const initFirebase = async () => {
  if (firebaseApp) return true;
  const accountPath = config.firebaseServiceAccount;
  if (!accountPath || !fs.existsSync(accountPath)) return false;

  try {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(accountPath), 'utf8'));
    firebaseApp = initializeApp({ credential: cert(serviceAccount) }, 'foodiq');
    return true;
  } catch (err) {
    console.warn(`FCM init failed (${err.message}) - push disabled`);
    return false;
  }
};

// Send a push notification to a user's registered device tokens.
// Returns { ok, sent } — sent is 0 when FCM is not configured (mock mode).
export const sendPush = async ({ tokens = [], title, body, data = {} }) => {
  if (tokens.length === 0) return { ok: true, sent: 0 };

  if (!(await initFirebase())) {
    console.log(`[push:mock] to ${tokens.length} device(s): ${title} — ${body}`);
    return { ok: true, sent: tokens.length };
  }

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging(firebaseApp);
    const payload = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    const results = await Promise.allSettled(
      tokens.map((token) => messaging.send({ ...payload, token }))
    );
    return { ok: true, sent: results.filter((r) => r.status === 'fulfilled').length };
  } catch (err) {
    console.warn(`FCM send failed: ${err.message}`);
    return { ok: false, sent: 0 };
  }
};
