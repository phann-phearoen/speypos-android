import { useState } from 'react';
import { ArrowLeft, Check, Delete, QrCode } from 'lucide-react';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

interface PaymentScreenProps {
  total: number;
  onCancel: () => void;
  onConfirmPayment: (receivedAmount: number, paymentType: 'cash' | 'qr') => void;
}

type PaymentType = 'cash' | 'qr';

export function PaymentScreen({ total, onCancel, onConfirmPayment }: PaymentScreenProps) {
  const [inputValue, setInputValue] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const { format, normalizeInput, toDisplayValue, symbol, getMinorUnit, generateQuickAmounts } = useCurrency();
  const { t } = useTranslation();
  
  const receivedAmountCents = normalizeInput(parseFloat(inputValue) || 0);
  const change = receivedAmountCents - total;
  const canComplete = paymentType === 'qr' || receivedAmountCents >= total;

  const handleNumpadPress = (value: string) => {
    if (value === 'clear') {
      setInputValue('');
    } else if (value === 'backspace') {
      setInputValue(prev => prev.slice(0, -1));
    } else if (value === '.') {
      // Only allow decimal for currencies with minor units
      if (getMinorUnit() > 0 && !inputValue.includes('.')) {
        setInputValue(prev => prev + '.');
      }
    } else {
      // Limit decimal places based on currency
      const parts = inputValue.split('.');
      if (parts[1] && parts[1].length >= getMinorUnit()) return;
      setInputValue(prev => prev + value);
    }
  };

  // Quick amounts - deterministic banknote-based suggestions
  const quickAmounts = generateQuickAmounts(total);

  return (
    <div className="flex-1 flex bg-background">
      {/* Left Panel - Summary */}
      <div className="flex-1 flex flex-col p-8 justify-center items-center">
        <div className="w-full max-w-sm">
          {/* Back Button */}
          <button
            onClick={onCancel}
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
              {format(total)}
            </div>
          </div>

          {/* Cash-only: Quick Amount Buttons */}
          {paymentType === 'cash' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {quickAmounts.map(amount => (
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
                onClick={() => setInputValue(toDisplayValue(total))}
                className="w-full pos-btn py-4 rounded-xl bg-muted text-muted-foreground font-medium mb-4"
              >
                {t('payment.exactAmount')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-96 bg-pos-sidebar border-l border-border flex flex-col p-6">
        {paymentType === 'cash' ? (
          <>
            {/* Cash Received Display */}
            <div className="bg-card rounded-xl p-4 mb-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">{t('payment.cashReceived')}</p>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 text-muted-foreground font-semibold">{symbol}</span>
                <span className="text-3xl font-bold">
                  {inputValue || (getMinorUnit() === 0 ? '0' : '0.00')}
                </span>
              </div>
            </div>

            {/* Change Display */}
            <div className={`rounded-xl p-4 mb-6 ${canComplete ? 'bg-success/10 border border-success/30' : 'bg-muted'}`}>
              <p className="text-sm text-muted-foreground mb-1">{t('payment.change')}</p>
              <div className={`text-2xl font-bold ${canComplete ? 'text-success' : 'text-muted-foreground'}`}>
                {change >= 0 ? format(change) : '--.--'}
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 flex-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(key => (
                <button
                  key={key}
                  onClick={() => handleNumpadPress(key === 'backspace' ? 'backspace' : key)}
                  className="numpad-btn"
                >
                  {key === 'backspace' ? <Delete className="w-6 h-6" /> : key}
                </button>
              ))}
            </div>

            {/* Clear & Confirm */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => handleNumpadPress('clear')}
                className="pos-btn py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold"
              >
                {t('payment.clear')}
              </button>
              <button
                onClick={() => canComplete && onConfirmPayment(receivedAmountCents, 'cash')}
                disabled={!canComplete}
                className={`
                  pos-btn py-4 rounded-xl font-semibold gap-2
                  ${canComplete 
                    ? 'bg-success text-success-foreground shadow-md' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                <Check className="w-5 h-5" />
                {t('payment.confirm')}
              </button>
            </div>
          </>
        ) : (
          /* QR Code Payment UI */
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* QR Code Placeholder */}
            <div className="w-48 h-48 bg-card border-2 border-dashed border-border rounded-2xl flex items-center justify-center mb-6">
              <QrCode className="w-24 h-24 text-muted-foreground" />
            </div>

            <p className="text-lg font-medium text-foreground mb-2">
              {t('payment.scanQr')}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              {t('payment.waitingPayment')}
            </p>

            {/* Confirm Button */}
            <button
              onClick={() => onConfirmPayment(total, 'qr')}
              className="w-full pos-btn py-4 rounded-xl font-semibold gap-2 bg-success text-success-foreground shadow-md"
            >
              <Check className="w-5 h-5" />
              {t('payment.confirm')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
