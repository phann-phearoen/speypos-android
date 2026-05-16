import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, Delete, Ban } from 'lucide-react';
import { Header } from '@/components/pos/Header';
import { ShiftClosePreviewModal } from '@/components/pos/ShiftClosePreviewModal';
import { useShift } from '@/contexts/ShiftContext';
import { usePendingActions } from '@/contexts/PendingActionsContext';
import { useConnectionStatus } from '@/hooks/useApi';
import { useDisplaySession } from '@/hooks/useDisplaySession';
import { toast } from '@/hooks/use-toast';
import { getOrderCompatibilityProvider } from '@/lib/compatibility/order';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { OrderItem } from '@/types/pos';

interface LocationState {
  orderItems: OrderItem[];
  orderTotal: number;
  customerType: 'dine-in' | 'take-away';
}

type PaymentType = 'cash' | 'qr';
type VoidReason = 'mistake' | 'staff_consumption' | 'other';

const orderCompatibility = getOrderCompatibilityProvider();

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const shiftId = searchParams.get('shiftId');

  const { isConnected } = useConnectionStatus();
  const { currentShift, currentStaff, closeShift, isLoading: shiftLoading } = useShift();
  const { refresh: refreshPendingActions } = usePendingActions();
  const { format, normalizeInput, toDisplayValue, symbol, getMinorUnit, generateQuickAmounts } = useCurrency();
  const { t } = useTranslation();
  const { updateToPaying, updateToCompleted } = useDisplaySession();
  const [showClosePreview, setShowClosePreview] = useState(false);

  const handleCloseShift = () => {
    setShowClosePreview(true);
  };

  const handleConfirmCloseShift = async () => {
    await refreshPendingActions();
    await closeShift();
    setShowClosePreview(false);
  };

  // Get order data from router state
  const state = location.state as LocationState | null;

  const [inputValue, setInputValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');

  // Void order state
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState<VoidReason>('mistake');
  const [voidNote, setVoidNote] = useState('');
  const [voiding, setVoiding] = useState(false);

  // If no order data in state, redirect back to order page
  if (!state || !state.orderItems || state.orderItems.length === 0) {
    return <Navigate to={`/pos/order?shiftId=${shiftId}`} replace />;
  }

  const { orderItems, orderTotal, customerType } = state;

  const receivedAmountCents = normalizeInput(parseFloat(inputValue) || 0);

  // Assume exact amount if input is empty for cash
  const effectiveReceivedAmount = (inputValue === '' && paymentType === 'cash')
    ? orderTotal
    : receivedAmountCents;

  const change = effectiveReceivedAmount - orderTotal;
  const canComplete = paymentType === 'qr' || effectiveReceivedAmount >= orderTotal;

  // Sync payment state to customer display (debounced)
  const displayUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial update to PAYING state on mount
  useEffect(() => {
    updateToPaying(orderTotal, undefined, undefined, paymentType);
  }, [orderTotal, updateToPaying, paymentType]);

  // Update display when cash input changes (debounced)
  useEffect(() => {
    if (paymentType !== 'cash') return;
    if (displayUpdateTimerRef.current) {
      clearTimeout(displayUpdateTimerRef.current);
    }
    displayUpdateTimerRef.current = setTimeout(() => {
      updateToPaying(
        orderTotal,
        effectiveReceivedAmount > 0 ? effectiveReceivedAmount : undefined,
        change >= 0 ? change : undefined,
        paymentType
      );
    }, 200);
    return () => {
      if (displayUpdateTimerRef.current) {
        clearTimeout(displayUpdateTimerRef.current);
      }
    };
  }, [receivedAmountCents, change, paymentType, orderTotal, updateToPaying]);

  const handleNumpadPress = (value: string) => {
    if (value === 'clear') {
      setInputValue('');
    } else if (value === 'backspace') {
      setInputValue((prev) => prev.slice(0, -1));
    } else if (value === '.') {
      if (getMinorUnit() > 0 && !inputValue.includes('.')) {
        setInputValue((prev) => prev + '.');
      }
    } else {
      const parts = inputValue.split('.');
      if (parts[1] && parts[1].length >= getMinorUnit()) return;
      setInputValue((prev) => prev + value);
    }
  };

  const buildOrderPayload = () => ({
    shift_id: currentShift?.id,
    staff_id: currentStaff?.id,
    customer_type: customerType,
    items: orderItems.map((item) => ({
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customizations: item.customizations.map((c) => ({
        name: c.group,
        value: c.name,
        price: c.price,
      })),
      toppings: (item.toppings || [])
        .filter((t) => t.quantity > 0)
        .map((t) => ({
          topping_option_id: t.topping_option_id,
          name: t.name,
          unit_label: t.unit_label,
          unit_price: t.unit_price,
          quantity: t.quantity,
          total_price: t.total_price,
        })),
    })),
  });

  const handleConfirmPayment = async () => {
    if (paymentType === 'cash' && !canComplete) return;
    setProcessing(true);

    try {
      const createResult = await orderCompatibility.createOrder(buildOrderPayload());

      if (createResult.data?.id) {
        const paymentPayload = paymentType === 'cash'
          ? {
              payment_type: 'cash',
              amount: orderTotal,
              received_cash: effectiveReceivedAmount,
              change: change,
            }
          : {
              payment_type: 'qr',
              amount: orderTotal,
            };

        const payResult = await orderCompatibility.payOrder(createResult.data.id, paymentPayload);
        if (payResult.error || !payResult.data) {
          toast({
            title: 'Payment Failed',
            description: payResult.error || 'Unable to complete payment. Please try again.',
          });
          return;
        }

        const printResult = await orderCompatibility.printReceipt(createResult.data.id, 'initial');
        if (printResult.error) {
          toast({
            title: 'Print Pending',
            description: 'Payment succeeded, but receipt printing failed. You can reprint from Complete.',
          });
        }
      } else {
        toast({
          title: 'Offline Mode',
          description: 'Order saved locally. Will sync when connected.',
        });
      }

      await updateToCompleted();

      navigate(`/pos/complete?shiftId=${shiftId}&orderId=${createResult.data.id}`, {
        state: {
          total: orderTotal,
          received: paymentType === 'cash' ? effectiveReceivedAmount : orderTotal,
          change: paymentType === 'cash' ? change : 0,
          paymentType,
        },
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleVoidOrder = async () => {
    setVoiding(true);

    const createResult = await orderCompatibility.createOrder(buildOrderPayload());

    if (createResult.data?.id) {
      await orderCompatibility.voidOrder(createResult.data.id, {
        void_reason: voidReason,
        void_note: voidNote || undefined,
        voided_by: currentStaff?.id || '',
      });
    }

    toast({
      title: t('void.success'),
      description: t('void.successDesc'),
    });

    setVoiding(false);
    setVoidDialogOpen(false);

    navigate(`/pos/complete?shiftId=${shiftId}&orderId=${createResult.data?.id}`, {
      state: {
        total: orderTotal,
        received: 0,
        change: 0,
        voided: true,
      },
    });
  };

  const handleCancel = () => {
    navigate(`/pos/order?shiftId=${shiftId}`, {
      state: { orderItems, orderTotal, customerType },
    });
  };

  const quickAmounts = generateQuickAmounts(orderTotal);

  return (
    <div className="h-full flex flex-col bg-background">
      <Header
        currentShift={currentShift}
        currentStaff={currentStaff}
        isConnected={isConnected}
        isLoading={shiftLoading}
        onCloseShift={handleCloseShift}
      />

      <div className="flex-1 flex">
        {/* Left Panel - Summary */}
        <div className="flex-1 flex flex-col p-8 justify-start items-center">
          <div className="w-full max-w-sm flex flex-col h-full">
            {/* Back Button */}
            <button
              onClick={handleCancel}
              className="pos-btn gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('payment.backToOrder')}
            </button>

            {/* Payment Type Tabs */}
            <div className="flex bg-muted rounded-lg p-1 mb-8">
              <button
                onClick={() => setPaymentType('cash')}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  paymentType === 'cash'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('payment.cash')}
              </button>
              <button
                onClick={() => setPaymentType('qr')}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  paymentType === 'qr'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('payment.qrCode')}
              </button>
            </div>

            {/* Total Display */}
            <div className="text-center mb-8">
              <p className="text-muted-foreground mb-2">{t('payment.amountDue')}</p>
              <div className="text-5xl font-bold text-foreground">
                {format(orderTotal)}
              </div>
            </div>

            {/* Cash-only: Quick Amount Buttons */}
            {paymentType === 'cash' && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setInputValue(toDisplayValue(amount))}
                      className="pos-btn py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-lg"
                    >
                      {format(amount)}
                    </button>
                  ))}
                </div>

                {/* Exact Amount Button */}
                <button
                  onClick={() => setInputValue(toDisplayValue(orderTotal))}
                  className="w-full pos-btn py-4 rounded-xl bg-muted text-muted-foreground font-medium mb-4"
                >
                  {t('payment.exactAmount')}
                </button>
              </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Void Order Button - at bottom of left panel */}
            <button
              onClick={() => setVoidDialogOpen(true)}
              className="w-full pos-btn py-3 rounded-xl border-2 border-destructive/30 text-destructive hover:bg-destructive/10 font-medium gap-2 mt-4"
            >
              <Ban className="w-4 h-4" />
              {t('void.title')}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-96 bg-pos-sidebar border-l border-border flex flex-col p-6">
          {/* Dynamic Content Area */}
          <div className="flex-1 flex flex-col">
            {paymentType === 'cash' ? (
              <>
                {/* Cash Received Display */}
                <div className="bg-card rounded-xl p-4 mb-4 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">{t('payment.cashReceived')}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 text-muted-foreground font-semibold">{symbol}</span>
                    <span className="text-3xl font-bold">{inputValue || (getMinorUnit() === 0 ? '0' : '0.00')}</span>
                  </div>
                </div>

                {/* Change Display */}
                <div
                  className={`rounded-xl p-4 mb-6 ${
                    canComplete ? 'bg-success/10 border border-success/30' : 'bg-muted'
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-1">{t('payment.change')}</p>
                  <div
                    className={`text-2xl font-bold ${
                      canComplete ? 'text-success' : 'text-muted-foreground'
                    }`}
                  >
                    {change >= 0 ? format(change) : '--.--'}
                  </div>
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(
                    (key) => (
                      <button
                        key={key}
                        onClick={() => handleNumpadPress(key === 'backspace' ? 'backspace' : key)}
                        className="numpad-btn"
                      >
                        {key === 'backspace' ? <Delete className="w-6 h-6" /> : key}
                      </button>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground mb-2">
                    {t('payment.qrCode')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('payment.waitingPayment')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
            <button
              onClick={() => handleNumpadPress('clear')}
              disabled={paymentType !== 'cash'}
              className={`pos-btn py-4 rounded-xl font-semibold ${
                paymentType === 'cash'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              {t('payment.clear')}
            </button>

            <button
              onClick={handleConfirmPayment}
              disabled={!canComplete || processing}
              className={`pos-btn py-4 rounded-xl font-semibold gap-2 ${
                canComplete && !processing
                  ? 'bg-success text-success-foreground shadow-md'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {t('payment.confirm')}
            </button>
          </div>
        </div>
      </div>

      {/* Void Order Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              {t('void.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Void Reason */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('void.reason')}</Label>
              <RadioGroup
                value={voidReason}
                onValueChange={(v) => setVoidReason(v as VoidReason)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mistake" id="void-mistake" />
                  <Label htmlFor="void-mistake" className="cursor-pointer">{t('void.reasonMistake')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="staff_consumption" id="void-staff" />
                  <Label htmlFor="void-staff" className="cursor-pointer">{t('void.reasonStaffConsumption')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="void-other" />
                  <Label htmlFor="void-other" className="cursor-pointer">{t('void.reasonOther')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Void Note */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('void.note')}</Label>
              <Textarea
                value={voidNote}
                onChange={(e) => setVoidNote(e.target.value)}
                placeholder={t('void.notePlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)} disabled={voiding}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidOrder}
              disabled={voiding}
              className="gap-2"
            >
              {voiding && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {t('void.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
