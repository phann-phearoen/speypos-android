import { StoreBrand } from '@/components/StoreBrand';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/i18n';

export function IdleView() {
  const { t } = useTranslation();
  const { getBrandName } = useSettings();

  return (
    <div className="flex flex-col items-center justify-center h-full animate-pulse">
      <StoreBrand variant="full" size="lg" className="mb-8" />
      <h1 className="text-5xl font-bold text-foreground mb-4">
        {t('display.welcomeTo').replace('{{brand}}', getBrandName())}
      </h1>
      <p className="text-2xl text-muted-foreground">
        {t('display.readyToServe')}
      </p>
    </div>
  );
}
