import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarIcon,
  Eye,
  Clock,
  User,
  ShoppingCart,
  Package,
  DollarSign,
  AlertTriangle,
  Loader2,
  CloudUpload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { syncApi } from "@/lib/api";
import { getOrderCompatibilityProvider } from "@/lib/compatibility/order";
import { getStaffCompatibilityProvider } from "@/lib/compatibility/staff";
import { getShiftCompatibilityProvider } from "@/lib/compatibility/shift";
import { useCurrency } from "@/lib/currency";
import { useTranslation } from "@/lib/i18n";
import { useDateTime } from "@/lib/datetime";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import type { Shift, Staff, Order, OrderItem } from "@/types/pos";

const shiftCompatibility = getShiftCompatibilityProvider();
const staffCompatibility = getStaffCompatibilityProvider();
const orderCompatibility = getOrderCompatibilityProvider();

export function OrderHistoryManagement() {
  // State
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getCloudSyncEnabled } = useSettings();
  const {
    formatDate, 
    formatTime, 
    formatTimeRange, 
    formatDateString, 
    formatLongDate,
    getTodayDateString,
    getDateString 
  } = useDateTime();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Open shifts management state
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingOpenShifts, setLoadingOpenShifts] = useState(true);

  // Load staff list and open shifts on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load staff
      const staffResult = await staffCompatibility.getStaff();
      if (staffResult.data) {
        setStaffList(staffResult.data);
      }
      
      // Load all open shifts
      setLoadingOpenShifts(true);
      const openShiftsResult = await shiftCompatibility.getOpenShifts();
      if (openShiftsResult.data) {
        // Sort by started_at descending (most recent first)
        const sorted = openShiftsResult.data.sort(
          (a: Shift, b: Shift) => b.started_at - a.started_at
        );
        setOpenShifts(sorted);
      }
      setLoadingOpenShifts(false);
    };
    loadInitialData();
  }, []);

  // Load shifts when date changes
  useEffect(() => {
    const loadShifts = async () => {
      const dateStr = getDateString(selectedDate);
      const result = await shiftCompatibility.getShiftsByDate(dateStr);
      if (result.data) {
        const sortedShifts = result.data.sort(
          (a: Shift, b: Shift) => b.started_at - a.started_at
        );
        setShifts(sortedShifts);
        // Auto-select the latest shift (first one after sorting)
        if (sortedShifts.length > 0) {
          setSelectedShiftId(sortedShifts[0].id);
        } else {
          setSelectedShiftId(null);
        }
      } else {
        setShifts([]);
        setSelectedShiftId(null);
      }
    };
    loadShifts();
  }, [selectedDate]);

  // Load orders when shift or staff filter changes
  const loadOrders = useCallback(async () => {
    if (!selectedShiftId) {
      setOrders([]);
      return;
    }

    setLoading(true);
    let result;

    if (selectedStaffId) {
      result = await orderCompatibility.getOrdersByShiftAndStaff(
        selectedShiftId,
        selectedStaffId
      );
    } else {
      result = await orderCompatibility.getOrdersByShift(selectedShiftId);
    }

    if (result.data) {
      setOrders(result.data);
    } else {
      setOrders([]);
    }
    setCurrentPage(1);
    setLoading(false);
  }, [selectedShiftId, selectedStaffId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Close orphaned shift handler
  const handleCloseShift = async (shiftId: string) => {
    setClosingShiftId(shiftId);
    const result = await shiftCompatibility.closeShift(shiftId);
    if (!result.error) {
      // Remove from openShifts state
      setOpenShifts(prev => prev.filter(s => s.id !== shiftId));
      
      // Refresh shifts list for current date in case it affects it
      const dateStr = getDateString(selectedDate);
      const shiftsResult = await shiftCompatibility.getShiftsByDate(dateStr);
      if (shiftsResult.data) {
        setShifts(shiftsResult.data.sort((a: Shift, b: Shift) => b.started_at - a.started_at));
      }
    }
    setClosingShiftId(null);
  };

  // Sync orders handler
  const handleSyncOrders = async () => {
    if (!selectedShiftId) return;
    setSyncing(true);
    const { error } = await syncApi.syncOrders(selectedShiftId);
    if (error) {
      toast({ title: t('toast.error'), description: t('admin.orderHistory.syncFailed'), variant: 'destructive' });
    } else {
      toast({ title: t('toast.success'), description: t('admin.orderHistory.syncSuccess') });
    }
    setSyncing(false);
  };


  const getStaffName = (staffId: string): string => {
    const staff = staffList.find((s) => s.id === staffId);
    return staff?.name || t('common.unknown');
  };

  // Format shift time range
  const formatShiftTimeRange = (shift: Shift): string => {
    return formatTimeRange(shift.started_at, shift.ended_at, t('admin.orderHistory.ongoing'));
  };

  // Get order time
  const formatOrderTime = (order: Order): string => {
    if (!order.created_at) return "-";
    return formatTime(order.created_at, true);
  };

  // Status badge variant
  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
            {t('admin.orderHistory.statusCompleted')}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
            {t('admin.orderHistory.statusPending')}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
            {t('admin.orderHistory.statusCancelled')}
          </Badge>
        );
      case "voided":
        return (
          <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30">
            {t('admin.orderHistory.statusVoided')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter staff for dropdown (only show staff who worked shifts on selected date)
  const staffForFilter = useMemo(() => {
    const staffIdsInShifts = new Set(shifts.map((s) => s.staff_id));
    return staffList.filter((s) => staffIdsInShifts.has(s.id));
  }, [shifts, staffList]);

  // Pagination logic
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return orders.slice(start, start + itemsPerPage);
  }, [orders, currentPage, itemsPerPage]);

  // Summary calculations - exclude voided orders from revenue
  const nonVoidedOrders = useMemo(
    () => orders.filter((o) => o.status !== 'voided'),
    [orders]
  );
  const totalItems = useMemo(
    () => nonVoidedOrders.reduce((sum, o) => sum + (o.total_items ?? 0), 0),
    [nonVoidedOrders]
  );
  const totalRevenue = useMemo(
    () => nonVoidedOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0),
    [nonVoidedOrders]
  );

  return (
    <div className="space-y-6 pb-[120px]">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('admin.orderHistory.title')}</h2>
        <p className="text-muted-foreground">
          {t('admin.orderHistory.description')}
        </p>
      </div>

      {/* Open Shifts Section */}
      {loadingOpenShifts ? (
        <Card className="border-2 border-muted">
          <CardContent className="p-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-muted-foreground text-sm">{t('common.loading')}</span>
          </CardContent>
        </Card>
      ) : openShifts.length > 0 && (
        <Card className={cn(
          "border-2",
          openShifts.length > 1 ? "border-warning bg-warning/5" : "border-success/50 bg-success/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              {openShifts.length > 1 ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <Clock className="w-5 h-5 text-success" />
              )}
              <h3 className="font-semibold">
                {openShifts.length > 1 
                  ? t('admin.orderHistory.multipleOpenShifts').replace('{{count}}', openShifts.length.toString())
                  : t('admin.orderHistory.activeShift')}
              </h3>
            </div>
            
            <div className="space-y-2">
              {openShifts.map((shift) => {
                // Use shift.date (backend's authoritative date) for outdated detection
                const today = getTodayDateString();
                const isOld = shift.date !== today;
                
                return (
                  <div 
                    key={shift.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isOld ? "bg-warning/10 border-warning/30" : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatDateString(shift.date)}
                          </span>
                          <span className="text-muted-foreground">
                            {formatTime(shift.started_at)}
                          </span>
                          {isOld && (
                            <Badge variant="destructive" className="text-xs">
                              {t('admin.orderHistory.outdated')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {shift.staff.name || getStaffName(shift.staff_id)}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant={isOld ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleCloseShift(shift.id)}
                      disabled={closingShiftId === shift.id}
                    >
                      {closingShiftId === shift.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t('admin.orderHistory.closeShift')
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            
            {openShifts.length > 1 && (
              <p className="text-sm text-warning mt-3">
                {t('admin.orderHistory.closeOrphanedHint')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters & Summary Row */}
      <div className="flex flex-col gap-6 flex-wrap">
        {/* Filters */}
        <div className="flex gap-4 items-start">
          {/* Date & Shift Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">{t('admin.orderHistory.selectDateShift')}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      formatDate(selectedDate)
                    ) : (
                      <span>{t('admin.orderHistory.pickDate')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Shifts for selected date */}
            {shifts.length > 0 ? (
              <div className="border rounded-lg p-3 bg-card">
                <p className="text-xs text-muted-foreground mb-2">
                  {t('admin.orderHistory.shiftsOn')} {formatLongDate(selectedDate, true)}:
                </p>
                <RadioGroup
                  value={selectedShiftId || ""}
                  onValueChange={setSelectedShiftId}
                  className="space-y-2"
                >
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={shift.id} id={shift.id} />
                      <Label
                        htmlFor={shift.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {formatShiftTimeRange(shift)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({shift.staff_name || getStaffName(shift.staff_id)})
                        </span>
                        {shift.status === "open" && (
                          <Badge variant="secondary" className="text-xs">
                            {t('admin.orderHistory.active')}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {getCloudSyncEnabled() && selectedShiftId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={handleSyncOrders}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    {syncing ? t('admin.orderHistory.syncing') : t('admin.orderHistory.syncOrders')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-3 bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('admin.orderHistory.noShifts')}
                </p>
              </div>
            )}
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">{t('admin.orderHistory.filterByStaff')}</Label>
            <Select
              value={selectedStaffId || "all"}
              onValueChange={(value) =>
                setSelectedStaffId(value === "all" ? null : value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t('admin.orderHistory.allStaff')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.orderHistory.allStaff')}</SelectItem>
                {staffForFilter.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Order Summary Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 h-fit flex-1">
          <CardContent className="p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              {t('admin.orderHistory.orderSummary')}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {orders.length}
                </p>
                <p className="text-xs text-muted-foreground">{t('admin.orderHistory.orders')}</p>
              </div>
              <div className="space-y-1">
                <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {totalItems}
                </p>
                <p className="text-xs text-muted-foreground">{t('admin.orderHistory.items')}</p>
              </div>
              <div className="space-y-1">
                <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">{t('admin.orderHistory.revenue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg bg-card">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('admin.orderHistory.loading')}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {selectedShiftId
              ? t('admin.orderHistory.noOrders')
              : t('admin.orderHistory.selectShift')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.orderHistory.orderId')}</TableHead>
                <TableHead>{t('admin.orderHistory.time')}</TableHead>
                <TableHead className="text-center">{t('admin.orderHistory.items')}</TableHead>
                <TableHead className="text-right">{t('admin.orderHistory.total')}</TableHead>
                <TableHead>{t('admin.orderHistory.staff')}</TableHead>
                <TableHead>{t('admin.orderHistory.type')}</TableHead>
                <TableHead>{t('admin.orderHistory.status')}</TableHead>
                <TableHead className="w-[80px]">{t('admin.menuItems.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id} className={order.status === 'voided' ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-sm">
                    #{order.id?.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell>{formatOrderTime(order)}</TableCell>
                  <TableCell className="text-center">
                    {order.total_items ?? order.items?.length ?? 0}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${order.status === 'voided' ? 'line-through text-muted-foreground' : ''}`}>
                    {formatPrice(order.total_amount ?? 0)}
                  </TableCell>
                  <TableCell>{getStaffName(order.staff_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {order.customer_type || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {t('admin.orderHistory.showing')} {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, orders.length)} {t('admin.orderHistory.of')}{" "}
              {orders.length} {t('admin.orderHistory.orders').toLowerCase()}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 {t('admin.orderHistory.perPage')}</SelectItem>
                <SelectItem value="25">25 {t('admin.orderHistory.perPage')}</SelectItem>
                <SelectItem value="50">50 {t('admin.orderHistory.perPage')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={cn(
                      currentPage === totalPages &&
                        "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('admin.orderHistory.orderDetails')} #{selectedOrder?.id?.slice(-6).toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">{t('admin.orderHistory.time')}:</div>
                <div>{formatOrderTime(selectedOrder)}</div>
                <div className="text-muted-foreground">{t('admin.orderHistory.staff')}:</div>
                <div>{getStaffName(selectedOrder.staff_id)}</div>
                <div className="text-muted-foreground">{t('admin.orderHistory.type')}:</div>
                <div className="capitalize">
                  {selectedOrder.customer_type || "N/A"}
                </div>
                <div className="text-muted-foreground">{t('admin.orderHistory.status')}:</div>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>

              {/* Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">{t('admin.orderHistory.items')}</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map(
                    (item: OrderItem, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.quantity}x</span>{" "}
                          {item.menu_item_name}
                          {item.customizations?.length > 0 && (
                            <div className="text-xs text-muted-foreground ml-4">
                              {item.customizations
                                .map((c) => c.name)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                        <div>{formatPrice(item.unit_price)}</div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4 flex justify-between font-medium">
                <span>{t('admin.orderHistory.total')}</span>
                <span className={selectedOrder.status === 'voided' ? 'line-through text-muted-foreground' : ''}>
                  {formatPrice(selectedOrder.total_amount ?? 0)}
                </span>
              </div>

              {/* Void Details */}
              {selectedOrder.status === 'voided' && (
                <div className="border-t pt-4 space-y-2 bg-orange-500/5 -mx-6 px-6 py-3 rounded-b-lg">
                  <h4 className="font-medium text-orange-700 text-sm">{t('void.voidReason')}</h4>
                  <div className="text-sm">
                    {selectedOrder.void_reason === 'mistake' && t('void.reasonMistake')}
                    {selectedOrder.void_reason === 'staff_consumption' && t('void.reasonStaffConsumption')}
                    {selectedOrder.void_reason === 'other' && t('void.reasonOther')}
                  </div>
                  {selectedOrder.void_note && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{t('void.voidNote')}:</span> {selectedOrder.void_note}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
