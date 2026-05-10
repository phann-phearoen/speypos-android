import { CheckCircle, Printer, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

interface CompleteScreenProps {
  total: number;
  receivedAmount: number;
  change: number;
  onNewOrder: () => void;
  onPrintReceipt?: () => void;
}

export function CompleteScreen({
  total,
  receivedAmount,
  change,
  onNewOrder,
  onPrintReceipt,
}: CompleteScreenProps) {
  const [showContent, setShowContent] = useState(false);
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center bg-background p-8">
      <div className={`
        text-center max-w-md transition-all duration-500
        ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-success" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('complete.success')}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t('complete.receiptSent')}
        </p>

        {/* Transaction Summary */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('complete.total')}</span>
              <span className="font-semibold">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('complete.cashReceived')}</span>
              <span className="font-semibold">{formatPrice(receivedAmount)}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">{t('complete.change')}</span>
              <span className="font-bold text-success">{formatPrice(change)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onNewOrder}
            className="w-full pos-btn py-4 rounded-xl bg-accent text-accent-foreground font-semibold text-lg shadow-md gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('complete.newOrder')}
          </button>
          
          {onPrintReceipt && (
            <button
              onClick={onPrintReceipt}
              className="w-full pos-btn py-3 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2"
            >
              <Printer className="w-5 h-5" />
              {t('complete.reprint')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
