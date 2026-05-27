import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle, Printer, Plus, Ban } from 'lucide-react';
import { Header } from '@/components/pos/Header';
import { ShiftClosePreviewModal } from '@/components/pos/ShiftClosePreviewModal';
import { useShift } from '@/contexts/ShiftContext';
import { usePendingActions } from '@/contexts/PendingActionsContext';
import { useConnectionStatus } from '@/hooks/useApi';
import { useDisplaySession } from '@/hooks/useDisplaySession';
import { useCurrency } from '@/lib/currency';
import { getOrderCompatibilityProvider } from '@/lib/compatibility/order';
import { useTranslation } from '@/lib/i18n';
import { triggerSuccess, triggerImpact } from '@/lib/feedback';

const orderCompatibility = getOrderCompatibilityProvider();

interface LocationState {
  total: number;
  received: number;
  change: number;
  paymentType?: string;
  voided?: boolean;
}

export default function CompletePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const shiftId = searchParams.get('shiftId');
  const completedOrderId = searchParams.get('orderId');

  const { isConnected } = useConnectionStatus();
  const { currentShift, currentStaff, closeShift, isLoading: shiftLoading } = useShift();
  const { refresh: refreshPendingActions } = usePendingActions();
  const { formatPrice } = useCurrency();
  const { updateToIdle } = useDisplaySession();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [orderId, setOrderId] = useState(completedOrderId);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showClosePreview, setShowClosePreview] = useState(false);

  const handleCloseShift = () => {
    setShowClosePreview(true);
  };

  const handleConfirmCloseShift = async () => {
    await refreshPendingActions();
    await closeShift();
    setShowClosePreview(false);
  };

  const [showContent, setShowContent] = useState(false);
  const state = location.state as LocationState | null;

  useEffect(() => {
    // Trigger success feedback (Haptic + Sound)
    // Small delay ensures the page transition is settled and bridge is ready
    const soundTimer = setTimeout(() => {
      console.log('CompletePage: Triggering success feedback via bridge');
      triggerSuccess();
    }, 250); // Increased delay for slower devices

    const animTimer = setTimeout(() => setShowContent(true), 100);
    idleTimerRef.current = setTimeout(() => {
      updateToIdle();
    }, 3000);
    setOrderId(completedOrderId);
    return () => {
      clearTimeout(soundTimer);
      clearTimeout(animTimer);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [completedOrderId, updateToIdle]);

  if (!state) {
    return <Navigate to={`/pos/order?shiftId=${shiftId}`} replace />;
  }

  const { total, received, change, voided } = state;

  const handleNewOrder = () => {
    triggerImpact('light');
    updateToIdle();
    navigate(`/pos/order?shiftId=${shiftId}`);
  };

  const handlePrintReceipt = async () => {
    if (orderId) {
      try {
        triggerImpact('light');
        setIsPrinting(true);
        await orderCompatibility.printReceipt(orderId, 'reprint');
      } catch (error) {
        console.error('Error printing receipt:', error);
      } finally {
        setIsPrinting(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Header
        currentShift={currentShift}
        currentStaff={currentStaff}
        isConnected={isConnected}
        isLoading={shiftLoading}
        onCloseShift={handleCloseShift}
      />

      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div className="text-center max-w-md w-full relative">
          {/* Success Visual Wrapper */}
          <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            {/* Dual Rings Layer */}
            {!voided && showContent && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-success/40 animate-success-ring animation-delay-120" />
                <div className="absolute inset-0 rounded-full border-2 border-success/20 animate-success-ring animation-delay-240" />
              </>
            )}

            {/* Success/Void Icon */}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center z-10 relative shadow-sm ${
              voided ? 'bg-destructive/10' : 'bg-success/10'
            } ${showContent ? 'animate-success-icon animation-delay-80' : 'opacity-0'}`}>
              {voided ? (
                <Ban className="w-14 h-14 text-destructive" />
              ) : (
                <CheckCircle className="w-14 h-14 text-success" />
              )}
            </div>
          </div>

          {/* Heading */}
          <div className={showContent ? 'animate-staged-reveal animation-delay-220' : 'opacity-0'}>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {voided ? t('complete.voided') : t('complete.success')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {voided ? t('complete.voidedDesc') : t('complete.receiptSent')}
            </p>
          </div>

          {/* Transaction Summary Card */}
          <div className={`bg-card rounded-xl border border-border p-6 mb-8 shadow-sm ${
            showContent ? 'animate-staged-reveal animation-delay-320' : 'opacity-0'
          }`}>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('complete.total')}</span>
                <span className={`font-semibold ${voided ? 'line-through text-muted-foreground' : ''}`}>
                  {formatPrice(total)}
                </span>
              </div>
              {!voided && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('complete.cashReceived')}</span>
                    <span className="font-semibold">{formatPrice(received)}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">{t('complete.change')}</span>
                    <span className="font-bold text-success">{formatPrice(change)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions - Fast Reveal */}
          <div className={`space-y-3 ${showContent ? 'animate-staged-reveal animation-delay-320' : 'opacity-0'}`}>
            <button
              onClick={handleNewOrder}
              className="w-full pos-btn py-4 rounded-xl bg-accent text-accent-foreground font-semibold text-lg shadow-md gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('complete.newOrder')}
            </button>

            {!voided && (
              <button
                onClick={handlePrintReceipt}
                className="w-full pos-btn py-3 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2"
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <span className="flex items-center justify-center">
                    <Printer className="w-5 h-5 animate-spin mr-2" /> {t('complete.printing')}...
                  </span>
                ) : (
                  <Printer className="w-5 h-5" />
                )}
                {!isPrinting && t('complete.reprint')}
              </button>
            )}
          </div>
        </div>
      </div>

      <ShiftClosePreviewModal
        open={showClosePreview}
        onClose={() => setShowClosePreview(false)}
        onConfirm={handleConfirmCloseShift}
        shiftId={currentShift?.id || ''}
        staffName={currentStaff?.name || ''}
      />
    </div>
  );
}
