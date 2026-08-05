import { useState } from 'react';

// Interactive (when onChange is provided) or read-only star rating (1-5).
function RatingStars({ value = 0, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === 'function';
  const shown = interactive && hover ? hover : value;

  return (
    <div
      className={`rating-stars rating-stars-${size}`}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={`Rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-checked={interactive ? value === star : undefined}
          role={interactive ? 'radio' : undefined}
          className={`rating-star${star <= shown ? ' rating-star-on' : ''}`}
          onClick={() => interactive && onChange(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
        >
          ★
        </button>
      ))}
      {interactive && <span className="rating-value">{hover || value}/5</span>}
    </div>
  );
}

export default RatingStars;
