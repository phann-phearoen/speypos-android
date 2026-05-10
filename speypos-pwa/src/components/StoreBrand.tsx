import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { Logo } from '@/components/Logo';

interface StoreBrandProps {
  variant?: 'full' | 'compact' | 'logo-only' | 'text-only';
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { logo: 'h-6', text: 'text-sm', gap: 'gap-2', initial: 'w-6 h-6 text-xs' },
  md: { logo: 'h-8', text: 'text-lg', gap: 'gap-3', initial: 'w-8 h-8 text-sm' },
  lg: { logo: 'h-12', text: 'text-2xl', gap: 'gap-4', initial: 'w-12 h-12 text-lg' },
};

/**
 * StoreBrand component - displays store branding with fallback to SpeyPOS
 * 
 * Hierarchy:
 * 1. Store's logo_url (image) - if available
 * 2. Store's brand_name (text) - if available
 * 3. SpeyPOS branding (default fallback)
 */
export function StoreBrand({ variant = 'full', size = 'md', inverted = false, className }: StoreBrandProps) {
  const { getBrandName, getBrandLogo, hasCustomBranding } = useSettings();
  
  const logoUrl = getBrandLogo();
  const brandName = getBrandName();
  const dimensions = sizeMap[size];
  
  // If no custom branding, fall back to SpeyPOS Logo
  if (!hasCustomBranding()) {
    // Map our variants to Logo variants
    const logoVariant = variant === 'logo-only' ? 'monomark' : 
                        variant === 'text-only' ? 'text' : 
                        variant;
    return <Logo variant={logoVariant as 'full' | 'compact' | 'monomark' | 'text'} size={size} inverted={inverted} className={className} />;
  }

  const textColor = inverted ? 'text-pos-header-foreground' : 'text-foreground';
  
  // Text-only variant
  if (variant === 'text-only') {
    return (
      <span
        className={cn(
          'font-semibold tracking-tight',
          dimensions.text,
          textColor,
          className
        )}
      >
        {brandName}
      </span>
    );
  }

  // Logo element - either image or initial letter
  const LogoElement = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={brandName}
          className={cn(dimensions.logo, 'object-contain shrink-0')}
        />
      );
    }
    
    // Fallback to initial letter if brand_name exists but no logo
    return (
      <div
        className={cn(
          'rounded-lg flex items-center justify-center shrink-0 font-bold',
          dimensions.initial,
          inverted ? 'bg-pos-header-foreground/20 text-pos-header-foreground' : 'bg-primary/10 text-primary'
        )}
      >
        {brandName.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Logo-only variant
  if (variant === 'logo-only') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <LogoElement />
      </div>
    );
  }

  // Compact variant: logo + abbreviated name (first word or 2-3 chars)
  if (variant === 'compact') {
    const shortName = brandName.split(' ')[0].slice(0, 8);
    return (
      <div className={cn('flex items-center', dimensions.gap, className)}>
        <LogoElement />
        <span
          className={cn(
            'font-semibold tracking-tight',
            dimensions.text,
            textColor
          )}
        >
          {shortName}
        </span>
      </div>
    );
  }

  // Full variant: logo + full brand name
  return (
    <div className={cn('flex items-center', dimensions.gap, className)}>
      <LogoElement />
      <span
        className={cn(
          'font-semibold tracking-tight',
          dimensions.text,
          textColor
        )}
      >
        {brandName}
      </span>
    </div>
  );
}
