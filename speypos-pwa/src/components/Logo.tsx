import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'compact' | 'monomark' | 'text';
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 24, text: 'text-sm', gap: 'gap-2' },
  md: { icon: 32, text: 'text-lg', gap: 'gap-3' },
  lg: { icon: 48, text: 'text-2xl', gap: 'gap-4' },
};

// S-glyph monomark - transaction path design
function Monomark({ size, inverted }: { size: number; inverted?: boolean }) {
  const strokeColor = inverted ? 'hsl(var(--pos-header-foreground))' : 'currentColor';
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M6 10h16c2 0 3 1 3 3v0c0 2-1 3-3 3H10c-2 0-3 1-3 3v0c0 2 1 3 3 3h16"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ variant = 'full', size = 'md', inverted = false, className }: LogoProps) {
  const dimensions = sizeMap[size];

  // Text-only fallback for receipts
  if (variant === 'text') {
    return (
      <span
        className={cn(
          'font-mono font-medium tracking-widest uppercase',
          dimensions.text,
          inverted ? 'text-pos-header-foreground' : 'text-foreground',
          className
        )}
      >
        SPEYPOS
      </span>
    );
  }

  // Monomark only
  if (variant === 'monomark') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Monomark size={dimensions.icon} inverted={inverted} />
      </div>
    );
  }

  // Compact: monomark + "SP"
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center', dimensions.gap, className)}>
        <Monomark size={dimensions.icon} inverted={inverted} />
        <span
          className={cn(
            'font-semibold tracking-tight',
            dimensions.text,
            inverted ? 'text-pos-header-foreground' : 'text-foreground'
          )}
        >
          SP
        </span>
      </div>
    );
  }

  // Full: monomark + "SpeyPOS"
  return (
    <div className={cn('flex items-center', dimensions.gap, className)}>
      <Monomark size={dimensions.icon} inverted={inverted} />
      <span
        className={cn(
          'font-semibold tracking-tight',
          dimensions.text,
          inverted ? 'text-pos-header-foreground' : 'text-foreground'
        )}
      >
        SpeyPOS
      </span>
    </div>
  );
}
