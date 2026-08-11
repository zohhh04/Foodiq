import { useState } from 'react';

function ItemThumb({ image, name, className = 'lt-item-thumb' }) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <span className={className}>
        <span className="lt-item-emoji">🍽️</span>
      </span>
    );
  }

  return (
    <span className={className}>
      <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
    </span>
  );
}

export default ItemThumb;
