import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

function FavoritesPage() {
  const { user, toggleFavorite } = useAuth();
  const { qty, add, change } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/favorites')
      .then((res) => setItems(res.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  const remove = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    toggleFavorite(id);
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

  if (!user) {
    return (
      <div>
        <h1>My Favorites</h1>
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>💙</span>
          </div>
          <h2 className="empty-state-title">Favorites live behind a login</h2>
          <p className="empty-state-sub">
            Log in to save the dishes you love and find them here in a snap.
          </p>
          <Link to="/login" className="empty-state-cta">
            Login <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <p>Loading favorites…</p>;

  return (
    <div>
      <div className="favorites-hero">
        <h1>
          <span className="favorites-heart">♥</span> My Favorites
        </h1>
        <p>
          {items.length > 0
            ? `${items.length} dish${items.length === 1 ? '' : 'es'} you love, always one tap away.`
            : 'Every dish you love, gathered in one place.'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>🤍</span>
          </div>
          <h2 className="empty-state-title">No favorites yet</h2>
          <p className="empty-state-sub">
            Tap the heart on any dish in the menu and it will show up here, ready to order.
          </p>
          <Link to="/menu" className="empty-state-cta">
            Explore the Menu <span>→</span>
          </Link>
        </div>
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
                    <button
                      className="fav-btn fav-btn-active"
                      onClick={() => remove(item._id)}
                      aria-label="Remove from favorites"
                      title="Remove from favorites"
                    >
                      ♥
                    </button>
                    <span className="menu-price">₹{item.price}</span>
                  </div>
                </div>
                {item.description && <p className="menu-desc">{item.description}</p>}
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

export default FavoritesPage;
