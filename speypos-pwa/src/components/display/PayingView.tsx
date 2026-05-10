import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency';
import { useSettings } from '@/contexts/SettingsContext';

interface PayingViewProps {
  total: number;
  receivedCash?: number;
  change?: number;
  paymentType?: 'cash' | 'qr';
}

export function PayingView({ total, receivedCash, change, paymentType }: PayingViewProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { getPaymentQrConfig } = useSettings();

  const qrConfig = getPaymentQrConfig();
  const showQrCode = paymentType === 'qr' && qrConfig.enabled && qrConfig.imageUrl;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-4xl font-bold text-foreground mb-12">
        {t('display.payment')}
      </h1>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center p-8 bg-primary/10 rounded-2xl">
          <p className="text-xl text-muted-foreground mb-2">
            {t('display.amountDue')}
          </p>
          <p className="text-6xl font-bold text-primary">
            {formatPrice(total)}
          </p>
        </div>

        {/* QR Code Display - Only when QR payment selected and configured */}
        {showQrCode && (
          <div className="flex flex-col items-center p-6 bg-card rounded-2xl shadow-lg border border-border">
            <img 
              src={qrConfig.imageUrl!} 
              alt={t('display.scanToPay')}
              className="w-64 h-64 object-contain"
            />
            <p className="mt-4 text-lg font-medium text-foreground">
              {t('display.scanToPay')}
            </p>
          </div>
        )}

        {/* Cash payment info - Only when cash payment */}
        {paymentType !== 'qr' && receivedCash !== undefined && receivedCash > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="text-xl text-muted-foreground">
                {t('display.cashReceived')}
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {formatPrice(receivedCash)}
              </span>
            </div>

            {change !== undefined && change > 0 && (
              <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border-2 border-green-500">
                <span className="text-xl text-green-600 dark:text-green-400">
                  {t('display.change')}
                </span>
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatPrice(change)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
