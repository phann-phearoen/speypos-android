import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, Clock, Package, HandCoins, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { orderApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency';
import { useDateTime } from '@/lib/datetime';
import type { Order, OrderItem } from '@/types/pos';
import { Badge } from '@/components/ui/badge';

interface ShiftClosePreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  shiftId: string;
  staffName: string;
}

const ORDERS_PER_PAGE = 10;

export function ShiftClosePreviewModal({
  open,
  onClose,
  onConfirm,
  shiftId,
  staffName,
}: ShiftClosePreviewModalProps) {
  const { t } = useTranslation();
  const { format: formatPrice } = useCurrency();
  const { formatTime } = useDateTime();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Fetch orders when modal opens
  useEffect(() => {
    if (open && shiftId) {
      loadOrders();
    }
  }, [open, shiftId]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await orderApi.getOrdersByShift(shiftId);
    if (!error && data) {
      // Sort by created_at descending (newest first)
      const sorted = [...data].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      setOrders(sorted);
    } else {
      setOrders([]);
    }
    setLoading(false);
    setCurrentPage(1);
  };

  const handleConfirm = async () => {
    setClosing(true);
    try {
      await onConfirm();
    } finally {
      setClosing(false);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Calculate summary stats - exclude voided orders from revenue
  const nonVoidedOrders = orders.filter((o) => o.status !== 'voided');
  const totalOrders = orders.length;
  const totalItems = nonVoidedOrders.reduce((sum, o) => sum + (o.total_items || o.items?.length || 0), 0);
  const totalRevenue = nonVoidedOrders.reduce((sum, o) => sum + (o.total_amount || o.total || 0), 0);

  // Pagination
  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('shift.closePreview.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Staff info */}
          <div className="text-sm text-muted-foreground mb-3">
            {t('shift.closePreview.staff')}: <span className="font-medium text-foreground">{staffName}</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t('shift.closePreview.loading')}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
              {t('shift.closePreview.noOrders')}
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4 grid grid-cols-3 gap-4">
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

              {/* Order List */}
              <div className="flex-1 -mx-6 px-6 max-h-[70vh] min-h-[50vh] overflow-y-auto">
                <div className="space-y-2 pb-4">
                  {paginatedOrders.map((order, idx) => {
                    const orderNum = (currentPage - 1) * ORDERS_PER_PAGE + idx + 1;
                    const isExpanded = expandedOrders.has(order.id || '');
                    const orderTotal = order.total_amount || order.total || 0;
                    const itemCount = order.total_items || order.items?.length || 0;

                    return (
                      <div
                        key={order.id}
                        className={`border border-border rounded-lg overflow-hidden ${
                          order.status === 'voided' ? 'opacity-60' : ''
                        }`}
                      >
                        <button
                          onClick={() => order.id && toggleOrderExpand(order.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">
                              #{orderNum}
                            </span>
                            <span className="text-sm">
                              {order.created_at ? formatTime(order.created_at) : '—'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {itemCount} {t('order.items')}
                            </span>
                            {order.status === 'voided' && (
                              <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 text-xs">
                                <Ban className="w-3 h-3 mr-1" />
                                {t('admin.orderHistory.statusVoided')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${order.status === 'voided' ? 'line-through text-muted-foreground' : ''}`}>
                              {formatPrice(orderTotal)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {isExpanded && order.items && (
                          <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                            {order.items.map((item: OrderItem) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <div>
                                  <span>{item.quantity}× {item.menu_item_name}</span>
                                  {item.customizations?.length > 0 && (
                                    <div className="text-xs text-muted-foreground ml-4">
                                      {item.customizations.map((c) => c.name).join(', ')}
                                    </div>
                                  )}
                                </div>
                                <span className="text-muted-foreground">
                                  {formatPrice(item.unit_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t('common.prev') || '‹ Prev'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('common.next') || 'Next ›'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={closing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={closing || loading}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {closing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('shift.closePreview.closing')}
              </>
            ) : (
              t('shift.closePreview.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
