import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function CompletedView() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
      <CheckCircle2 className="w-32 h-32 text-green-500 mb-8" />
      <h1 className="text-5xl font-bold text-foreground mb-4">
        {t('display.thankYou')}
      </h1>
      <p className="text-2xl text-muted-foreground">
        {t('display.visitAgain')}
      </p>
    </div>
  );
}
