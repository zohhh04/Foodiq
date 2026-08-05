import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function FavoritesPage() {
  const { user, toggleFavorite } = useAuth();
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

  if (!user) {
    return (
      <div>
        <h1>My Favorites</h1>
        <p>
          <Link to="/login">Sign in</Link> to save your favorite dishes.
        </p>
      </div>
    );
  }

  if (loading) return <p>Loading favorites…</p>;

  return (
    <div>
      <h1>My Favorites</h1>
      {items.length === 0 ? (
        <p>
          No favorites yet. Tap the heart on a dish in the{' '}
          <Link to="/menu">menu</Link> to save it here.
        </p>
      ) : (
        <div className="catalog-grid">
          {items.map((item) => (
            <div key={item._id} className="menu-card">
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
                  {item.ratingCount > 0 && (
                    <span>★ {item.avgRating} ({item.ratingCount})</span>
                  )}
                  <span>{item.prepTimeMin} min</span>
                  <span className={item.inStock ? 'in-stock' : 'out-of-stock'}>
                    {item.inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;
