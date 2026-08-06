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
  { n: '03', title: 'Track Live', desc: 'Watch your position in the queue update in real time on the queue board.' },
  { n: '04', title: 'Smart Alerts', desc: 'Get push notifications the moment your order moves to the next stage.' },
  { n: '05', title: 'Pick Up Hot', desc: 'Grab your food the second it is ready — no hovering, no waiting around.' },
  { n: '06', title: 'Rate & Repeat', desc: 'Share your feedback and let AI learn your taste for next time.' },
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
  {
    name: 'Kabir Joshi',
    role: 'Student',
    quote:
      'Push alerts are a lifesaver. I step away, get a ping, and my food is waiting for me.',
    rating: 5,
  },
  {
    name: 'Meera Nair',
    role: 'Faculty',
    quote:
      'Ordering from my desk and picking up without queuing saves me my whole lunch break.',
    rating: 4,
  },
];

const FAQS = [
  {
    q: 'Do I need an account to order?',
    a: 'Yes — a quick one-minute registration lets you track your orders live, save favourite dishes, receive push notifications on your token, and keep a full order history. Your favourites and past orders also help the AI recommend dishes you will actually love.',
  },
  {
    q: 'How does the live queue work?',
    a: 'When you place an order, the system issues a smart digital token and predicts your wait. As your order is prepared, you can watch your position update in real time on the queue board — streamed over Socket.io. Staff mark each token as it moves through preparing, ready and picked, so you always know exactly where you stand.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'UPI, cards and digital wallets. Payment runs in mock mode for demos, so orders are marked paid instantly without a real charge — perfect for testing the full ordering flow end to end.',
  },
  {
    q: 'How does AI predict my wait time?',
    a: 'A gradient-boosting model trained on historical order data estimates your wait from queue length, items ordered, quantity, prep times and current kitchen load. It serves real-time predictions over the queue board and falls back to a smart heuristic when the model is unavailable.',
  },
  {
    q: 'How shall I rate my order?',
    a: 'Once your order is completed, you can rate it with stars and a comment. Your feedback not only helps other customers pick better dishes, it also feeds the AI recommendation engine so your future suggestions keep getting sharper.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'No. Once an order is placed, it cannot be cancelled — the kitchen starts preparing it right away. We recommend double-checking your items before you confirm, and only order what you are sure you will pick up.',
  },
  {
    q: 'Is Foodiq available on mobile?',
    a: 'Absolutely. Foodiq is fully responsive and works beautifully on phones and tablets, with push notifications for order updates so you never miss your token, even away from the canteen.',
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catCounts, setCatCounts] = useState({});
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    api
      .get('/queue/status')
      .then((res) => setQueue(res.data.data || []))
      .catch(() => setQueue([]));
    api
      .get('/categories')
      .then((res) => setCategories(res.data.data || []))
      .catch(() => setCategories([]));
    api
      .get('/menu')
      .then((res) => {
        const items = res.data.data || [];
        const counts = {};
        items.forEach((it) => {
          const id = it.category?._id || it.category;
          if (id) counts[id] = (counts[id] || 0) + 1;
        });
        setCatCounts(counts);
      })
      .catch(() => setCatCounts({}));
  }, []);

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
              {user ? (
                <>
                  <Link to="/menu" className="btn btn-primary shine">
                    Browse the Menu
                  </Link>
                  <Link to="/queue" className="btn btn-ghost">
                    View Live Queue
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary shine">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-ghost">
                    Join Foodiq
                  </Link>
                </>
              )}
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
            Browse by <span className="gradient-text">category</span>
          </h2>
          <p className="section-sub">
            From crispy dosas to sizzling noodles — pick a craving and dig in.
          </p>
        </Reveal>

        <div className="category-grid">
          {categories.map((cat, idx) => (
            <Reveal key={cat._id} delay={idx * 80}>
              <Link
                to={`/menu?category=${cat._id}`}
                className={`category-card category-accent-${(idx % 5) + 1}`}
              >
                <span className="category-card-num" aria-hidden="true">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="category-card-img">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} loading="lazy" />
                  ) : (
                    <span className="menu-card-img-fallback">{cat.name.charAt(0)}</span>
                  )}
                  <span className="category-card-overlay" />
                </div>
                <span className="category-card-badge">
                  {catCounts[cat._id] ?? '—'} dishes
                </span>
                <div className="category-card-body">
                  <h3>{cat.name}</h3>
                  <span className="category-card-cta">
                    Explore
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
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
          <div className="cta-banner">
            <span className="cta-glow" aria-hidden="true" />
            <span className="cta-badge">Zero waiting · Zero crowds</span>
            <h2>
              Hungry? <span className="gradient-text">Skip the queue.</span>
            </h2>
            <p>Order in a few taps, get a smart token, and track it live.</p>
            <ul className="cta-points">
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a9 9 0 0 1 9 9c0 5-4 9-9 9s-9-4-9-9 4-9 9-9z" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Live queue tracking
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.9 5.8L19 10l-5.1 1.2L12 17l-1.9-5.8L5 10l5.1-1.2L12 3z" />
                </svg>
                AI wait prediction
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                Pickup alerts
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18v12H3z" />
                  <path d="M3 10h18" />
                  <path d="M6 15h4" />
                </svg>
                UPI, card &amp; cash
              </li>
            </ul>
            <div className="cta-stats">
              <div className="cta-stat">
                <strong>
                  <CountUp end={2} suffix=" min" />
                </strong>
                <span>Avg prep time</span>
              </div>
              <div className="cta-stat">
                <strong>
                  <CountUp end={40} suffix="+" />
                </strong>
                <span>Fresh dishes</span>
              </div>
              <div className="cta-stat">
                <strong>
                  <CountUp end={4.8} decimals={1} />
                </strong>
                <span>Student rating</span>
              </div>
              <div className="cta-stat">
                <strong>
                  <CountUp end={5000} suffix="+" />
                </strong>
                <span>Orders served</span>
              </div>
            </div>
            <button
              className="btn btn-primary shine cta-order-btn"
              onClick={() => navigate('/register')}
            >
              Start Ordering
            </button>
            <p className="cta-note">No account yet? Registration takes less than a minute.</p>
          </div>
        </Reveal>
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
                <Link to="/login">Login</Link>
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
