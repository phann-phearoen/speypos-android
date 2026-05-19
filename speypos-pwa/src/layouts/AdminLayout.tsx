import { useEffect, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { LogOut, Users, Coffee, FolderTree, ArrowLeft, Settings2, ClipboardList, Cog, Store, Layers, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingActions } from '@/contexts/PendingActionsContext';
import { useSetup } from '@/contexts/SetupContext';
import { NavLink } from '@/components/NavLink';
import { useTranslation } from '@/lib/i18n';
import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';
import { healthApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const systemCompatibility = getSystemCompatibilityProvider();

export default function AdminLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isAdmin, staff, logout } = useAuth();
  const { status: pendingStatus, refresh: refreshPendingActions } = usePendingActions();
  const { t } = useTranslation();
  const { setIsRebooting, needsRestart, setNeedsRestart } = useSetup();

  const healthState = pendingStatus?.healthState || 'healthy';
  const isRecovering = healthState === 'recovering';
  const isDegraded = healthState === 'degraded';

  let statusLabel = 'Healthy';
  let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  let statusReason = '';

  if (isRecovering) {
    statusLabel = 'Recovering';
    statusVariant = 'default';
    statusReason = 'Startup/manual recovery job is in progress.';
  } else if (isDegraded) {
    statusLabel = 'Degraded';
    statusVariant = 'destructive';
    statusReason = (pendingStatus?.degradedReasons || []).join(', ') || 'Pending recovery actions detected.';
  }

  const tabs = [
    { id: 'staff', label: t('admin.tab.staff'), icon: <Users className="w-5 h-5" /> },
    { id: 'menu-items', label: t('admin.tab.menuItems'), icon: <Coffee className="w-5 h-5" /> },
    { id: 'categories', label: t('admin.tab.categories'), icon: <FolderTree className="w-5 h-5" /> },
    { id: 'customizations', label: t('admin.tab.customizations'), icon: <Settings2 className="w-5 h-5" /> },
    { id: 'toppings', label: t('admin.tab.toppings'), icon: <Layers className="w-5 h-5" /> },
    { id: 'order-history', label: t('admin.tab.orderHistory'), icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'store', label: t('admin.tab.store'), icon: <Store className="w-5 h-5" /> },
    { id: 'settings', label: t('admin.tab.settings'), icon: <Cog className="w-5 h-5" /> },
  ];

  // Protect route
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      return;
    }

    refreshPendingActions();
    const timer = setInterval(() => {
      refreshPendingActions();
    }, 15000);

    return () => clearInterval(timer);
  }, [isAuthenticated, isAdmin, refreshPendingActions]);

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleReboot = useCallback(async () => {
    setIsRebooting(true);
    try {
      await systemCompatibility.reboot();
    } catch (err) {
      // Expected during shutdown
    }

    const poll = async () => {
      try {
        const response = await healthApi.check();
        if (response.data) {
          setNeedsRestart(false);
          setIsRebooting(false);
          window.location.reload();
          return;
        }
      } catch {}
      setTimeout(poll, 500);
    };
    setTimeout(poll, 500);
  }, [setIsRebooting, setNeedsRestart]);

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-pos-header text-pos-header-foreground flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/pos/shift')}
            className="text-pos-header-foreground hover:bg-pos-header-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Logo variant="compact" size="md" inverted />
          <span className="text-pos-header-foreground/70 text-sm">|</span>
          <span className="font-semibold text-lg tracking-tight text-pos-header-foreground">{t('admin.dashboard')}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            {statusReason ? (
              <span className="text-xs text-pos-header-foreground/70 max-w-[320px] truncate" title={statusReason}>
                {statusReason}
              </span>
            ) : null}
          </div>
          <span className="text-sm text-pos-header-foreground/80">
            {t('admin.welcome')} <span className="font-medium">{staff?.name}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-pos-header-foreground hover:bg-pos-header-foreground/10 gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('admin.logout')}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-56 bg-card border-r border-border shrink-0 flex flex-col">
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={`/admin/${tab.id}`}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors text-foreground hover:bg-muted"
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </NavLink>
            ))}
          </nav>

          {needsRestart && (
            <div className="p-3 m-3 bg-warning/10 border border-warning/20 rounded-xl space-y-2 shrink-0">
              <div className="flex items-center gap-2 text-warning text-[10px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3" />
                {t('admin.settings.rebootRequired')}
              </div>
              <Button
                onClick={handleReboot}
                size="sm"
                className="w-full bg-warning text-warning-foreground hover:bg-warning/90 gap-2 text-xs h-8"
              >
                <RefreshCw className="w-3 h-3" />
                {t('admin.settings.reload')}
              </Button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
