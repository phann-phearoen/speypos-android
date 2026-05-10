PRAGMA foreign_keys = ON;

CREATE TABLE MenuItem (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    price INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE MenuCategory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE MenuItemCategoryMap (
    id TEXT PRIMARY KEY,
    menu_item_id TEXT NOT NULL,
    menu_category_id TEXT NOT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES MenuItem(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_category_id) REFERENCES MenuCategory(id) ON DELETE CASCADE
);

CREATE TABLE Staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin' or 'staff'
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE Shift (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    date TEXT NOT NULL,
    telegram_reported_at INTEGER
);

CREATE TABLE StaffShift (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    FOREIGN KEY (shift_id) REFERENCES Shift(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES Staff(id) ON DELETE CASCADE
);

CREATE TABLE "Order" (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    status TEXT NOT NULL,
    customer_type TEXT,
    total_amount INTEGER NOT NULL,
    total_items INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    printed_at INTEGER,
    telegram_reported_at INTEGER,
    void_reason TEXT,
    void_note TEXT,
    voided_at INTEGER,
    voided_by TEXT,
    cloud_sync_at INTEGER,
    FOREIGN KEY (shift_id) REFERENCES Shift(id),
    FOREIGN KEY (staff_id) REFERENCES Staff(id),
    FOREIGN KEY (voided_by) REFERENCES Staff(id)
);

CREATE TABLE OrderItem (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES "Order"(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES MenuItem(id)
);

CREATE TABLE OrderCustomization (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    option_type TEXT,
    value TEXT,
    price INTEGER NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES OrderItem(id) ON DELETE CASCADE
);

CREATE TABLE OrderItemTopping (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    topping_option_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit_label TEXT NOT NULL DEFAULT 'qty',
    unit_price INTEGER NOT NULL,
    quantity REAL NOT NULL,
    total_price INTEGER NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES OrderItem(id) ON DELETE CASCADE,
    FOREIGN KEY (topping_option_id) REFERENCES ToppingOption(id)
);

CREATE TABLE Payment (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    received_cash INTEGER,
    change INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES "Order"(id) ON DELETE CASCADE
);

-- Customization Metadata Tables
CREATE TABLE CustomizationOptionGroup (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    selection_type TEXT NOT NULL, -- 'single' or 'multiple'
    required INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    default_option_id TEXT
);

CREATE TABLE CustomizationOption (
    id TEXT PRIMARY KEY,
    customization_group_id TEXT NOT NULL,
    label TEXT NOT NULL,
    price_delta INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (customization_group_id) REFERENCES CustomizationOptionGroup(id) ON DELETE CASCADE,
    UNIQUE (customization_group_id, label)
);

CREATE TABLE MenuItemCustomizationGroup (
    id TEXT PRIMARY KEY,
    menu_item_id TEXT NOT NULL,
    customization_group_id TEXT NOT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES MenuItem(id) ON DELETE CASCADE,
    FOREIGN KEY (customization_group_id) REFERENCES CustomizationOptionGroup(id) ON DELETE CASCADE,
    UNIQUE (menu_item_id, customization_group_id)
);

CREATE TABLE MenuCategoryCustomizationGroup (
    id TEXT PRIMARY KEY,
    menu_category_id TEXT NOT NULL,
    customization_group_id TEXT NOT NULL,
    FOREIGN KEY (menu_category_id) REFERENCES MenuCategory(id) ON DELETE CASCADE,
    FOREIGN KEY (customization_group_id) REFERENCES CustomizationOptionGroup(id) ON DELETE CASCADE,
    UNIQUE (menu_category_id, customization_group_id)
);

-- Topping Metadata Tables
CREATE TABLE ToppingGroup (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE ToppingOption (
    id TEXT PRIMARY KEY,
    topping_group_id TEXT NOT NULL,
    label TEXT NOT NULL,
    unit_label TEXT NOT NULL DEFAULT 'qty',
    unit_price INTEGER NOT NULL DEFAULT 0,
    min_quantity REAL NOT NULL DEFAULT 0,
    max_quantity REAL,
    step_quantity REAL NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (topping_group_id) REFERENCES ToppingGroup(id) ON DELETE CASCADE,
    UNIQUE (topping_group_id, label)
);

CREATE TABLE MenuItemToppingGroup (
    id TEXT PRIMARY KEY,
    menu_item_id TEXT NOT NULL,
    topping_group_id TEXT NOT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES MenuItem(id) ON DELETE CASCADE,
    FOREIGN KEY (topping_group_id) REFERENCES ToppingGroup(id) ON DELETE CASCADE,
    UNIQUE (menu_item_id, topping_group_id)
);

CREATE TABLE MenuCategoryToppingGroup (
    id TEXT PRIMARY KEY,
    menu_category_id TEXT NOT NULL,
    topping_group_id TEXT NOT NULL,
    FOREIGN KEY (menu_category_id) REFERENCES MenuCategory(id) ON DELETE CASCADE,
    FOREIGN KEY (topping_group_id) REFERENCES ToppingGroup(id) ON DELETE CASCADE,
    UNIQUE (menu_category_id, topping_group_id)
);

-- Indexes for performance on junction tables
CREATE INDEX idx_menu_item_customization_group_item ON MenuItemCustomizationGroup(menu_item_id);
CREATE INDEX idx_menu_item_customization_group_group ON MenuItemCustomizationGroup(customization_group_id);

CREATE INDEX idx_menu_category_customization_group_category ON MenuCategoryCustomizationGroup(menu_category_id);
CREATE INDEX idx_menu_category_customization_group_group ON MenuCategoryCustomizationGroup(customization_group_id);

CREATE INDEX idx_menu_item_topping_group_item ON MenuItemToppingGroup(menu_item_id);
CREATE INDEX idx_menu_item_topping_group_group ON MenuItemToppingGroup(topping_group_id);

CREATE INDEX idx_menu_category_topping_group_category ON MenuCategoryToppingGroup(menu_category_id);
CREATE INDEX idx_menu_category_topping_group_group ON MenuCategoryToppingGroup(topping_group_id);

CREATE INDEX IF NOT EXISTS idx_order_shift_cloud_sync ON "Order" (shift_id, cloud_sync_at);

-- Application Settings Table
CREATE TABLE Settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'json'
    category TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

-- Store Identity Table (single store for now, but designed for multi-store)
CREATE TABLE stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    currency TEXT NOT NULL,
    payment_profile TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Phnom_Penh',
    brand_name TEXT,
    logo_url TEXT,
    address TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);
