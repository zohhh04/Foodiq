import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

function MenuPage() {
  const { user, isFavorite, toggleFavorite } = useAuth();
  const { qty, add, change } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (search.trim()) params.set('search', search.trim());

    api
      .get(`/menu?${params.toString()}`)
      .then((res) => setItems(res.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  const selectCategory = (id) => {
    setActiveCategory(id);
    if (id === 'all') setSearchParams({});
    else setSearchParams({ category: id });
  };

  const handleAdd = async (item) => {
    if (!user) {
      navigate('/login');
      return;
    }
    await add(item._id);
  };

  const handleChange = async (item, delta) => {
    if (!user) {
      navigate('/login');
      return;
    }
    await change(item._id, delta);
  };

  return (
    <div>
      <h1>Menu</h1>

      <div className="catalog-toolbar">
        <input
          type="search"
          placeholder="Search dishes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="catalog-search"
        />
        <div className="category-tabs">
          <button
            className={activeCategory === 'all' ? 'active' : ''}
            onClick={() => selectCategory('all')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              className={activeCategory === c._id ? 'active' : ''}
              onClick={() => selectCategory(c._id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p>Loading menu…</p>
      ) : items.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <div className="catalog-grid">
          {items.map((item) => (
            <div key={item._id} className="menu-card">
              <div className="menu-card-img">
                {item.image ? (
                  <img src={item.image} alt={item.name} loading="lazy" />
                ) : (
                  <span className="menu-card-img-fallback">{item.name.charAt(0)}</span>
                )}
              </div>
              <div className="menu-card-body">
                <div className="menu-card-top">
                  <h3>{item.name}</h3>
                  <div className="menu-card-actions">
                    {user && (
                      <button
                        className={`fav-btn${isFavorite(item._id) ? ' fav-btn-active' : ''}`}
                        onClick={() => toggleFavorite(item._id)}
                        aria-label={isFavorite(item._id) ? 'Remove from favorites' : 'Add to favorites'}
                        title={isFavorite(item._id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite(item._id) ? '♥' : '♡'}
                      </button>
                    )}
                    <span className="menu-price">₹{item.price}</span>
                  </div>
                </div>
                <p className="menu-desc">{item.description || 'Freshly prepared, always delicious.'}</p>
                <div className="menu-tags">
                  {item.tags?.length > 0 &&
                    item.tags.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                </div>
                <div className="menu-meta">
                  <span className={item.ratingCount > 0 ? 'menu-rating' : 'menu-rating menu-rating-new'}>
                    {item.ratingCount > 0
                      ? `★ ${item.avgRating} (${item.ratingCount})`
                      : '★ New'}
                  </span>
                  <span>{item.prepTimeMin} min</span>
                  <span className={item.inStock ? 'in-stock' : 'out-of-stock'}>
                    {item.inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
                {qty(item._id) > 0 ? (
                  <div className="qty-stepper">
                    <button
                      className="qty-btn"
                      onClick={() => handleChange(item, -1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="qty-value">
                      {qty(item._id)}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() => handleChange(item, 1)}
                      disabled={!item.inStock}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="add-to-cart"
                    onClick={() => handleAdd(item)}
                    disabled={!item.inStock}
                  >
                    {!item.inStock ? 'Out of stock' : 'Add to Cart'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuPage;
