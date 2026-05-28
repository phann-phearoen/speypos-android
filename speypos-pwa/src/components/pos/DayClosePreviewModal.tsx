import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, Clock, Package, CalendarDays, Users, HandCoins, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getShiftCompatibilityProvider } from '@/lib/compatibility/shift';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency';
import { useDateTime, formatDateString } from '@/lib/datetime';
import type { DayClosePreviewResponse, Order } from '@/types/pos';
import { Badge } from '@/components/ui/badge';

interface DayClosePreviewModalProps {
  open: boolean;
  targetDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ORDERS_PER_PAGE = 10;
const shiftCompatibility = getShiftCompatibilityProvider();

export function DayClosePreviewModal({
  open,
  targetDate,
  onClose,
  onSuccess,
}: DayClosePreviewModalProps) {
  const { t } = useTranslation();
  const { format: formatPrice } = useCurrency();
  const { formatTime } = useDateTime();
  const [preview, setPreview] = useState<DayClosePreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set());
  const [shiftPages, setShiftPages] = useState<Record<string, number>>({});

  // Fetch preview when modal opens
  useEffect(() => {
    if (open) {
      loadPreview();
    }
  }, [open]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await shiftCompatibility.getCloseDayPreview(targetDate);
    if (apiError) {
      setError(apiError);
      setPreview(null);
    } else if (data) {
      setPreview(data);
      // Expand all shifts by default
      const allShiftIds = new Set<string>(data.shifts?.map((s: { id: string }) => s.id) || []);
      setExpandedShifts(allShiftIds);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setClosing(true);
    setError(null);
    const { error: apiError } = await shiftCompatibility.closeDay(targetDate);
    if (apiError) {
      setError(apiError);
      setClosing(false);
    } else {
      setClosing(false);
      onSuccess();
    }
  };

  const toggleShiftExpand = (shiftId: string) => {
    setExpandedShifts((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const getShiftPage = (shiftId: string) => shiftPages[shiftId] || 1;
  const setShiftPage = (shiftId: string, page: number) => {
    setShiftPages((prev) => ({ ...prev, [shiftId]: page }));
  };

  // Calculate summary stats - exclude voided orders from revenue
  const shifts = preview?.shifts || [];
  const totalShifts = shifts.length;
  const totalOrders = shifts.reduce((sum, s) => sum + (s.orders?.length || 0), 0);
  const nonVoidedShiftOrders = (s: typeof shifts[0]) => (s.orders || []).filter(o => o.status !== 'voided');
  const totalItems = shifts.reduce(
    (sum, s) => sum + (nonVoidedShiftOrders(s).reduce((oSum, o) => oSum + (o.total_items || o.items?.length || 0), 0)),
    0
  );
  const totalRevenue = shifts.reduce(
    (sum, s) => sum + (nonVoidedShiftOrders(s).reduce((oSum, o) => oSum + (o.total_amount || o.total || 0), 0)),
    0
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('shift.dayClose.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t('shift.dayClose.loading')}</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-12 text-destructive">
              {error}
            </div>
          ) : !preview || shifts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
              {t('shift.dayClose.noShifts')}
            </div>
          ) : (
            <>
              {/* Business Date */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('shift.dayClose.businessDate')}:</span>
                <span className="font-medium">{formatDateString(preview.businessDate)}</span>
              </div>

              {/* Summary Stats */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4 grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-semibold">{totalShifts}</div>
                    <div className="text-xs text-muted-foreground">{t('shift.dayClose.shifts')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-semibold">{totalOrders}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.orderHistory.orders')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-semibold">{totalItems}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.orderHistory.items')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HandCoins className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-semibold">{formatPrice(totalRevenue)}</div>
                    <div className="text-xs text-muted-foreground">{t('admin.orderHistory.revenue')}</div>
                  </div>
                </div>
              </div>

              {/* Shifts List */}
              <div className="flex-1 -mx-6 px-6 min-h-[50h] max-h-[70vh] overflow-y-auto">
                <div className="space-y-3 pb-4">
                  {shifts.map((shift, shiftIdx) => {
                    const isExpanded = expandedShifts.has(shift.id);
                    const shiftOrders = shift.orders || [];
                    const shiftNonVoided = shiftOrders.filter(o => o.status !== 'voided');
                    const shiftTotal = shiftNonVoided.reduce((sum, o) => sum + (o.total_amount || o.total || 0), 0);
                    const shiftOrderCount = shiftOrders.length;
                    const staffName = shift.staff?.name || t('common.unknown');

                    // Pagination for this shift
                    const currentPage = getShiftPage(shift.id);
                    const totalPages = Math.ceil(shiftOrders.length / ORDERS_PER_PAGE);
                    const paginatedOrders = shiftOrders.slice(
                      (currentPage - 1) * ORDERS_PER_PAGE,
                      currentPage * ORDERS_PER_PAGE
                    );

                    return (
                      <Collapsible
                        key={shift.id}
                        open={isExpanded}
                        onOpenChange={() => toggleShiftExpand(shift.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                {t('shift.dayClose.shiftNum').replace('{{num}}', String(shiftIdx + 1))}
                              </span>
                              <span className="font-medium">{staffName}</span>
                              <span className="text-sm text-muted-foreground">
                                ({shiftOrderCount} {t('admin.orderHistory.orders')})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatPrice(shiftTotal)}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-2 ml-4 space-y-2">
                            {paginatedOrders.length === 0 ? (
                              <div className="text-sm text-muted-foreground py-2">
                                {t('shift.closePreview.noOrders')}
                              </div>
                            ) : (
                              paginatedOrders.map((order, orderIdx) => {
                                const orderNum = (currentPage - 1) * ORDERS_PER_PAGE + orderIdx + 1;
                                const orderTotal = order.total_amount || order.total || 0;
                                const itemCount = order.total_items || order.items?.length || 0;
                                const isVoided = order.status === 'voided';

                                return (
                                  <div
                                    key={order.id}
                                    className={`flex items-center justify-between p-2 bg-muted/30 rounded text-sm ${isVoided ? 'opacity-60' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-muted-foreground">#{orderNum}</span>
                                      <span>{order.created_at ? formatTime(order.created_at) : '—'}</span>
                                      <span className="text-muted-foreground">
                                        {itemCount} {t('order.items')}
                                      </span>
                                      {isVoided && (
                                        <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 text-xs">
                                          <Ban className="w-3 h-3 mr-1" />
                                          {t('admin.orderHistory.statusVoided')}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className={`font-medium ${isVoided ? 'line-through text-muted-foreground' : ''}`}>
                                      {formatPrice(orderTotal)}
                                    </span>
                                  </div>
                                );
                              })
                            )}

                            {/* Pagination for shift orders */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-center gap-2 pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShiftPage(shift.id, Math.max(1, currentPage - 1));
                                  }}
                                  disabled={currentPage === 1}
                                >
                                  ‹
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  {currentPage} / {totalPages}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShiftPage(shift.id, Math.min(totalPages, currentPage + 1));
                                  }}
                                  disabled={currentPage === totalPages}
                                >
                                  ›
                                </Button>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={closing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={closing || loading || !preview || shifts.length === 0}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {closing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('shift.dayClose.closing')}
              </>
            ) : (
              t('shift.dayClose.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
