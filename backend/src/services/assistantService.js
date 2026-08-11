// Rule-based Foodiq assistant — answers student questions precisely from a
// curated knowledge base (works without an external AI service).

const KB = [
  {
    id: 'order',
    keys: [
      'how to order',
      'how do i order',
      'how can i order',
      'how to place',
      'place an order',
      'place order',
      'order food',
      'order now',
      'make an order',
      'make an order',
      'buy food',
      'order something',
      'i want to order',
      'i would like to order',
      'order for me',
      'to order',
      'how does ordering work',
      'order a',
      'order one',
      'steps to order',
      'ordering process',
      'process to order',
      'how do i place an order',
      'how to make an order',
      'what do i do to order',
      'can you order for me',
      'order for us',
      'want to order',
      'need to order',
      'lets order',
      'let us order',
      'help me order',
      'can you help me order',
      'guide me to order',
      'show me how to order',
      'walk me through ordering',
      'explain how to order',
    ],
    words: ['order'],
    answer:
      'To place an order: 1) Browse the Menu and add dishes to your cart, 2) open Cart, 3) pick a pickup slot and a payment method (UPI, Card or Cash), 4) pay — your token number is issued instantly after payment. You can also just tell me what you want (for example "two samosas and a vada pav") and I will add it to your cart for you.',
    suggestions: ['How do I pay?', 'Where do I collect my order?', 'Can I cancel my order?'],
  },
  {
    id: 'payment',
    keys: [
      'how to pay',
      'how do i pay',
      'payment method',
      'payment',
      'pay for',
      'upi',
      'phonepe',
      'gpay',
      'google pay',
      'paytm',
      'credit card',
      'debit card',
      'cash',
      'online payment',
      'pay online',
      'is payment secure',
      'payment safe',
      'secure',
    ],
    words: ['pay', 'payment'],
    answer:
      'We accept UPI (PhonePe, GPay, Paytm), Credit/Debit Card, and Cash on pickup. You choose the method in the Cart before paying. UPI and Card are paid online; Cash is settled at the counter. All online payments are encrypted and secure — your card details are never stored.',
    suggestions: ['Is payment secure?', 'What if payment fails?', 'Can I pay after pickup?'],
  },
  {
    id: 'payment_fail',
    keys: [
      'payment failed',
      'payment fail',
      'transaction failed',
      'money deducted',
      'money taken',
      'double charged',
      'charged twice',
      'payment not processed',
      'payment error',
      'upi failed',
      'card declined',
      'refund',
    ],
    answer:
      'If a payment fails or money is deducted but no order/token appears, do not worry. The amount is automatically refunded to your original payment method within 3-5 business days. If you see a double charge, contact the Foodiq staff at the counter and show your transaction reference — they will escalate it.',
    suggestions: ['How do I pay?', 'Track my order', 'Contact staff'],
  },
  {
    id: 'queue',
    keys: [
      'queue',
      'token',
      'wait time',
      'how long',
      'my turn',
      'position',
      'ahead of me',
      'waiting',
      'how much longer',
      'how many before me',
      'what is a token',
      'token number',
      'where is my token',
    ],
    words: ['queue', 'token', 'wait'],
    answer:
      'After payment you get a token number. Open the Queue page to see the live board: your position, how many tokens are ahead, and the estimated wait time. Your token moves up automatically as people collect their orders. You can also track it live on the Live Tracking page.',
    suggestions: ['Track my order', 'When will it be ready?', 'What is a token?'],
  },
  {
    id: 'status',
    keys: [
      'status',
      'track',
      'tracking',
      'where is my order',
      'order progress',
      'live tracking',
      'preparing',
      'ready for pickup',
      'ready',
      'is my order ready',
      'when will it be ready',
      'picked up',
      'order status',
      'what is the status',
      'has my order',
      'is my food ready',
    ],
    words: ['track', 'status', 'ready'],
    answer:
      'Your order moves through: Order Received -> Preparing -> Ready for Pickup -> Completed. Watch it live on the Live Tracking page — it updates in real time, no refreshing needed. You get a notification at every step, and we ping you the moment your food is ready for pickup.',
    suggestions: ['Ready for pickup — what now?', 'Where do I collect it?', 'How do I rate?'],
  },
  {
    id: 'cancel',
    keys: [
      'cancel',
      'cancelled',
      'cancel order',
      'cancel my order',
      'refund',
      'money back',
      'change my order',
      'remove order',
      'can i cancel',
      'undo order',
    ],
    words: ['cancel', 'refund'],
    answer:
      'Once paid, an order cannot be cancelled through the app. If the kitchen has not started preparing it, speak to the staff at the counter and they can help — refunds are processed back to your original payment method within 3-5 business days.',
    suggestions: ['Where is the counter?', 'How do I contact staff?'],
  },
  {
    id: 'pickup',
    keys: [
      'pickup',
      'collect',
      'counter',
      'slot',
      'booked slot',
      'where do i get',
      'where do i collect',
      'take my order',
      'kitchen',
      'where is the counter',
      'pick up my order',
      'get my food',
      'late',
      'missed my slot',
      'late for pickup',
      'miss my slot',
    ],
    words: ['pickup', 'counter', 'collect', 'slot'],
    answer:
      'Food is collected at the pickup counter. Your booked pickup slot is shown on the order and on the Live Tracking page. When your token shows Ready for Pickup (you get a ping), head to the counter — that is it! If you are late, your food is kept warm at the counter, but try to collect it within your slot so the queue keeps moving.',
    suggestions: ['Track my order', 'What if I am late?'],
  },
  {
    id: 'menu',
    keys: [
      'menu',
      'food',
      'dish',
      'what is there',
      'veg',
      'vegetarian',
      'jain',
      'options',
      'recommend',
      'suggest',
      'price',
      'cost',
      'expensive',
      'cheap',
      'what should i eat',
      'what should i order',
      'what do you have',
      'is there something',
      'show me the menu',
      'popular',
      'bestseller',
      'best dish',
      'famous',
    ],
    words: ['menu', 'food', 'veg', 'price', 'recommend'],
    answer:
      'The Menu has dishes across categories with prep time, price, ratings, and stock shown on each card. Use search and filters to find veg, jain, or budget-friendly picks. Check the Foodiq AI recommendations on the home page for the most popular dishes right now. Prices are set per dish and shown clearly before you add anything to your cart.',
    suggestions: ['What is popular today?', 'Is there a veg option?', 'How are prices set?'],
  },
  {
    id: 'stock',
    keys: [
      'out of stock',
      'not available',
      'sold out',
      'no stock',
      'stock',
      'unavailable',
      'when will it be back',
      'restock',
    ],
    words: ['stock', 'available'],
    answer:
      'Dishes shown as out of stock are marked on the menu card. Stock updates in real time, so refresh the menu to see the latest. You can favourite the dish and check back — we restock popular items through the day.',
    suggestions: ['What is popular today?', 'How do I order?'],
  },
  {
    id: 'delivery',
    keys: [
      'delivery',
      'delivered',
      'deliver to me',
      'home delivery',
      'delivery charge',
      'delivery fee',
      'shipping',
      'free delivery',
      'come to my room',
      'bring to my hostel',
    ],
    words: ['delivery', 'deliver'],
    answer:
      'Foodiq is pickup-only — there is no home delivery. Order online, pick your slot, and collect your food at the counter. That keeps wait times short and prices low.',
    suggestions: ['Where do I collect my order?', 'How do I order?'],
  },
  {
    id: 'favorites',
    keys: [
      'favorite',
      'favourites',
      'save dish',
      'save this dish',
      'heart',
      'saved',
      'bookmark',
      'wishlist',
      'add to favorites',
    ],
    words: ['favorite', 'favourites', 'save', 'saved'],
    answer:
      'Tap the heart on any dish to save it. Your saved dishes appear on the Favorites page, where you can add any of them back to your cart in one tap. Favourites are saved to your account, so they stay across logins.',
    suggestions: ['How do I order?', 'What can I order?'],
  },
  {
    id: 'rating',
    keys: [
      'rating',
      'rate',
      'review',
      'feedback',
      'stars',
      'rate my order',
      'how do i rate',
      'give a rating',
      'leave a review',
      'rate the food',
      'rate my food',
      'i want to rate',
      'can i rate',
      'give feedback',
      'rate my meal',
    ],
    words: ['rate', 'rating', 'review'],
    answer:
      'Once you pick up your order you can rate it from My Orders — tap "Rate this order", pick 1-5 stars, and optionally add a comment. Your feedback directly shapes the menu, and top-rated dishes are highlighted for everyone. Rating a picked-up order also marks it completed in the kitchen\'s records.',
    suggestions: ['Where do I see my ratings?', 'How do I order?'],
  },
  {
    id: 'account',
    keys: [
      'login',
      'register',
      'sign up',
      'sign in',
      'password',
      'forgot',
      'otp',
      'account',
      'profile',
      'logout',
      'log in',
      'log out',
      'signout',
      'sign out',
      'reset password',
      'change password',
      'delete account',
    ],
    words: ['login', 'register', 'account', 'password', 'otp', 'profile'],
    answer:
      'Register with your college email, then log in anytime. Use "Forgot password" to reset via OTP, and manage your details in Profile. Keep your phone or email handy for OTPs. If you need to delete your account, ask the Foodiq staff at the counter.',
    suggestions: ['How do I order?', 'How do I pay?'],
  },
  {
    id: 'notification',
    keys: [
      'notification',
      'notify',
      'alert',
      'ping',
      'bell',
      'update',
      'get notified',
      'how will i know',
      'reminder',
    ],
    words: ['notification', 'notify', 'alert'],
    answer:
      'Tap the bell in the top bar to see all your notifications. You get an alert at every order step — placed, preparing, ready, and completed. Unread ones stay highlighted until you tap them, and a ping goes out the moment your food is ready for pickup.',
    suggestions: ['Track my order', 'What are the steps?'],
  },
  {
    id: 'help',
    keys: [
      'help',
      'support',
      'problem',
      'issue',
      'contact',
      'complaint',
      'staff',
      'assist',
      'who can i talk',
      'talk to someone',
      'contact staff',
      'raise a complaint',
      'not working',
      'bug',
      'error',
      'glitch',
      'broken',
    ],
    words: ['help', 'support', 'problem', 'issue', 'complaint'],
    answer:
      'For anything not covered here, head to the counter and ask the Foodiq staff — they are happy to help with payments, orders, and refunds. For app issues, try logging out and back in, or clearing the browser cache first.',
    suggestions: ['How do I order?', 'How do I pay?', 'Can I cancel?'],
  },
  {
    id: 'hours',
    keys: [
      'open',
      'closed',
      'timing',
      'timings',
      'hours',
      'when are you open',
      'what time',
      'closing time',
      'opening time',
      'breakfast',
      'lunch',
      'dinner',
      'time to order',
      'last order',
    ],
    words: ['open', 'timing', 'hours'],
    answer:
      'The canteen operates during college hours — check the menu page for the live availability of each dish. Order ahead to lock in your pickup slot; slots close as the kitchen fills up.',
    suggestions: ['How do I order?', 'What is popular today?'],
  },
  {
    id: 'quantity',
    keys: [
      'multiple',
      'more than one',
      'quantity',
      'how many',
      'how much can i order',
      'limit',
      'order limit',
      'max order',
      'can i order for friends',
      'order for friends',
      'order for friend',
      'order for my friends',
      'group',
      'group order',
      'order together',
    ],
    words: ['quantity', 'limit', 'group'],
    answer:
      'There is no strict limit — add as many items as you like to your cart and pick a quantity for each (tap + to increase). You can order for your friends too; just add everything to one cart and pay once. Each item shows its stock, and the cart will warn you if something runs low.',
    suggestions: ['How do I order?', 'How do I pay?'],
  },
  {
    id: 'food_quality',
    keys: [
      'hygiene',
      'clean',
      'fresh',
      'spicy',
      'taste',
      'healthy',
      'halal',
      'allergy',
      'allergies',
      'allergic',
      'ingredients',
      'made fresh',
      'quality',
      'food safe',
      'water',
    ],
    words: ['fresh', 'hygiene', 'spicy', 'healthy', 'ingredient'],
    answer:
      'All dishes are prepared fresh in the kitchen in batches. For allergies or specific dietary needs (like jain or low-spice), check the dish description on the menu, and tell the counter staff when you order so they can accommodate you where possible.',
    suggestions: ['Is there a veg option?', 'What is popular today?'],
  },
  {
    id: 'greeting',
    keys: ['hello', 'hi there', 'hey', 'namaste', 'good morning', 'good afternoon', 'good evening', 'hi', 'yo', 'hello there', 'how are you', 'whats up', 'what is up'],
    answer:
      "Hi! I am Foodiq AI — ask me anything about ordering, payments, your queue token, tracking, refunds, or the menu. You can also just tell me what you want to eat, like \"two samosas\", and I will add it to your cart.",
    suggestions: ['How do I order?', 'How do I pay?', 'Order for me', 'Track my order'],
  },
  {
    id: 'thanks',
    keys: ['thank you', 'thanks', 'thank', 'thank u', 'great', 'awesome', 'nice', 'good job', 'perfect', 'superb', 'amazing', 'love it', 'great job', 'cool', 'sweet', 'appreciate'],
    answer:
      'You are welcome! Enjoy your meal. Is there anything else I can help you with?',
    suggestions: ['How do I order?', 'Track my order'],
  },
  {
    id: 'bye',
    keys: ['bye', 'goodbye', 'see you', 'see u', 'take care', 'good night', 'gn', 'talk later', 'see ya', 'gtg'],
    answer:
      'Goodbye! Enjoy your food, and I will be right here whenever you need me. 🎉',
    suggestions: ['How do I order?', 'How do I pay?'],
  },
  {
    id: 'whoareyou',
    keys: ['who are you', 'what are you', 'are you a bot', 'are you real', 'what can you do', 'your name', 'introduce yourself', 'foodiq ai', 'what do you do', 'who is this', 'are you a person', 'are you human', 'are you chatgpt', 'are you an ai'],
    answer:
      "I am Foodiq AI, your canteen assistant! I can answer questions about ordering, payments, the queue, tracking, pickup, refunds, the menu, and more. And yes — I can place an order for you if you just tell me what you want, like \"one masala dosa and a filter coffee\".",
    suggestions: ['Order for me', 'How do I pay?', 'What is popular today?'],
  },
  {
    id: 'discount',
    keys: ['discount', 'offer', 'deal', 'coupon', 'promo', 'special offer', 'student discount', 'cheaper', 'low price', 'any offer', 'promo code', 'cashback', 'free'],
    answer:
      'Prices are already student-friendly! Keep an eye on the home page and the Menu for daily specials and highlighted deals. Any active coupons or offers are shown there — there are no hidden promo codes.',
    suggestions: ['What is popular today?', 'Is there a veg option?', 'How do I order?'],
  },
  {
    id: 'reorder',
    keys: ['reorder', 'order again', 'again order', 'order the same', 'repeat order', 'previous order', 'past order', 'order history', 'my orders', 'see my orders', 'show my orders', 'what did i order', 'old orders'],
    answer:
      'Open My Orders to see your full history. Completed orders can be reordered in one tap — the same items go straight back into your cart.',
    suggestions: ['How do I order?', 'Track my order'],
  },
  {
    id: 'prep_time',
    keys: ['prep time', 'preparation time', 'how long to make', 'cooking time', 'how long does it take', 'ready in', 'how fast', 'speed', 'quick', 'fast food', 'how long will it take', 'how much time', 'time to prepare'],
    words: ['time', 'minutes'],
    answer:
      'Each dish shows its prep time on the menu card. When you order, the queue estimates your total wait and shows it on the Queue page — your token countdown ticks down in real time.',
    suggestions: ['Track my order', 'What is a token?', 'How do I order?'],
  },
  {
    id: 'location',
    keys: ['where are you', 'where is the canteen', 'where is foodiq', 'your location', 'address', 'location', 'which floor', 'where do i find', 'where is it'],
    answer:
      'Foodiq is the campus canteen, right next to the pickup counter. You will see the Foodiq signboard at the counter — head there when your token is Ready for Pickup.',
    suggestions: ['Where do I collect my order?', 'How do I order?'],
  },
  {
    id: 'split_pay',
    keys: ['split bill', 'split payment', 'pay together', 'split between', 'share bill', 'one bill', 'combine order', 'single bill', 'pay for friends', 'group pay', 'split', 'divide the bill', 'pay separately', 'separate bill', 'we split', 'share the bill'],
    answer:
      'Combine everything into one cart and pay once — there is no need to split. Each item keeps its own price, and the total is shown clearly before you pay. For separate bills, each person can order separately.',
    suggestions: ['How do I pay?', 'How do I order?'],
  },
  {
    id: 'balance',
    keys: ['balance', 'wallet', 'foodiq wallet', 'add money', 'recharge', 'prepaid', 'account balance', 'money in wallet'],
    answer:
      'Foodiq does not use a wallet — you pay per order with UPI, Card, or Cash at the counter. No top-ups or stored balance needed.',
    suggestions: ['How do I pay?', 'Is payment secure?'],
  },
  {
    id: 'schedule',
    keys: ['book later', 'schedule order', 'order later', 'order in advance', 'advance booking', 'preorder', 'pre order', 'future order', 'schedule pickup', 'later time'],
    answer:
      'Yes — when you check out, pick a pickup slot: within 30 min, 1 hour, 1.5 hours, or a custom time range. Your food is timed to be ready when you arrive.',
    suggestions: ['Where do I collect my order?', 'How do I order?'],
  },
  {
    id: 'emergency',
    keys: ['urgent', 'emergency', 'right now', 'immediately', 'hurry', 'fast as possible', 'soonest'],
    answer:
      'Pick the earliest pickup slot at checkout (within 30 min) and head to the counter — the queue page shows your live position so you know exactly when to go.',
    suggestions: ['Track my order', 'What is a token?'],
  },
  {
    id: 'drinks',
    keys: ['drink', 'beverage', 'juice', 'coffee', 'tea', 'water', 'cold drink', 'soda', 'milkshake', 'lassi', 'what to drink'],
    answer:
      'Head to the Menu and filter by category to see all available drinks — coffee, tea, juices and more. Every drink shows its price, prep time and stock on its card.',
    suggestions: ['What is popular today?', 'How do I order?'],
  },
  {
    id: 'meal',
    keys: ['thali', 'meal', 'lunch special', 'dinner special', 'combos', 'combo', 'value meal', 'full meal', 'daily special'],
    answer:
      'Check the Menu for thalis, combos and meal deals — they are the best value on campus. Filter by category to find them fast, and look for the highlighted deals on the home page.',
    suggestions: ['Is there a veg option?', 'What is popular today?', 'How do I order?'],
  },
  {
    id: 'admin_orders',
    adminOnly: true,
    keys: [
      'how do i manage orders',
      'how do i handle orders',
      'where do i see orders',
      'see all orders',
      'view all orders',
      'manage orders',
      'how to confirm an order',
      'how to confirm order',
      'confirm an order',
      'confirm order',
      'accept an order',
      'accept order',
      'approve order',
      'how do i mark an order ready',
      'mark order ready',
      'mark as ready',
      'make order ready',
      'how do i update order status',
      'update order status',
      'change order status',
      'move order to next step',
      'advance order',
      'how do i pick up an order',
      'mark picked up',
      'complete an order',
      'complete order',
      'mark completed',
      'order picked up',
      'what do i do with a new order',
      'new order arrived',
      'new order came in',
      'how do i start preparing',
      'start preparing',
      'begin preparing order',
      'how do i manage the queue',
      'how do i handle the queue',
      'manage the queue',
      'control the queue',
    ],
    words: ['admin', 'ready', 'confirm', 'status', 'prepare'],
    answer:
      'Use the Orders page for a live list. Each card shows the token, customer, items and total. Advance an order by tapping the action on its card: Confirm -> Start preparing -> Mark ready -> Order Picked Up. Marking an order ready instantly pings the student with a notification and moves it to Order Ready. Once the student picks up, the order becomes "picked up" and only lands on Order Completed after the student rates it.',
    suggestions: ['How do I mark an order ready?', 'What if an order is cancelled?', 'How do I view demand?'],
  },
  {
    id: 'admin_ready',
    adminOnly: true,
    keys: [
      'where do ready orders go',
      'where do completed orders go',
      'how do i see ready orders',
      'ready orders page',
      'order ready page',
      'what is on the order ready page',
      'what is order ready',
      'ready for pickup list',
      'which orders are ready',
      'how do i manage ready orders',
      'how do i move ready to completed',
      'mark ready order completed',
      'how do i clear ready orders',
      'order ready tab',
      'order completed page',
      'how do i see completed orders',
      'what is on order completed page',
      'completed orders history',
    ],
    words: ['ready', 'completed'],
    answer:
      'Order Ready holds every order whose food is ready for pickup — students are notified the moment an order lands there. The student collects at the counter and you tap "Order Picked Up". The order is then marked as picked up, and it only moves to Order Completed once the student rates it — with the rating stars and feedback shown right on the card.',
    suggestions: ['How do I mark an order ready?', 'How do I view demand?'],
  },
  {
    id: 'admin_demand',
    adminOnly: true,
    keys: [
      'how do i view demand',
      'how do i see demand analysis',
      'demand analysis',
      'view demand analysis',
      'what is selling well',
      'what is popular today',
      'which dish is most popular',
      'best selling dish',
      'bestsellers',
      'top selling',
      'how much revenue',
      'total revenue',
      'how many orders today',
      'total orders',
      'average order value',
      'peak hours',
      'when is the rush',
      'busiest time',
      'peak time',
      'how do i see revenue',
      'revenue report',
      'sales report',
      'how is my business doing',
      'what are the numbers',
      'show me the analytics',
      'analytics',
      'statistics',
      'stats for today',
      'how do i know what to cook',
      'what should i cook more',
      'what dishes to prepare',
      'how much did we earn',
      'how much money did we make',
    ],
    words: ['demand', 'revenue', 'sales', 'analytics'],
    answer:
      'Open Demand Analysis for a live overview: total orders, total revenue, average order value, a status breakdown donut, the top-selling dishes by units sold, and the peak sales hours of the day. It updates live, so you can see exactly what to prepare more of and when the rush hits.',
    suggestions: ['How do I manage orders?', 'What are peak hours?'],
  },
  {
    id: 'admin_cancel',
    adminOnly: true,
    keys: [
      'how do i cancel an order',
      'cancel an order',
      'cancel order for student',
      'how do i refund',
      'process a refund',
      'refund an order',
      'give money back',
      'how do i handle cancellations',
      'handle cancelled orders',
      'what happens when an order is cancelled',
      'cancel a paid order',
      'can i cancel an order',
      'how do i tell a student an order is cancelled',
    ],
    words: ['cancel', 'refund'],
    answer:
      'On the Orders page you can cancel an active order with the Cancel action. The student is notified instantly. Refunds go back to the student\'s original payment method within 3-5 business days; for UPI/Card refunds, share the transaction reference if they ask. Cancelled orders drop off the active queue immediately.',
    suggestions: ['How do I manage orders?', 'How do I view demand?'],
  },
  {
    id: 'admin_stock',
    adminOnly: true,
    keys: [
      'how do i update stock',
      'update stock',
      'change stock',
      'set in stock',
      'mark dish out of stock',
      'out of stock item',
      'how do i restock',
      'restock a dish',
      'add more stock',
      'manage inventory',
      'inventory',
      'edit a dish',
      'update a dish',
      'change price',
      'update price',
      'edit price',
      'change dish price',
      'change the price',
      'change the dish price',
      'add a new dish',
      'add new dish',
      'add dish to menu',
      'create a dish',
      'remove a dish',
      'delete a dish',
      'remove dish from menu',
      'hide a dish',
      'manage the menu',
      'manage menu items',
      'edit menu',
      'update menu',
      'how do i add a new dish',
      'how do i change the price',
      'how do i update a dish',
      'how do i manage inventory',
      'how do i mark a dish unavailable',
    ],
    words: ['stock', 'menu', 'inventory', 'dish', 'price'],
    answer:
      'The Menu shows an edit control on each dish card. From there you can update the price, prep time, tags and stock, mark a dish as in stock or out of stock, edit an existing dish, or remove it. Out-of-stock items are flagged automatically on students\' menus, and stock changes reflect immediately.',
    suggestions: ['How do I view demand?', 'How do I manage orders?'],
  },
  {
    id: 'admin_ai',
    adminOnly: true,
    keys: [
      'how does the ai help me',
      'what can the ai do for me',
      'ai recommendations',
      'ai demand forecasting',
      'ai predictions',
      'ai queue optimization',
      'how does demand analysis work',
      'what does the ai predict',
      'how are recommendations made',
      'ai powered features',
      'what ai features exist',
    ],
    words: ['ai', 'predict', 'recommendation', 'forecast', 'model'],
    answer:
      'The AI powering Foodiq does three jobs for you: 1) demand analytics — it learns order patterns to forecast what will sell, 2) queue optimisation — it predicts wait times and helps keep tokens moving, and 3) menu recommendations — it surfaces popular dishes to students. All of it is driven by your real order and rating data, so the more orders you handle, the smarter it gets.',
    suggestions: ['How do I view demand?', 'What is selling well?'],
  },
  {
    id: 'admin_help',
    adminOnly: true,
    keys: [
      'how do i use the admin panel',
      'admin panel help',
      'admin guide',
      'how does this work for admins',
      'what can i do as admin',
      'what can admins do',
      'admin features',
      'admin dashboard help',
      'how do i manage the app',
      'how do i use this dashboard',
      'explain the admin pages',
      'what pages do admins have',
      'admin navigation',
      'admin getting started',
      'tips for admins',
      'help me as admin',
      'how do i get started as admin',
    ],
    words: ['admin', 'dashboard', 'panel'],
    answer:
      'As an admin you have four pages: Orders (live queue — confirm, prepare, mark ready, pick up), Order Ready (orders awaiting student collection), Order Completed (finished order history), and Demand Analysis (revenue, top dishes, peak hours). Manage the menu and stock from the Menu page. I can explain any of these — just ask, for example "how do I mark an order ready?".',
    suggestions: ['How do I manage orders?', 'How do I view demand?', 'How do I update stock?'],
  },
];

