import connectDB from '../config/db.js';
import Category from '../models/Category.js';
import FoodItem from '../models/FoodItem.js';

const categoryData = [
  { name: 'South Indian', slug: 'south-indian' },
  { name: 'North Indian', slug: 'north-indian' },
  { name: 'Snacks', slug: 'snacks' },
  { name: 'Beverages', slug: 'beverages' },
  { name: 'Chinese', slug: 'chinese' },
];

const img = (name) => `https://picsum.photos/seed/foodiq-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/600/340`;

const itemData = [
  // South Indian
  { name: 'Masala Dosa', price: 60, tags: ['dosa', 'breakfast'], prepTimeMin: 4, category: 'south-indian', image: img('masala-dosa'), description: 'Crisp golden dosa with spiced potato masala and coconut chutney.' },
  { name: 'Idli Sambar', price: 40, tags: ['idli', 'breakfast'], prepTimeMin: 2, category: 'south-indian', image: img('idli-sambar'), description: 'Steamed soft rice cakes dunked in piping hot sambar.' },
  { name: 'Medu Vada', price: 35, tags: ['vada', 'breakfast'], prepTimeMin: 3, category: 'south-indian', image: img('medu-vada'), description: 'Crispy urad dal fritters with sambar and chutney.' },
  { name: 'Mysore Masala Dosa', price: 75, tags: ['dosa', 'breakfast'], prepTimeMin: 5, category: 'south-indian', image: img('mysore-masala-dosa'), description: 'Fiery red chutney spread dosa stuffed with potato masala.' },
  { name: 'Rava Idli', price: 45, tags: ['idli', 'breakfast'], prepTimeMin: 3, category: 'south-indian', image: img('rava-idli'), description: 'Semolina idlis with cashews, ginger and curry leaves.' },
  { name: 'Uttapam', price: 55, tags: ['savory', 'breakfast'], prepTimeMin: 4, category: 'south-indian', image: img('uttapam'), description: 'Thick onion-tomato pancake topped with herbs.' },
  { name: 'Pongal', price: 50, tags: ['rice', 'breakfast'], prepTimeMin: 3, category: 'south-indian', image: img('pongal'), description: 'Creamy ghee-tempered rice and moong dal khichdi.' },
  { name: 'Curd Rice', price: 50, tags: ['rice', 'cool'], prepTimeMin: 2, category: 'south-indian', image: img('curd-rice'), description: 'Soothing yogurt rice tempered with mustard and curry leaves.' },

  // North Indian
  { name: 'Veg Biryani', price: 120, tags: ['biryani', 'rice'], prepTimeMin: 8, category: 'north-indian', image: img('veg-biryani'), description: 'Fragrant basmati layered with veggies, saffron and biryani masala.' },
  { name: 'Paneer Butter Masala', price: 140, tags: ['paneer', 'curry'], prepTimeMin: 6, category: 'north-indian', image: img('paneer-butter-masala'), description: 'Paneer cubes in a rich buttery tomato-cashew gravy.' },
  { name: 'Chole Bhature', price: 80, tags: ['chole', 'spicy'], prepTimeMin: 5, category: 'north-indian', image: img('chole-bhature'), description: 'Punjabi chickpea curry with fluffy deep-fried bhature.' },
  { name: 'Dal Makhani', price: 110, tags: ['dal', 'curry'], prepTimeMin: 7, category: 'north-indian', image: img('dal-makhani'), description: 'Slow-cooked black lentils in butter and cream.' },
  { name: 'Malai Kofta', price: 130, tags: ['kofta', 'curry'], prepTimeMin: 7, category: 'north-indian', image: img('malai-kofta'), description: 'Soft paneer-potato dumplings in a creamy mild gravy.' },
  { name: 'Aloo Paratha', price: 45, tags: ['paratha', 'breakfast'], prepTimeMin: 4, category: 'north-indian', image: img('aloo-paratha'), description: 'Whole wheat flatbread stuffed with spiced mashed potatoes, served with butter and curd.' },
  { name: 'Rajma Chawal', price: 90, tags: ['rajma', 'rice'], prepTimeMin: 6, category: 'north-indian', image: img('rajma-chawal'), description: 'Comforting kidney beans curry over steamed rice.' },
  { name: 'Kadai Paneer', price: 135, tags: ['paneer', 'spicy'], prepTimeMin: 6, category: 'north-indian', image: img('kadai-paneer'), description: 'Paneer tossed with capsicum and kadai masala.' },

  // Snacks
  { name: 'Samosa', price: 15, tags: ['snack', 'fried'], prepTimeMin: 1, category: 'snacks', image: img('samosa'), description: 'Crispy pastry triangles filled with spiced potato-pea masala.' },
  { name: 'Vada Pav', price: 25, tags: ['snack', 'fast'], prepTimeMin: 2, category: 'snacks', image: img('vada-pav'), description: 'Mumbai-style batata vada sandwiched in a pav with chutneys.' },
  { name: 'French Fries', price: 60, tags: ['snack', 'fried'], prepTimeMin: 4, category: 'snacks', image: img('french-fries'), description: 'Golden crispy fries dusted with salted seasoning.' },
  { name: 'Aloo Tikki', price: 40, tags: ['snack', 'fried'], prepTimeMin: 3, category: 'snacks', image: img('aloo-tikki'), description: 'Crisp potato patties with tangy tamarind chutney.' },
  { name: 'Cheese Sandwich', price: 70, tags: ['snack', 'grilled'], prepTimeMin: 3, category: 'snacks', image: img('cheese-sandwich'), description: 'Grilled toasty sandwich loaded with melted cheese and veggies.' },
  { name: 'Paneer Pakora', price: 65, tags: ['snack', 'fried'], prepTimeMin: 3, category: 'snacks', image: img('paneer-pakora'), description: 'Paneer slices in gram-flour batter, fried golden and served with mint chutney.' },
  { name: 'Dhokla', price: 35, tags: ['snack', 'steamed'], prepTimeMin: 2, category: 'snacks', image: img('dhokla'), description: 'Fluffy steamed Gujarati snack tempered with mustard seeds.' },
  { name: 'Veg Spring Roll', price: 55, tags: ['snack', 'fried'], prepTimeMin: 3, category: 'snacks', image: img('veg-spring-roll'), description: 'Crunchy rolls packed with stir-fried veggies and noodles.' },

  // Beverages
  { name: 'Filter Coffee', price: 20, tags: ['coffee', 'hot'], prepTimeMin: 1, category: 'beverages', image: img('filter-coffee'), description: 'Authentic south Indian filter coffee with frothy milk.' },
  { name: 'Lemon Iced Tea', price: 35, tags: ['tea', 'cold'], prepTimeMin: 1, category: 'beverages', image: img('lemon-iced-tea'), description: 'Chilled black tea with a zesty lemon twist.' },
  { name: 'Masala Chai', price: 15, tags: ['tea', 'hot'], prepTimeMin: 2, category: 'beverages', image: img('masala-chai'), description: 'Ginger-cardamom spiced milk tea brewed fresh.' },
  { name: 'Cold Coffee', price: 70, tags: ['coffee', 'cold'], prepTimeMin: 2, category: 'beverages', image: img('cold-coffee'), description: 'Frothy blended coffee shake topped with cream.' },
  { name: 'Sweet Lassi', price: 45, tags: ['lassi', 'cold'], prepTimeMin: 1, category: 'beverages', image: img('sweet-lassi'), description: 'Refreshing sweetened yogurt drink with a saffron hint.' },
  { name: 'Mango Lassi', price: 60, tags: ['lassi', 'cold'], prepTimeMin: 1, category: 'beverages', image: img('mango-lassi'), description: 'Silky mango yogurt smoothie, thick and tropical.' },
  { name: 'Chocolate Shake', price: 85, tags: ['shake', 'cold'], prepTimeMin: 2, category: 'beverages', image: img('chocolate-shake'), description: 'Rich chocolate milkshake topped with whipped cream.' },
  { name: 'Fresh Orange Juice', price: 55, tags: ['juice', 'cold'], prepTimeMin: 2, category: 'beverages', image: img('orange-juice'), description: 'Squeezed-to-order sweet oranges, no sugar added.' },

  // Chinese
  { name: 'Veg Fried Rice', price: 100, tags: ['rice', 'chinese'], prepTimeMin: 5, category: 'chinese', image: img('veg-fried-rice'), description: 'Wok-tossed rice with crunchy veggies and soy sauce.' },
  { name: 'Hakka Noodles', price: 110, tags: ['noodles', 'chinese'], prepTimeMin: 5, category: 'chinese', image: img('hakka-noodles'), description: 'Stir-fried noodles with a smoky Indo-Chinese kick.' },
  { name: 'Veg Manchurian', price: 120, tags: ['manchurian', 'chinese'], prepTimeMin: 6, category: 'chinese', image: img('veg-manchurian'), description: 'Crispy veggie balls in a glossy garlic-soy gravy.' },
  { name: 'Chilli Paneer', price: 150, tags: ['paneer', 'chinese'], prepTimeMin: 6, category: 'chinese', image: img('chilli-paneer'), description: 'Paneer tossed with peppers in a sweet-spicy chilli sauce.' },
  { name: 'Schezwan Noodles', price: 130, tags: ['noodles', 'chinese'], prepTimeMin: 5, category: 'chinese', image: img('schezwan-noodles'), description: 'Fiery schezwan sauced noodles with vegetables.' },
  { name: 'Chilli Potato', price: 90, tags: ['potato', 'chinese'], prepTimeMin: 4, category: 'chinese', image: img('chilli-potato'), description: 'Crispy potato fingers glazed with spicy chilli sauce.' },
  { name: 'Sweet Corn Soup', price: 80, tags: ['soup', 'chinese'], prepTimeMin: 3, category: 'chinese', image: img('sweet-corn-soup'), description: 'Creamy corn soup with pepper and spring onions.' },
  { name: 'Chilli Garlic Noodles', price: 120, tags: ['noodles', 'chinese'], prepTimeMin: 5, category: 'chinese', image: img('chilli-garlic-noodles'), description: 'Garlicky noodles tossed with a punch of chilli oil.' },
];

const seed = async () => {
  await connectDB();
  await Category.deleteMany({});
  await FoodItem.deleteMany({});

  const categories = await Category.insertMany(categoryData);
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

  const items = itemData.map((i) => ({
    ...i,
    category: bySlug[i.category],
    description: i.description || i.name,
    inStock: true,
    avgRating: Math.round((3 + Math.random() * 2) * 10) / 10,
    ratingCount: Math.floor(Math.random() * 40) + 5,
  }));
  await FoodItem.insertMany(items);

  console.log('Seed complete:', categories.length, 'categories,', items.length, 'food items');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});