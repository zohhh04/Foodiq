import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const SUGGESTIONS = [
  'How do I order?',
  'How do I pay?',
  'Track my order',
  'Where do I collect my order?',
];

const ADMIN_SUGGESTIONS = [
  'How do I manage orders?',
  'How do I mark an order ready?',
  'How do I view demand analysis?',
  'How do I update stock?',
];

const SLOT_OPTIONS = [
  { value: 'asap', label: 'Quick pickup (ASAP)' },
  { value: '30', label: 'Within 30 min' },
  { value: '60', label: 'Within 1 hour' },
  { value: '90', label: 'Within 1.5 hours' },
];

const isQuestion = (q) => /^(how|what|where|when|why|which)\b/i.test(q.trim());

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSupported = 'speechSynthesis' in window;
const recSupported = !!SpeechRec;

function AiAssistant() {
  const { user } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(true);
  const listRef = useRef(null);
  const recRef = useRef(null);
  const speakRef = useRef(speak);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing, open]);

  // Cancel any in-flight speech when the panel closes or unmounts.
  useEffect(() => {
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
      recRef.current?.stop?.();
    };
  }, []);

  const toggleSpeak = () => {
    setSpeak((v) => {
      const next = !v;
      if (!next && speechSupported) window.speechSynthesis.cancel();
      return next;
    });
  };

  const say = (text) => {
    if (!speechSupported || !speakRef.current || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[₹#]+/g, ' rupees '));
    u.rate = 1.02;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  };

  const stopListening = () => {
    recRef.current?.stop?.();
    setListening(false);
  };

  const startListening = () => {
    if (!recSupported) return;
    stopListening();
    // Stop any speech the AI is currently saying so the mic can hear the user.
    if (speechSupported) window.speechSynthesis.cancel();
    try {
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 3;
      rec.onresult = (e) => {
        let text = '';
        let best = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const alt = res[0]?.transcript ?? '';
          if (res.isFinal) {
            if (alt.length > best.length) best = alt;
          } else if (text.length < alt.length) {
            text = alt;
          }
        }
        const final = best || text;
        setInput(final);
        if (best) {
          setListening(false);
          send(best);
        }
      };
      rec.onerror = (e) => {
        if (e.error === 'no-speech') {
          setInput((prev) => prev || '');
          setListening(false);
        } else if (e.error !== 'aborted') {
          setListening(false);
        }
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((prev) => [...prev, { id, role: 'user', text: q }]);
    setInput('');
    setTyping(true);

    try {
      if (!isQuestion(q)) {
        const { data } = await api.post('/ai/order', { text: q });
        if (data.data?.recognized) {
          const orderMsg = { id: `${id}-r`, role: 'bot', kind: 'order', ...data.data };
          setMessages((prev) => [...prev, orderMsg]);
          const slotMsg = {
            id: `${id}-slot`,
            role: 'bot',
            kind: 'slot',
            text: 'When would you like to pick up your order?',
          };
          setMessages((prev) => [...prev, slotMsg]);
          say('Got it. When would you like to pick up your order?');
          return;
        }
      }
      const { data } = await api.post('/ai/ask', { question: q });
      const reply = data.data;
      const msg = { id: `${id}-r`, role: 'bot', text: reply.answer, suggestions: reply.suggestions || [] };
      setMessages((prev) => [...prev, msg]);
      say(reply.answer);
    } catch {
      const msg = {
        id: `${id}-r`,
        role: 'bot',
        text: 'Sorry, I could not reach the assistant right now. Please try again.',
      };
      setMessages((prev) => [...prev, msg]);
      say('Sorry, I could not reach the assistant right now.');
    } finally {
      setTyping(false);
    }
  };

  const addOrderToCart = async (msg) => {
    try {
      for (const it of msg.items) {
        await api.post('/cart', { foodItemId: it.foodItem, qty: it.qty });
      }
      refreshCart();
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, added: true } : m)));
      say('Added to cart. Total is ' + msg.subtotal + ' rupees. Click view cart to pay.');
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, added: false, error: 'Could not add to cart. Please try again.' } : m
        )
      );
    }
  };

  const goToCart = (slot) => {
    setOpen(false);
    navigate('/cart', slot ? { state: { pickupSlot: slot.value, pickupSlotLabel: slot.label } } : undefined);
  };

  const renderMessage = (m) => {
    if (m.role !== 'bot') return <p>{m.text}</p>;

    if (m.kind === 'slot') {
      return (
        <div className="ai-order-slot">
          <p>{m.text}</p>
          <div className="ai-chips">
            {SLOT_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => goToCart(s)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (m.kind !== 'order') return <p>{m.text}</p>;

    return (
      <div className="ai-order">
        <p className="ai-order-title">Got it — here's your order:</p>
        <ul className="ai-order-items">
          {m.items.map((it) => (
            <li key={String(it.foodItem)}>
              <span className="ai-order-qty">{it.qty}×</span>
              <span className="ai-order-name">{it.name}</span>
              <strong>₹{(it.price * it.qty).toFixed(2)}</strong>
            </li>
          ))}
        </ul>
        {m.outOfStock?.length > 0 && (
          <p className="ai-order-note">
            Out of stock: {m.outOfStock.map((i) => `${i.name} (${i.qty})`).join(', ')}
          </p>
        )}
        {m.unmatched?.length > 0 && <p className="ai-order-note">Couldn't find: {m.unmatched.join(', ')}</p>}
        <div className="ai-order-total">
          <span>Total</span>
          <strong>₹{m.subtotal.toFixed(2)}</strong>
        </div>
        {m.added ? (
          <button className="ai-order-add" onClick={() => goToCart()}>
            View Cart & Checkout <span>→</span>
          </button>
        ) : (
          <button
            className="ai-order-add"
            onClick={() => addOrderToCart(m)}
            disabled={m.items.length === 0}
          >
            Add to cart & Pay
          </button>
        )}
        {m.error && <p className="ai-order-note">{m.error}</p>}
      </div>
    );
  };

  const togglePanel = () => {
    if (open) {
      stopListening();
      if (speechSupported) window.speechSynthesis.cancel();
    }
    setOpen((v) => !v);
  };

  if (!user) return null;

  return (
    <>
      <button className="ai-fab" onClick={togglePanel} aria-label={open ? 'Close Foodiq AI' : 'Ask Foodiq AI'}>
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-head">
            <span className="ai-head-avatar" aria-hidden="true">🤖</span>
            <div className="ai-head-text">
              <strong>Foodiq AI</strong>
              <span>Ask questions, order by voice</span>
            </div>
            {speechSupported && (
              <button
                className={`ai-speak-toggle${speak ? ' is-on' : ''}`}
                onClick={toggleSpeak}
                aria-label={speak ? 'Mute voice replies' : 'Enable voice replies'}
                title={speak ? 'Voice replies on' : 'Voice replies off'}
              >
                {speak ? '🔊' : '🔇'}
              </button>
            )}
          </div>

          <div className="ai-list" ref={listRef}>
            {messages.length === 0 && (
              <div className="ai-greet">
                <p>
                  {user?.role === 'admin'
                    ? 'Hi! I am your canteen ops assistant — ask me how to manage orders, mark items ready, view demand, update stock or run the kitchen efficiently.'
                    : 'Hi! Ask me anything about ordering, payments, your queue token, live tracking, refunds and more — or just say what you want, like "two samosas".'}{' '}
                  {recSupported && 'Tap the mic 🎙️ to talk instead of typing.'}
                </p>
                <div className="ai-chips">
                  {(user?.role === 'admin' ? ADMIN_SUGGESTIONS : SUGGESTIONS).map((s) => (
                    <button key={s} onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`ai-msg ${m.role}`}>
                {renderMessage(m)}
                {m.role === 'bot' && m.kind !== 'order' && m.suggestions?.length > 0 && (
                  <div className="ai-chips">
                    {m.suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="ai-msg bot">
                <p className="ai-typing">…</p>
              </div>
            )}
          </div>

          <form
            className="ai-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or order…"
              aria-label="Ask Foodiq AI"
            />
            {recSupported && (
              <button
                type="button"
                className={`ai-mic${listening ? ' is-listening' : ''}`}
                onClick={listening ? stopListening : startListening}
                aria-label={listening ? 'Stop listening' : 'Speak your order or question'}
                title={listening ? 'Listening… tap to stop' : 'Voice input'}
              >
                {listening ? '⬤' : '🎙️'}
              </button>
            )}
            <button type="submit" disabled={!input.trim() || typing} aria-label="Send">
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default AiAssistant;
