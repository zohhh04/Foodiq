import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PHRASES = [
  'Live queue tracking in real time.',
  'AI-powered dish recommendations.',
  'Smart tokens. No more waiting crowds.',
  'Order ahead, pick up fresh & fast.',
];

const MARQUEE_ITEMS = [
  'Masala Dosa', 'Idli Sambar', 'Veg Biryani', 'Paneer Butter Masala',
  'Samosa', 'Vada Pav', 'Filter Coffee', 'Lemon Iced Tea',
  'Veg Fried Rice', 'Hakka Noodles',
];

const FEATURES = [
  {
    accent: 'blue',
    title: 'Live Queue Board',
    desc: 'Watch token positions and wait times update in real time over Socket.io.',
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  },
  {
    accent: 'violet',
    title: 'AI Recommendations',
    desc: 'Personalised dish suggestions powered by your order history and favourites.',
    icon: <path d="M12 3l1.9 5.8L19 10l-5.1 1.2L12 17l-1.9-5.8L5 10l5.1-1.2L12 3z" />,
  },
  {
    accent: 'cyan',
    title: 'Smart Tokens',
    desc: 'Digital tokens with AI-predicted wait times — skip the jostle.',
    icon: <><path d="M3 7h18v10H3z" /><path d="M3 10h18" /><path d="M7 10v4M17 10v4" /></>,
  },
  {
    accent: 'fuchsia',
    title: 'Instant Notifications',
    desc: 'Get pinged the moment your order starts cooking — and when it is ready.',
    icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  },
  {
    accent: 'amber',
    title: 'Ratings & Feedback',
    desc: 'Rate your meal and help the canteen get better with every order.',
    icon: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1L12 2z" />,
  },
  {
    accent: 'emerald',
    title: 'Seamless Payments',
    desc: 'Pay by UPI, card or wallet in seconds — no cash, no checkout queues.',
    icon: <><path d="M3 6h18v12H3z" /><path d="M3 10h18" /><path d="M6 15h4" /></>,
  },
];

const STEPS = [
  { n: '01', title: 'Browse & Order', desc: 'Pick your dishes, add them to the cart and check out in seconds.' },
  { n: '02', title: 'Get Your Token', desc: 'AI predicts your wait time and assigns a smart digital token.' },
  { n: '03', title: 'Pick Up Hot', desc: 'Track your position live and grab your food the moment it is ready.' },
];

const TESTIMONIALS = [
  {
    name: 'Aarav Mehta',
    role: 'Student',
    quote:
      'The live queue board is a game changer. I order from my seat and walk in exactly when my token is called.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Faculty',
    quote:
      'AI recommendations are scarily accurate. Foodiq now suggests exactly what I feel like eating.',
    rating: 5,
  },
  {
    name: 'Rohan Iyer',
    role: 'Student',
    quote:
      'No more 15-minute lunch queues. Smart tokens + push alerts mean I never miss my order.',
    rating: 4,
  },
  {
    name: 'Sneha Kulkarni',
    role: 'Staff',
    quote:
      'The queue optimizer tells us exactly what to cook first. Lunch rush has never been this smooth.',
    rating: 5,
  },
];

const FAQS = [
  {
    q: 'Do I need an account to order?',
    a: 'Yes — a quick registration lets you track your orders live, save favourites and get push notifications on your token.',
  },
  {
    q: 'How does the live queue work?',
    a: 'When you place an order, the system issues a smart digital token and predicts your wait. You can watch your position update in real time on the queue board over Socket.io.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'UPI, cards and digital wallets. Payment runs in mock mode for demos — orders are marked paid instantly without a real charge.',
  },
  {
    q: 'How does AI predict my wait time?',
    a: 'A gradient-boosting model trained on order history estimates your wait from queue length, items ordered, quantity and prep times — with a smart heuristic fallback.',
  },
  {
    q: 'Can I rate my order after pickup?',
    a: 'Yes! Completed orders can be rated with stars and a comment. Your feedback also powers better AI recommendations.',
  },
];

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ end, duration = 1600, decimals = 0, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(end * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        obs.disconnect();
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function Typewriter({ phrases }) {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx % phrases.length];
    let delay = deleting ? 40 : 80;
    let next = text;

    if (!deleting) {
      next = current.slice(0, text.length + 1);
      if (next === current) delay = 1500;
    } else {
      next = current.slice(0, text.length - 1);
      if (next === '') {
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setDeleting(false);
        delay = 250;
      }
    }

    const t = setTimeout(() => {
      if (!deleting && next === current) setDeleting(true);
      setText(next);
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, phrases]);

  return (
    <span className="typewriter">
      {text}
      <span className="typewriter-caret" aria-hidden="true" />
    </span>
  );
}

