import { Wifi, WifiOff, Clock, User, Settings, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StoreBrand } from '@/components/StoreBrand';
import { useTranslation } from '@/lib/i18n';
import { useDateTime } from '@/lib/datetime';
import { triggerImpact } from '@/lib/feedback';
import type { Shift, Staff } from '@/types/pos';

interface HeaderProps {
  currentShift: Shift | null;
  currentStaff: Staff | null;
  isConnected: boolean;
  isLoading?: boolean;
  onCloseShift?: () => void;
}

export function Header({ currentShift, currentStaff, isConnected, isLoading, onCloseShift }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatTime, formatShortDate } = useDateTime();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-pos-header text-pos-header-foreground flex items-center justify-between px-4 shrink-0">
      {/* Store Brand */}
      <StoreBrand variant="full" size="md" inverted />

      {/* Center: Shift Info */}
      <div className="flex items-center gap-6">
        {isLoading ? (
          <>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-pos-header-foreground/70" />
              <div className="h-4 w-20 bg-pos-header-foreground/20 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pos-header-foreground/20 animate-pulse" />
              <div className="h-4 w-16 bg-pos-header-foreground/20 rounded animate-pulse" />
            </div>
          </>
        ) : currentShift && currentStaff ? (
          <>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-pos-header-foreground/70" />
              <span className="text-sm font-medium">{currentStaff.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`status-dot ${currentShift.status === 'open' ? 'open' : 'closed'}`} />
              <span className="text-sm">
                {currentShift.status === 'open' ? t('header.shiftOpen') : t('header.shiftClosed')}
              </span>
            </div>
            {currentShift.status === 'open' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  triggerImpact('light');
                  onCloseShift?.();
                }}
                className="text-pos-header-foreground/70 hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{t('header.closeShift')}</span>
              </Button>
            )}
          </>
        ) : null}
      </div>

      {/* Right: Time, Settings & Connection Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-pos-header-foreground/80">
          <Clock className="w-4 h-4" />
          <div className="text-right">
            <div className="text-sm font-medium">{formatTime(currentTime)}</div>
            <div className="text-xs opacity-70">{formatShortDate(currentTime)}</div>
          </div>
        </div>
        
        <div className="w-px h-6 bg-pos-header-foreground/20" />

        {/* Settings Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            triggerImpact('light');
            navigate('/admin/login');
          }}
          className="text-pos-header-foreground hover:bg-pos-header-foreground/10"
        >
          <Settings className="w-5 h-5" />
        </Button>
        
        <div className="w-px h-6 bg-pos-header-foreground/20" />
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-success" />
          ) : (
            <WifiOff className="w-5 h-5 text-destructive" />
          )}
          <span className="text-xs">{isConnected ? t('header.online') : t('header.offline')}</span>
        </div>
      </div>
    </header>
  );
}
