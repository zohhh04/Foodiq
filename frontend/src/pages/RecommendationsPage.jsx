import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

function DishCard({ item, rank, badge, badgeClass }) {
  const { user, isFavorite, toggleFavorite } = useAuth();
  const { qty, add, change } = useCart();
  const navigate = useNavigate();

  const handleAdd = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    await add(item._id);
  };

  const handleChange = async (delta) => {
    if (!user) {
      navigate('/login');
      return;
    }
    await change(item._id, delta);
  };

  return (
    <div className="menu-card rec-card">
      <div className="menu-card-img">
        {item.image ? (
          <img src={item.image} alt={item.name} loading="lazy" />
        ) : (
          <span className="menu-card-img-fallback">{item.name.charAt(0)}</span>
        )}
        {rank != null && (
          <span className="rec-badge rec-badge-rank">#{rank}</span>
        )}
        {badge && (
          <span className={`rec-badge${badgeClass ? ` ${badgeClass}` : ''}`}>{badge}</span>
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
            item.tags.slice(0, 3).map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
        </div>
        <div className="menu-meta">
          <span className={item.ratingCount > 0 ? 'menu-rating' : 'menu-rating menu-rating-new'}>
            {item.ratingCount > 0
              ? `★ ${item.avgRating} (${item.ratingCount})`
              : '★ New'}
          </span>
          <span>⏱ {item.prepTimeMin} min</span>
          <span className={item.inStock ? 'in-stock' : 'out-of-stock'}>
            {item.inStock ? 'In stock' : 'Out of stock'}
          </span>
        </div>
        {qty(item._id) > 0 ? (
          <div className="qty-stepper">
            <button className="qty-btn" onClick={() => handleChange(-1)} aria-label="Decrease quantity">−</button>
            <span className="qty-value">{qty(item._id)}</span>
            <button className="qty-btn" onClick={() => handleChange(1)} disabled={!item.inStock} aria-label="Increase quantity">+</button>
          </div>
        ) : (
          <button className="add-to-cart" onClick={handleAdd} disabled={!item.inStock}>
            {!item.inStock ? 'Out of stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, sub, children, tone }) {
  return (
    <section className="rec-section">
      <div className="rec-section-head">
        <div className="rec-section-icon" aria-hidden="true">{icon}</div>
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        <span className={`rec-section-glow${tone ? ` rec-section-glow-${tone}` : ''}`} aria-hidden="true" />
      </div>
      {children}
    </section>
  );
}

function Grid({ items, renderCard, empty }) {
  if (!items || items.length === 0) {
    return <p className="rec-empty">{empty || 'Nothing here yet — check back soon!'}</p>;
  }
  return <div className="catalog-grid rec-grid">{items.map(renderCard)}</div>;
}

function RecommendationsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [mood, setMood] = useState('happy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/menu/insights?mood=${mood}`)
      .then((res) => {
        setData(res.data.data);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load recommendations.');
      })
      .finally(() => setLoading(false));
  }, [mood, reload]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!user) {
    return (
      <div>
        <div className="orders-hero">
          <div className="orders-hero-icon">🤖</div>
          <div className="orders-hero-main">
            <div className="orders-hero-title-row">
              <h1>AI Recommendations</h1>
              <span className="demand-live-badge">
                <span className="live-dot" /> AI
              </span>
            </div>
            <p className="live-hint">Dishes picked just for you, based on your mood.</p>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon"><span>🤖</span></div>
          <h2 className="empty-state-title">AI picks live behind a login</h2>
          <p className="empty-state-sub">
            Log in so we can learn your taste and serve you the perfect pick.
          </p>
          <Link to="/login" className="empty-state-cta">
            Login <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !data) return <p>Loading recommendations…</p>;

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><span>🤖</span></div>
        <h2 className="empty-state-title">Could not load recommendations</h2>
        <p className="empty-state-sub">{error || 'Please try again in a moment.'}</p>
        <button className="empty-state-cta" onClick={() => setReload((r) => r + 1)}>
          Retry <span>→</span>
        </button>
      </div>
    );
  }

  const { moods, mood: activeMood, moodItems, bestSelling, mostFavorited, topRated, personalized, personalizedNote, summary } = data;

  return (
    <div className="rec-page">
      <div className="orders-hero">
        <div className="orders-hero-icon">🤖</div>
        <div className="orders-hero-main">
          <div className="orders-hero-title-row">
            <h1>AI Picks</h1>
            <span className="demand-live-badge">
              <span className="live-dot" /> AI
            </span>
          </div>
          <p className="live-hint">
            {greeting()}, {user?.name?.split(' ')[0] || 'friend'} — what are you craving?
          </p>
        </div>
        <div className="orders-stats">
          <div className="orders-stat">
            <strong>{summary.totalDishes}</strong>
            <span>Dishes</span>
          </div>
          <div className="orders-stat">
            <strong>₹{summary.avgPrice}</strong>
            <span>Avg price</span>
          </div>
          <div className="orders-stat orders-stat-rated">
            <strong>★ {summary.avgRating}</strong>
            <span>Rating</span>
          </div>
          <div className="orders-stat">
            <strong>{summary.totalSold}</strong>
            <span>Sold</span>
          </div>
        </div>
      </div>

      <div className="rec-moods">
        <div className="rec-moods-label">How are you feeling?</div>
        <div className="rec-moods-scroll">
          {moods.map((m) => (
            <button
              key={m.key}
              className={`rec-mood-chip${activeMood.key === m.key ? ' is-active' : ''}`}
              onClick={() => setMood(m.key)}
              aria-pressed={activeMood.key === m.key}
            >
              <span className="rec-mood-emoji">{m.emoji}</span>
              <span className="rec-mood-text">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rec-loading" style={{ opacity: loading ? 1 : 0 }} aria-hidden={!loading}>
        <span className="rec-spinner" />
        <span>Curating your picks…</span>
      </div>

      <Section
        icon={activeMood.emoji}
        title={`Made for your mood: ${activeMood.label}`}
        sub={activeMood.blurb}
        tone="mood"
      >
        <Grid
          items={moodItems}
          empty="No exact mood matches — here are the crowd favourites instead."
          renderCard={(item, i) => (
            <DishCard key={item._id} item={item} badge={`${activeMood.emoji} Mood pick`} badgeClass="rec-badge-mood" />
          )}
        />
      </Section>

      {bestSelling.length > 0 && (
        <Section
          icon="🔥"
          title="Most selling right now"
          sub="Ranked by real orders — the dishes students can't stop ordering."
          tone="hot"
        >
          <Grid
            items={bestSelling}
            renderCard={(item) => (
              <DishCard
                key={item._id}
                item={item}
                rank={item.rank}
                badge={`🔥 ${item.sold} sold`}
                badgeClass="rec-badge-sold"
              />
            )}
          />
        </Section>
      )}

      {mostFavorited.length > 0 && (
        <Section
          icon="💖"
          title="People's favourites"
          sub="The dishes most saved by students — a crowd-approved shortlist."
          tone="fav"
        >
          <Grid
            items={mostFavorited}
            renderCard={(item) => (
              <DishCard
                key={item._id}
                item={item}
                badge={`♥ ${item.favoritedBy} ${item.favoritedBy === 1 ? 'favourite' : 'favourites'}`}
                badgeClass="rec-badge-fav"
              />
            )}
          />
        </Section>
      )}

      {topRated.length > 0 && (
        <Section
          icon="⭐"
          title="Top rated by students"
          sub="The highest-rated dishes on the menu, straight from real feedback."
          tone="rate"
        >
          <Grid
            items={topRated}
            renderCard={(item) => (
              <DishCard
                key={item._id}
                item={item}
                badge={`★ ${item.avgRating}`}
                badgeClass="rec-badge-rate"
              />
            )}
          />
        </Section>
      )}

      <Section
        icon="✨"
        title="Picked for you"
        sub={personalizedNote}
        tone="ai"
      >
        <Grid
          items={personalized}
          renderCard={(item, i) => (
            <DishCard key={item._id} item={item} rank={i + 1} badge="AI pick" badgeClass="rec-badge-ai" />
          )}
        />
      </Section>
    </div>
  );
}

export default RecommendationsPage;
