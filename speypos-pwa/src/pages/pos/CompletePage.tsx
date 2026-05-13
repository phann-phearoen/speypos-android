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
    const animTimer = setTimeout(() => setShowContent(true), 100);
    idleTimerRef.current = setTimeout(() => {
      updateToIdle();
    }, 3000);
    setOrderId(completedOrderId);
    return () => {
      clearTimeout(animTimer);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [updateToIdle]);

  if (!state) {
    return <Navigate to={`/pos/order?shiftId=${shiftId}`} replace />;
  }

  const { total, received, change, voided } = state;

  const handleNewOrder = () => {
    updateToIdle();
    navigate(`/pos/order?shiftId=${shiftId}`);
  };

  const handlePrintReceipt = async () => {
    if (orderId) {
      try {
        setIsPrinting(true);
        await orderCompatibility.printReceipt(orderId, 'reprint');
      } catch (error) {
        console.log('Error printing receipt:', error);
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

      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className={`
          text-center max-w-md transition-all duration-500
          ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        >
          {/* Icon */}
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            voided ? 'bg-destructive/10' : 'bg-success/10'
          }`}>
            {voided ? (
              <Ban className="w-14 h-14 text-destructive" />
            ) : (
              <CheckCircle className="w-14 h-14 text-success" />
            )}
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {voided ? t('complete.voided') : t('complete.success')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {voided ? t('complete.voidedDesc') : t('complete.receiptSent')}
          </p>

          {/* Transaction Summary */}
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
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

          {/* Actions */}
          <div className="space-y-3">
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
