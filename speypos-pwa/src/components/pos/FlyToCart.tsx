import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Particle {
  id: number;
  start: Point;
  end: Point;
}

interface FlyToCartContextType {
  triggerFly: (start: Point) => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | undefined>(undefined);

export const useFlyToCart = () => {
  const context = useContext(FlyToCartContext);
  if (!context) {
    throw new Error('useFlyToCart must be used within a FlyToCartProvider');
  }
  return context;
};

export const FlyToCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const triggerFly = useCallback((start: Point) => {
    // Find the target element (Order Panel Header)
    const target = document.getElementById('order-panel-target');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const end = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const id = nextId.current++;
    const newParticle = { id, start, end };

    setParticles(prev => [...prev, newParticle]);

    // Remove particle after animation duration
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 600);
  }, []);

  return (
    <FlyToCartContext.Provider value={{ triggerFly }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {particles.map(particle => (
          <FlyingParticle key={particle.id} start={particle.start} end={particle.end} />
        ))}
      </div>
    </FlyToCartContext.Provider>
  );
};

const FlyingParticle: React.FC<{ start: Point; end: Point }> = ({ start, end }) => {
  // We use CSS variables to pass coordinates to the animation
  const style = {
    '--start-x': `${start.x}px`,
    '--start-y': `${start.y}px`,
    '--end-x': `${end.x}px`,
    '--end-y': `${end.y}px`,
  } as React.CSSProperties;

  return (
    <div
      className="absolute w-4 h-4 bg-accent rounded-full shadow-lg shadow-accent/40 animate-fly-to-cart"
      style={style}
    />
  );
};
