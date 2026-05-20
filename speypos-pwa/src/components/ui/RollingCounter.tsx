import React, { useEffect, useState, useRef } from 'react';

interface RollingCounterProps {
  value: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * A component that animates numeric changes with a vertical rolling effect for each digit.
 */
export function RollingCounter({ value, decimals = 0, className = '', prefix = '', suffix = '' }: RollingCounterProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    // Format value with fixed decimals
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    setDigits(Array.from(formatted));
    prevValueRef.current = value;
  }, [value, decimals]);

  return (
    <div className={`flex flex-row-reverse items-baseline justify-start ${className}`}>
      {suffix && <span className="ml-0.5">{suffix}</span>}
      {[...digits].reverse().map((digit, idx) => (
        <DigitLane key={idx} char={digit} />
      ))}
      {prefix && <span className="mr-0.5">{prefix}</span>}
    </div>
  );
}

function DigitLane({ char }: { char: string }) {
  const isNumber = /[0-9]/.test(char);

  if (!isNumber) {
    return <span className="px-0.5">{char}</span>;
  }

  const num = parseInt(char, 10);

  return (
    <span className="odometer-digit-container">
      <span
        className="odometer-digit-lane"
        style={{ transform: `translateY(-${num * 1.1}em)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <span key={n} className="odometer-digit">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}