const FALLBACK = {
  answer:
    'I am not 100% sure about that one. I can help with ordering, payments, queue and tokens, live tracking, pickup, refunds, favorites, ratings, and account issues — or you can just tell me what you want to eat and I will add it to your cart.',
  suggestions: ['How do I order?', 'How do I pay?', 'Track my order', 'Where do I collect my order?'],
};

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const answerQuestion = (question, role = 'student') => {
  const q = normalize(question);
  const isAdmin = role === 'admin';
  // Word-boundary check: short keys like "yo"/"hi" must not match inside
  // words ("you", "this"). Long keys can match as plain substrings.
  const matches = (hay, needle) => {
    if (!needle) return false;
    if (needle.length <= 2) {
      return new RegExp(`\\b${needle}\\b`).test(hay);
    }
    return hay.includes(needle);
  };

  let best = null;
  let bestScore = 0;

  for (const entry of KB) {
    if (entry.adminOnly && !isAdmin) continue;
    let score = 0;
    // Phrase matches (exact substring) are the strongest signal.
    for (const key of entry.keys) {
      if (matches(q, key)) score += 2 + key.split(' ').length * 5;
    }
    // Loose keyword matches boost partial hits.
    for (const word of entry.words || []) {
      if (matches(q, word)) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  // Word-overlap fallback: catches reworded phrases like "order for my friends"
  // (matches key "order for friends" by word intersection).
  if (bestScore < 6) {
    const qTokens = q.split(' ').filter((t) => t.length > 2);
    for (const entry of KB) {
      if (entry.adminOnly && !isAdmin) continue;
      for (const key of entry.keys) {
        const keyTokens = key.split(' ').filter((t) => t.length > 2);
        if (keyTokens.length < 3) continue;
        const hits = keyTokens.filter((t) => qTokens.includes(t)).length;
        if (hits >= Math.min(3, keyTokens.length)) {
          const overlapScore = 4 + hits * 2;
          if (overlapScore > bestScore) {
            bestScore = overlapScore;
            best = entry;
          }
        }
      }
    }
  }

  if (!best || bestScore < 4) return { ...FALLBACK };
  return { answer: best.answer, suggestions: best.suggestions, intent: best.id };
};
