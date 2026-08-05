import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function MenuPage() {
  const { user, isFavorite, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [addedId, setAddedId] = useState(null);

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

  const addToCart = async (item) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post('/cart', { foodItemId: item._id, qty: 1 });
      setAddedId(item._id);
      setTimeout(() => setAddedId(null), 1200);
    } catch {
      // ignore out-of-stock / auth errors on the same click
    }
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
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              className={activeCategory === c._id ? 'active' : ''}
              onClick={() => setActiveCategory(c._id)}
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
                {item.description && <p className="menu-desc">{item.description}</p>}
                {item.tags?.length > 0 && (
                  <div className="menu-tags">
                    {item.tags.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                )}
                <div className="menu-meta">
                  {item.ratingCount > 0 && (
                    <span>★ {item.avgRating} ({item.ratingCount})</span>
                  )}
                  <span>{item.prepTimeMin} min</span>
                  <span className={item.inStock ? 'in-stock' : 'out-of-stock'}>
                    {item.inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
                {user && item.inStock && (
                  <button
                    className={`add-to-cart ${addedId === item._id ? 'added' : ''}`}
                    onClick={() => addToCart(item)}
                  >
                    {addedId === item._id ? 'Added ✓' : 'Add to Cart'}
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
