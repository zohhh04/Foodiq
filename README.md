# Foodiq

> **Slogan:** Where Intelligence Meets Every Order
>
> **Title:** AI-Driven Smart Canteen Food Ordering and Queue Optimization System

Foodiq modernizes traditional canteen operations through Artificial Intelligence and digital automation. Customers can browse the menu, place food orders, make online payments, and receive real-time order updates through a user-friendly application.

---

## 1. System Architecture

```
Frontend (React)   <-->   Backend (Node.js + Express)   <-->   MongoDB
                              |   |   |
                              |   |   +-- Cloudinary (food images)
                              |   +-- Redis (live queues / tokens / wait-time cache)
                              +-- Socket.io (realtime tracking) + FCM (push)
                                    |
                               AI Services (recommendations, wait-time prediction, queue optimization)
```

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), Tailwind CSS, Redux Toolkit / React Query |
| Backend | Node.js + Express (REST API) |
| Database | MongoDB (Mongoose ODM) |
| Realtime | Socket.io (live order/queue status) |
| Queue cache | Redis (digital tokens, live queue state, wait-time cache) |
| Push | Firebase Cloud Messaging (FCM) |
| Files | Cloudinary (menu images) |
| AI | Python microservice (FastAPI) + scikit-learn |
| Payments | Razorpay / Stripe (UPI, Card, Wallet) |

---

## 2. Feature Modules

### Auth & User
- Secure Login and Registration (JWT + refresh tokens, bcrypt password hashing)
- User Profile Management

### Menu & Discovery
- Browse Food Menu by Categories
- Smart Search and Filters
- AI-Based Food Recommendations
- Favorite Foods

### Ordering
- Add to Cart & Modify Quantity
- Secure Online Payments (UPI/Card/Wallet)
- Real-Time Order Tracking

### Queue System (the "smarts")
- Live Queue Status Display
- Estimated Waiting Time Prediction
- Smart Digital Token Generation
- Queue Optimization (AI-driven queue handling)

### Post-Order
- Order History
- Customer Feedback & Ratings
- Push Notifications for Order Updates

---

## 3. Database Schema (MongoDB collections)

```
User          - name, email, passwordHash, phone, role (customer/admin), avatar, favorites[]
Category      - name, slug, image
FoodItem      - name, description, price, categoryId, image, tags[], inStock, prepTimeMin
Cart          - userId, items[{ foodItemId, qty }]
Order         - userId, items[{ foodItemId, qty, price }], total, status, paymentStatus,
                tokenNumber, queuePosition, estimatedWaitMin, createdAt
QueueToken    - orderId, tokenNumber, status (waiting/preparing/ready/picked)
Rating        - userId, orderId, foodItemId, rating, comment
Notification  - userId, title, body, read, createdAt
```

---

## 4. Build Phases (systematic flow)

| Phase | Deliverable | Result |
|-------|-------------|--------|
| **1. Setup** | Monorepo (backend + frontend), env files, DB connection | Skeleton runs |
| **2. Auth** | Register/Login/JWT, profile routes | Users can sign in |
| **3. Menu** | Category + FoodItem models, seed data, CRUD, image upload | Browse catalog |
| **4. Cart + Orders** | Cart, order creation, payment gateway, order status | Place orders |
| **5. AI Layer** | Recommendation engine, wait-time prediction, queue optimizer | "Smart" features live |
| **6. Realtime** | Socket.io tracking, live queue display, tokens, FCM push | Live updates |
| **7. Feedback** | Ratings, order history, favorites, notifications | Retention features |

---

## 5. Folder Structure (target)

```
foodiq/
├── README.md
├── backend/
│   ├── src/
│   │   ├── config/          # env, db, redis
│   │   ├── models/          # Mongoose schemas
│   │   ├── controllers/     # route handlers
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # auth, error, upload
│   │   ├── services/        # AI client, queue service, notifications
│   │   ├── sockets/         # Socket.io handlers
│   │   ├── utils/           # jwt, tokens, responses
│   │   └── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── store/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
└── ai/                      # Python microservice (recommendations, predictions)
```

---

## 6. API Endpoint Map

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET  | `/api/categories` | List categories |
| GET  | `/api/menu` | List food items (+ search/filter) |
| GET  | `/api/menu/:id` | Food item detail |
| GET  | `/api/recommendations` | AI recommendations |
| POST | `/api/cart` | Add to cart |
| GET  | `/api/cart` | Get cart |
| POST | `/api/orders` | Create order (+ payment) |
| GET  | `/api/orders/mine` | User order history |
| GET  | `/api/orders/:id` | Order detail + live status |
| GET  | `/api/queue/status` | Live queue status |
| GET  | `/api/queue/wait/:orderId` | Predicted wait time |
| POST | `/api/queue/next` | Call next token (staff) |
| POST | `/api/queue/:orderId/ready` | Mark token ready (staff) |
| POST | `/api/queue/:orderId/picked` | Mark token picked up (staff) |
| GET  | `/api/notifications` | In-app notifications + unread count |
| GET  | `/api/notifications/unread` | Unread count |
| PUT  | `/api/notifications/read/:id` | Mark one notification read |
| PUT  | `/api/notifications/read-all` | Mark all read |
| POST | `/api/notifications/token` | Register device push token (FCM) |
| POST | `/api/ratings` | Submit feedback/rating |
| GET  | `/api/ratings/my` | My ratings (for "already rated" states) |
| GET  | `/api/ratings/item/:id` | Ratings for a food item |
| GET  | `/api/auth/favorites` | List my favorite food items |
| POST | `/api/auth/favorites/:foodItemId` | Toggle favorite |

WebSocket (Socket.io) events: `order:placed`, `order:status`, `queue:update`, `wait:prediction`, `notification`. Socket connections authenticate with the JWT via the handshake `auth.token`.

---

## 7. Realtime & AI Tool Decisions (summary)

- **Realtime:** Socket.io (own backend, full control) + FCM for push notifications.
- **AI (Python microservice):** Collaborative filtering for recommendations, gradient boosting regression for wait-time, heuristic + predicted-cooking-time for queue optimization.
- Full pros/cons written in `docs/tech-decisions.md`.
