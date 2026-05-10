// Core POS Types

export interface MenuCategory {
  id: string;
  name: string;
  image_url?: string;
  sort_order?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category_ids?: string[];
}

// Legacy customization type (kept for order items)
export interface Customization {
  id: string;
  name: string;
  price: number;
  group?: string;
}

// New customization option group (from DB)
export interface CustomizationOptionGroup {
  id: string;
  name: string;
  selection_type: 'single' | 'multiple';
  required: boolean;
  sort_order: number;
  default_option_id?: string;
  created_at?: number;
  updated_at?: number;
}

// New customization option (from DB)
export interface CustomizationOption {
  id: string;
  customization_group_id: string;
  label: string;
  price_delta: number; // in cents
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

// Menu item to customization group mapping
export interface MenuItemCustomizationGroup {
  id: string;
  menu_item_id: string;
  customization_group_id: string;
}

// Topping Group (e.g., "Add-ons", "Extra Syrup")
export interface ToppingGroup {
  id: string;
  name: string;
  required: boolean;
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

// Topping Option (e.g., "Extra Shot" at $0.50/qty)
export interface ToppingOption {
  id: string;
  topping_group_id: string;
  label: string;
  unit_label: string;
  unit_price: number;
  min_quantity: number;
  max_quantity: number | null;
  step_quantity: number;
  sort_order: number;
  created_at?: number;
  updated_at?: number;
}

// Menu item to topping group mapping
export interface MenuItemToppingGroup {
  id: string;
  menu_item_id: string;
  topping_group_id: string;
}

// Menu category to topping group mapping
export interface MenuCategoryToppingGroup {
  id: string;
  menu_category_id: string;
  topping_group_id: string;
}

// Order item topping snapshot
export interface OrderItemTopping {
  topping_option_id: string;
  name: string;
  unit_label: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  customizations: Customization[];
  toppings: OrderItemTopping[];
  subtotal: number;
}

export interface Order {
  id?: string;
  shift_id: string;
  staff_id: string;
  customer_type?: 'dine-in' | 'take-away';
  items: OrderItem[];
  total: number;
  total_amount?: number; // API returns this in cents
  total_items?: number; // API returns total item count
  status: 'pending' | 'completed' | 'cancelled' | 'voided';
  created_at?: number; // Unix timestamp in milliseconds
  void_reason?: 'mistake' | 'staff_consumption' | 'other';
  void_note?: string;
  voided_at?: number;
  voided_by?: string;
}

export interface Staff {
  id: string;
  name: string;
  password?: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  created_at?: number;
  updated_at?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  staff: Staff | null;
  isAdmin: boolean;
}

export interface MenuItemCategoryMap {
  id: string;
  menu_item_id: string;
  menu_category_id: string;
}

// Menu category to customization group mapping
export interface MenuCategoryCustomizationGroup {
  id: string;
  menu_category_id: string;
  customization_group_id: string;
}

export interface Shift {
  id: string;
  staff_id: string;
  staff_name?: string;
  date: string;
  started_at: number;
  ended_at?: number;
  status: 'open' | 'closed';
  staff?: Staff;
}

// Day close preview response
export interface DayClosePreviewResponse {
  businessDate: string;
  shifts: DayCloseShiftSummary[];
}

export interface DayCloseShiftSummary {
  id: string;
  status: string;
  staff?: Staff;
  started_at?: number;
  ended_at?: number;
  orders: Order[];
}

export interface Payment {
  payment_type: 'cash';
  amount: number;
  received_cash: number;
  change: number;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface PendingActionsStatus {
  hasUnprintedOrders: boolean;
  unprintedOrdersCount: number;
  hasUnreportedOrders: boolean;
  unreportedOrdersCount: number;
  hasUnreportedShifts: boolean;
  unreportedShiftsCount: number;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
}

// Telegram Intent configuration
export interface TelegramIntent {
  intent: 'ORDER_TRACKER' | 'SHIFT_TRACKER';
  enabled: boolean;
  chat_id: string | null;
}

// Extended order type for Order History display
export interface OrderWithDetails extends Order {
  staff_name?: string;
  payment?: Payment;
}

// UI State Types
export type POSScreen = 'shift' | 'order' | 'payment' | 'complete';

// UI-local customization types (used in CustomizationModal for demo)
export interface UICustomizationOption {
  id: string;
  name: string;
  price: number;
  group: string;
  isDefault?: boolean;
}

export interface CustomizationGroup {
  id?: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  default_option_id?: string;
  options: UICustomizationOption[];
}

// Customer Display API response types
export type DisplayScreenState = 'IDLE' | 'ORDERING' | 'PAYING' | 'COMPLETED';

export interface DisplayOrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  customizations: Array<{ name: string; price: number }>;
  subtotal: number;
}

export interface CustomerDisplayState {
  state: DisplayScreenState;
  items?: DisplayOrderItem[];
  total?: number;
  received_cash?: number;
  change?: number;
  payment_type?: 'cash' | 'qr';
}

// Receipt printing configuration
export interface ReceiptCopyConfig {
  variant: string;
  count: number;
}

// Versioned Settings Wrappers (v1)
export interface ReceiptCopiesSettingV1 {
  version: 1;
  copies: ReceiptCopyConfig[];
}

// Payment Profile (Store-level QR payment configuration)
export interface PaymentQrConfig {
  enabled: boolean;
  image_url: string | null;
}

export interface PaymentProfileV1 {
  version: 1;
  qr: PaymentQrConfig;
}

export interface TelegramIntentsSettingV1 {
  version: 1;
  intents: TelegramIntent[];
}

// Store entity (owns currency, language, timezone)
export interface Store {
  id: string;
  name: string;
  language: string;
  currency: string;
  timezone: string;
  brand_name?: string;
  logo_url?: string;
  address?: string;
  payment_profile?: PaymentProfileV1;
  created_at?: number;
  updated_at?: number;
}

export interface CloudSyncSettingV1 {
  version: 1;
  enabled: boolean;
  api_key: string;
  base_url: string;
}

export interface StoreUpdate {
  name?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  brand_name?: string;
  logo_url?: string;
  address?: string;
  payment_profile?: PaymentProfileV1;
}
