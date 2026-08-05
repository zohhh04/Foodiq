# Tech Decisions — Realtime & AI

This document explains the choices for the realtime layer and the AI features with pros/cons.

---

## 1. Realtime

Foodiq needs two kinds of "real-time" features:

1. **Live order tracking + queue status display** (in-app, on your own backend).
2. **Push notifications** (delivered to a mobile/web app even when it is closed).

### 1a. In-app realtime: Socket.io vs Firebase (Firestore) vs Polling

| Option | Pros | Cons |
|--------|------|------|
| **Socket.io (RECOMMENDED)** | Full control, runs on your existing Node backend, no extra cost, bidirectional events, great for token counter displays | You manage scaling; connection state to handle; small learning curve |
| Firebase Realtime DB / Firestore | No backend socket code, offline support built in, auto-scaling | Extra platform lock-in, per-read pricing, hard to run complex AI/queue logic inside it |
| Polling (setInterval) | Simplest to build | Slow updates, wasteful requests, not truly realtime |

**Decision:** Socket.io. Use rooms per order (`order:<id>`) and a global room for the live queue (`queue:counter`) so canteen staff and customers see updates instantly.

### 1b. Push notifications: FCM vs OneSignal vs Web Push (service workers)

| Option | Pros | Cons |
|--------|------|------|
| **FCM (RECOMMENDED)** | Free, works on Android/iOS/Web, official SDKs, no extra middle-man | Requires a small server call to send (we call it from backend), setup of API key + service worker on web |
| OneSignal | Very fast to integrate, dashboard UI, no backend code | Extra third-party dependency, free tier limits, less control |
| Native Web Push | No third party | Only works in browsers (not mobile apps), more manual work |

**Decision:** FCM. Backend sends push on order status changes (`order:status` → customer phone buzzes "Your token #12 is ready to collect!").

---

## 2. AI Features

Three AI-ish features are planned. Two are real machine learning, one is algorithmic optimization.

### 2a. AI-Based Food Recommendations

**Approaches:**

| Approach | How it works | Pros | Cons |
|----------|-------------|------|------|
| **Collaborative filtering (RECOMMENDED)** | "Users who ordered X also ordered Y" using order history | Proven, accurate with enough data, simple (surprise/scikit-learn) | Cold-start for new users (fallback to popular items) |
| Content-based | Recommend items similar in category/tags to what you like | Works without other users | No discovery beyond your taste |
| Hybrid | Combine both above | Best accuracy | More complex |

**Decision:** Collaborative filtering via a Python microservice (`ai/`), with a fallback to "most popular in your favorite categories" when a user has no history. Favorite Foods feed the cold-start model.

### 2b. Estimated Waiting Time Prediction

**Approaches:**

| Approach | How it works | Pros | Cons |
|----------|-------------|------|------|
| **Gradient boosting regression (RECOMMENDED)** | Predict `minutes` from queue length, items ordered, prep time, staff on shift, time of day | Accurate, interpretable, handles non-linear patterns | Needs historical data; retrain periodically |
| Simple heuristic | `sum(prepTime) / staffCount + queueAhead` | Zero ML, instant | Inaccurate under load |
| Deep learning | Neural net on the same features | Can be slightly better with huge data | Overkill for a canteen |

**Decision:** Gradient boosting (e.g. LightGBM/XGBoost or sklearn HistGradientBoosting) served by the `ai/` microservice, with the heuristic as a fallback while the model is cold-starting.

### 2c. Smart Digital Token Generation & Queue Optimization

**Approaches:**

| Approach | How it works | Pros | Cons |
|----------|-------------|------|------|
| **Heuristic + predicted time (RECOMMENDED)** | Assign tokens by order time, estimate readiness using per-item prep time + predicted wait; batch similar orders | Deterministic, transparent, easy to explain to staff | Not globally "optimal" |
| Reinforcement learning | Agent learns the optimal serving order over time | Theoretical peak throughput | Unpredictable, needs heavy simulation, risky for a real canteen |
| Round-robin / FIFO | Simple first-come-first-served | Simplest | Ignores prep times, causes uneven load |

**Decision:** Heuristic optimizer in the backend (reuse the wait-time model's predictions). FIFO ordering for tokens, but readiness ETA computed per order so staff know what to cook first. This gives the "smart" feel without production risk.

---

## 3. AI Microservice layout (in this repo)

```
ai/
├── main.py            # FastAPI app: /recommend, /predict-wait
├── recommend.py       # collaborative filtering model
├── wait_time.py       # gradient boosting regressor
├── model_store/       # saved models (.joblib / .pkl)
└── requirements.txt   # fastapi, uvicorn, scikit-learn, lightgbm, surprise
```

The backend calls it over HTTP:
`GET http://localhost:8001/recommend?userId=...` and `POST /predict-wait` with order features.

---

## 4. Technology summary

| Concern | Choice |
|---------|--------|
| Realtime in-app updates | Socket.io (rooms: `order:<id>`, `queue:counter`) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Recommendations | Collaborative filtering + popularity fallback (Python) |
| Wait-time prediction | Gradient boosting regression (Python) |
| Queue optimization | Heuristic + predicted cooking time (backend service) |
| Payment | Razorpay/Stripe (UPI/Card/Wallet) |
| Image storage | Cloudinary |
