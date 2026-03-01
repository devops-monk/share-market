import { useRef, useEffect, useState } from 'react';

interface PriceFlashProps {
  price: number;
  previousPrice?: number;
  className?: string;
}

export default function PriceFlash({ price, previousPrice, className = '' }: PriceFlashProps) {
  const [flashKey, setFlashKey] = useState(0);
  const prevRef = useRef(price);

  const direction = previousPrice !== undefined && previousPrice !== price
    ? price > previousPrice ? 'up' : 'down'
    : null;

  useEffect(() => {
    if (price !== prevRef.current) {
      setFlashKey(k => k + 1);
      prevRef.current = price;
    }
  }, [price]);

  const flashClass = direction === 'up' ? 'price-flash-up' : direction === 'down' ? 'price-flash-down' : '';

  return (
    <span
      key={flashKey}
      className={`${flashClass} ${className} rounded px-0.5`}
    >
      ${price.toFixed(2)}
    </span>
  );
}
