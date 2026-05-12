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
    // <svg
    //   width={size}
    //   height={size}
    //   viewBox="0 0 32 32"
    //   fill="none"
    //   xmlns="http://www.w3.org/2000/svg"
    //   className="shrink-0"
    // >
    //   <path
    //     d="M6 10h16c2 0 3 1 3 3v0c0 2-1 3-3 3H10c-2 0-3 1-3 3v0c0 2 1 3 3 3h16"
    //     stroke={strokeColor}
    //     strokeWidth="2.5"
    //     strokeLinecap="round"
    //     strokeLinejoin="round"
    //   />
    // </svg>
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 60 53" fill="none">
      <path d="M25 0H20C17.7909 0 16 1.79086 16 4V7C16 9.20914 17.7909 11 20 11H25C27.2091 11 29 9.20914 29 7V4C29 1.79086 27.2091 0 25 0Z" fill={strokeColor}/>
      <path d="M42 0H37C34.7909 0 33 1.79086 33 4V7C33 9.20914 34.7909 11 37 11H42C44.2091 11 46 9.20914 46 7V4C46 1.79086 44.2091 0 42 0Z" fill={strokeColor}/>
      <path d="M56 0H54C51.7909 0 50 1.79086 50 4V7C50 9.20914 51.7909 11 54 11H56C58.2091 11 60 9.20914 60 7V4C60 1.79086 58.2091 0 56 0Z" fill={strokeColor}/>
      <path d="M46 21H10C7.79086 21 6 22.7909 6 25V28C6 30.2091 7.79086 32 10 32H46C48.2091 32 50 30.2091 50 28V25C50 22.7909 48.2091 21 46 21Z" fill={strokeColor}/>
      <path d="M52 42H4C1.79086 42 0 43.7909 0 46V49C0 51.2091 1.79086 53 4 53H52C54.2091 53 56 51.2091 56 49V46C56 43.7909 54.2091 42 52 42Z" fill={strokeColor}/>
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