function HomePage() {
  const { user, isFavorite, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [queue, setQueue] = useState([]);
  const [popular, setPopular] = useState([]);
  const [addedId, setAddedId] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth(res.data))
      .catch(() => setHealth(null));
    api
      .get('/queue/status')
      .then((res) => setQueue(res.data.data || []))
      .catch(() => setQueue([]));
    api
      .get('/menu')
      .then((res) => {
        const items = res.data.data || [];
        setPopular([...items].sort((a, b) => b.avgRating - a.avgRating).slice(0, 8));
      })
      .catch(() => setPopular([]));
  }, []);

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
      /* ignore */
    }
  };

  const nextUp = queue[0] || null;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <Reveal>
            <span className="hero-badge">
              <span className="hero-badge-dot" />
              AI-Powered Smart Canteen
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="hero-title">
              <span>Where Intelligence Meets</span>
              <span className="gradient-text">Every Order</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="hero-sub">
              <Typewriter phrases={PHRASES} />
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="hero-cta">
              <Link to="/menu" className="btn btn-primary shine">
                Browse the Menu
              </Link>
              <Link to="/queue" className="btn btn-ghost">
                View Live Queue
              </Link>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">
                  <CountUp end={30} suffix="+" />
                </span>
                <span className="hero-stat-label">Dishes</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">
                  <CountUp end={5000} suffix="+" />
                </span>
                <span className="hero-stat-label">Orders Served</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">
                  <CountUp end={4.8} decimals={1} />
                </span>
                <span className="hero-stat-label">Avg Rating</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">
                  <CountUp end={2} suffix=" min" />
                </span>
                <span className="hero-stat-label">Fast Prep</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="hero-side" aria-hidden="true">
          <Reveal delay={500}>
            <div className="float-cards">
              <div className="float-card float-card-1">
                <span className="float-card-tag">Token</span>
                <span className="float-card-num">#42</span>
                <span className="float-card-sub">Ready for pickup</span>
              </div>
              <div className="float-card float-card-2">
                <span className="float-card-tag">Status</span>
                <span className="float-card-num">Preparing</span>
                <span className="float-card-sub">~3 min to go</span>
              </div>
              <div className="float-card float-card-3">
                <span className="float-card-tag">AI Pick</span>
                <span className="float-card-num">Masala Dosa</span>
                <span className="float-card-sub">★ 4.9 · in your favourites</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <span key={idx} className="marquee-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="home-section">
        <Reveal>
          <div className="live-strip">
            <span className="live-dot" />
            {nextUp ? (
              <>
                <strong>Live queue:</strong>
                <span>
                  <span className="token-pill">#{nextUp.tokenNumber}</span> next up ·{' '}
                  {queue.length} order{queue.length === 1 ? '' : 's'} waiting · ~
                  {nextUp.estimatedWaitMin ?? '—'} min
                </span>
                <Link to="/queue" className="live-strip-link">
                  Open queue board →
                </Link>
              </>
            ) : (
              <>
                <strong>Queue is clear</strong>
                <span>No orders waiting right now — be the first to order.</span>
                <Link to="/menu" className="live-strip-link">
                  Order now →
                </Link>
              </>
            )}
          </div>
        </Reveal>
      </section>

      <section className="home-section">
        <Reveal>
          <h2 className="section-title">
            Everything you need, <span className="gradient-text">in one app</span>
          </h2>
          <p className="section-sub">
            From ordering to live tracking to smart queue optimisation — Foodiq runs your
            entire canteen experience.
          </p>
        </Reveal>

        <div className="features-grid">
          {FEATURES.map((f, idx) => (
            <Reveal key={f.title} delay={idx * 80}>
              <div className={`feature-card accent-${f.accent}`}>
                <div className="feature-icon">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {f.icon}
                  </svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Reveal>
          <h2 className="section-title">
            Popular <span className="gradient-text">right now</span>
          </h2>
          <p className="section-sub">
            The crowd favourites, ranked by rating. Add them to your cart in one tap.
          </p>
        </Reveal>

        <div className="catalog-grid home-dishes">
          {popular.map((item, idx) => (
            <Reveal key={item._id} delay={idx * 70}>
              <div className="menu-card">
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
                          aria-label="Toggle favourite"
                        >
                          {isFavorite(item._id) ? '♥' : '♡'}
                        </button>
                      )}
                      <span className="menu-price">₹{item.price}</span>
                    </div>
                  </div>
                  {item.description && <p className="menu-desc">{item.description}</p>}
                  <div className="menu-meta">
                    <span className="dish-rating">
                      ★ {item.avgRating ?? '—'} ({item.ratingCount ?? 0})
                    </span>
                    <span>{item.prepTimeMin} min</span>
                  </div>
                  <button
                    className={`add-to-cart ${addedId === item._id ? 'added' : ''}`}
                    onClick={() => addToCart(item)}
                    disabled={!item.inStock}
                  >
                    {!item.inStock
                      ? 'Out of stock'
                      : addedId === item._id
                        ? 'Added ✓'
                        : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="section-more">
            <Link to="/menu" className="btn btn-ghost">
              Explore the full menu →
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="ai-band">
        <div className="home-section ai-band-inner">
          <Reveal>
            <h2 className="section-title">
              Powered by <span className="gradient-text">intelligence</span>
            </h2>
            <p className="section-sub">
              Every order makes Foodiq smarter. Here is what the AI is doing behind the scenes.
            </p>
          </Reveal>
          <div className="ai-grid">
            {[
              { value: <CountUp end={120} suffix="ms" />, label: 'Avg wait prediction', icon: '◆' },
              { value: <CountUp end={98} suffix="%" />, label: 'Queue optimisation accuracy', icon: '◈' },
              { value: <CountUp end={5} suffix="k+" />, label: 'Orders analysed', icon: '●' },
              { value: <CountUp end={24} suffix="/7" />, label: 'Learning cycle', icon: '∞' },
            ].map((s, idx) => (
              <Reveal key={s.label} delay={idx * 90}>
                <div className="ai-stat">
                  <span className="ai-stat-icon">{s.icon}</span>
                  <span className="ai-stat-value">{s.value}</span>
                  <span className="ai-stat-label">{s.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <Reveal>
          <h2 className="section-title">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="section-sub">Three simple steps from hungry to full.</p>
        </Reveal>

        <div className="steps">
          {STEPS.map((s, idx) => (
            <Reveal key={s.n} delay={idx * 120}>
              <div className="step">
                <span className="step-num">{s.n}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Reveal>
          <h2 className="section-title">
            Loved by <span className="gradient-text">students & staff</span>
          </h2>
          <p className="section-sub">Real feedback from the canteen crowd.</p>
        </Reveal>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, idx) => (
            <Reveal key={t.name} delay={idx * 90}>
              <div className="testimonial-card">
                <div className="testimonial-stars">
                  {'★'.repeat(t.rating)}
                  <span className="testimonial-stars-off">{'★'.repeat(5 - t.rating)}</span>
                </div>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-author">
                  <span className="testimonial-avatar">{t.name.charAt(0)}</span>
                  <span>
                    <strong>{t.name}</strong>
                    <span className="testimonial-role">{t.role}</span>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Reveal>
          <h2 className="section-title">
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
        </Reveal>

        <div className="faq-list">
          {FAQS.map((f, idx) => (
            <Reveal key={f.q} delay={idx * 60}>
              <div className={`faq-item${openFaq === idx ? ' faq-item-open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span>{f.q}</span>
                  <span className="faq-toggle">{openFaq === idx ? '−' : '+'}</span>
                </button>
                <div className="faq-answer">
                  <p>{f.a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Reveal>
          <div className="cta-banner">
            <h2>Hungry? Skip the queue.</h2>
            <p>Order in a few taps, get a smart token, and track it live.</p>
            <Link to="/menu" className="btn btn-primary shine">
              Start Ordering
            </Link>
          </div>
        </Reveal>
      </section>

      {health?.success && (
        <p className="home-health">
          <span className="home-health-dot" /> Backend online · {health.message}
        </p>
      )}

      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="footer-col footer-brand">
            <span className="footer-logo">Foodiq</span>
            <p>
              AI-driven smart canteen ordering and queue optimisation. Where intelligence
              meets every order.
            </p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/menu">Menu</Link>
            <Link to="/queue">Live Queue</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/favorites">Favorites</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            {user ? (
              <Link to="/profile">My Profile</Link>
            ) : (
              <>
                <Link to="/login">Sign In</Link>
                <Link to="/register">Create Account</Link>
              </>
            )}
            <Link to="/notifications">Notifications</Link>
          </div>
          <div className="footer-col">
            <h4>Reach Us</h4>
            <span>Hello@foodiq.app</span>
            <span>+91 98765 43210</span>
            <span>Canteen, Campus Central</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Foodiq. All rights reserved.</span>
          <span className="footer-made">Made with <span className="footer-heart">♥</span> for hungry minds.</span>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
