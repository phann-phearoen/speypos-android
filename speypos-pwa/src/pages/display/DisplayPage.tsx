import { useDisplayPolling } from '@/hooks/useDisplayPolling';
import { IdleView } from '@/components/display/IdleView';
import { OrderingView } from '@/components/display/OrderingView';
import { PayingView } from '@/components/display/PayingView';
import { CompletedView } from '@/components/display/CompletedView';
import { useTranslation } from '@/lib/i18n';
import { WifiOff } from 'lucide-react';

export default function DisplayPage() {
  const { displayState, isConnected } = useDisplayPolling(500);
  const { t } = useTranslation();

  const renderContent = () => {
    switch (displayState.state) {
      case 'ORDERING':
        return (
          <OrderingView
            items={displayState.items || []}
            total={displayState.total || 0}
          />
        );
      case 'PAYING':
        return (
          <PayingView
            total={displayState.total || 0}
            receivedCash={displayState.received_cash}
            change={displayState.change}
            paymentType={displayState.payment_type}
          />
        );
      case 'COMPLETED':
        return <CompletedView />;
      case 'IDLE':
      default:
        return <IdleView />;
    }
  };

  return (
    <div className="h-screen w-screen bg-background overflow-hidden">
      {renderContent()}

      {/* Connection status indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-full text-sm font-medium animate-pulse">
          <WifiOff className="w-4 h-4" />
          {t('display.connectionLost')}
        </div>
      )}
    </div>
  );
}
