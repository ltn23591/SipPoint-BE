-- =====================================================
-- 1. Core & Users (Tai khoản & Phan quyen & Khach hang)
-- =====================================================

CREATE TABLE staff_roles (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
    _id VARCHAR(24) PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    roleId VARCHAR(24),
    isActive VARCHAR(20) DEFAULT 'active',
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roleId) REFERENCES staff_roles(_id)
);

CREATE TABLE membership_tiers (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    minSpend DECIMAL(15,2) DEFAULT 0,
    minPoints INT DEFAULT 0,
    pointsMultiplier DECIMAL(5,2) DEFAULT 1.0,
    discountPercentage DECIMAL(5,2) DEFAULT 0,
    benefits TEXT,
    icon VARCHAR(255),
    isActive VARCHAR(20) DEFAULT 'active',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    _id VARCHAR(24) PRIMARY KEY,
    customerId VARCHAR(100) UNIQUE,
    fullName VARCHAR(255) NOT NULL,
    gender VARCHAR(20) DEFAULT 'other',
    email VARCHAR(255),
    phone VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    googleId VARCHAR(255) UNIQUE,
    avatar VARCHAR(255),
    dateOfBirth DATETIME2,
    tier VARCHAR(50) DEFAULT 'BRONZE',
    tierId VARCHAR(24),
    currentPoints INT DEFAULT 0,
    cyclePoints INT DEFAULT 0,
    tierAchievedAt DATETIME2,
    tierExpiresAt DATETIME2,
    lastVisitAt DATETIME2,
    totalSpent DECIMAL(15,2) DEFAULT 0,
    orderCount INT DEFAULT 0,
    redeemCount INT DEFAULT 0,
    isActive VARCHAR(20) DEFAULT 'active',
    isVerified BIT DEFAULT 0,
    verificationToken VARCHAR(255),
    verificationExpires DATETIME2,
    resetPasswordToken VARCHAR(255),
    resetPasswordExpires DATETIME2,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tierId) REFERENCES membership_tiers(_id)
);

CREATE TABLE customer_segments (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    isSystem BIT DEFAULT 0,
    criteria NVARCHAR(MAX),
    customerCount INT DEFAULT 0,
    isActive VARCHAR(20) DEFAULT 'active',
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

-- =====================================================
-- 2. Store & Layout (Cua hang, Khu vuc, Ban & Ca lam)
-- =====================================================

CREATE TABLE stores (
    _id VARCHAR(24) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    paymentMethods NVARCHAR(MAX),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    isActive VARCHAR(20) DEFAULT 'active',
    storeId VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (storeId) REFERENCES stores(_id)
);

CREATE TABLE tables (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    zoneId VARCHAR(24),
    capacity INT DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available',
    qrCode TEXT,
    isActive VARCHAR(20) DEFAULT 'active',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zoneId) REFERENCES zones(_id)
);

CREATE TABLE shifts (
    _id VARCHAR(24) PRIMARY KEY,
    employeeId VARCHAR(24) NOT NULL,
    startTime DATETIME2 NOT NULL,
    endTime DATETIME2,
    initialCash DECIMAL(15,2) DEFAULT 0,
    finalCash DECIMAL(15,2) DEFAULT 0,
    totalRevenue DECIMAL(15,2) DEFAULT 0,
    cashRevenue DECIMAL(15,2) DEFAULT 0,
    transferRevenue DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    notes TEXT,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees(_id)
);

-- =====================================================
-- 3. Products & Categories (Danh muc, Mon an, Bien the)
-- =====================================================

CREATE TABLE categories (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    isActive VARCHAR(20) DEFAULT 'active',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    image VARCHAR(255) NOT NULL,
    images NVARCHAR(MAX),
    categoryId VARCHAR(24) NOT NULL,
    stock INT DEFAULT 0,
    stockStatus VARCHAR(20) DEFAULT 'in_stock',
    rating DECIMAL(3,2) DEFAULT 0,
    numReviews INT DEFAULT 0,
    isActive VARCHAR(20) DEFAULT 'active',
    isDeleted BIT DEFAULT 0,
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

-- =====================================================
-- Nguyen lieu, Cong thuc & So cai ton kho (Inventory)
-- =====================================================

CREATE TABLE materials (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE,
    unit VARCHAR(50) NOT NULL,
    onHand DECIMAL(15,3) DEFAULT 0,
    reserved DECIMAL(15,3) DEFAULT 0,
    minThreshold DECIMAL(15,3) DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_stock',
    isActive VARCHAR(20) DEFAULT 'active',
    isDeleted BIT DEFAULT 0,
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

-- Moi san pham gan voi dung mot cong thuc (items luu dang JSON: [{ materialId, quantity }])
CREATE TABLE product_recipes (
    _id VARCHAR(24) PRIMARY KEY,
    productId VARCHAR(24) NOT NULL UNIQUE,
    items NVARCHAR(MAX),
    isActive VARCHAR(20) DEFAULT 'active',
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

-- So cai bien dong ton kho (append-only) - nguon du lieu bao cao tieu hao
CREATE TABLE stock_movements (
    _id VARCHAR(24) PRIMARY KEY,
    materialId VARCHAR(24) NOT NULL,
    type VARCHAR(20) NOT NULL, -- IMPORT/ADJUSTMENT/HOLD/RELEASE/CONSUME/RESTOCK
    quantityChange DECIMAL(15,3) NOT NULL,
    balanceAfter DECIMAL(15,3) NOT NULL,
    orderId VARCHAR(24),
    note TEXT,
    createdBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (materialId) REFERENCES materials(_id),
    FOREIGN KEY (orderId) REFERENCES orders(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id)
);

CREATE TABLE product_variants (
    _id VARCHAR(24) PRIMARY KEY,
    productId VARCHAR(24) NOT NULL,
    name VARCHAR(255) NOT NULL,
    priceAdjustment DECIMAL(15,2) NOT NULL DEFAULT 0,
    variantType VARCHAR(50) DEFAULT 'size',
    isActive VARCHAR(20) DEFAULT 'active',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(_id)
);

-- =====================================================
-- 4. Vouchers, Orders & Order Items (Don hang & Giam gia)
-- =====================================================

CREATE TABLE vouchers (
    _id VARCHAR(24) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discountType INT DEFAULT 0,
    discountValue DECIMAL(15,2) DEFAULT 0,
    minOrderValue DECIMAL(15,2) DEFAULT 0,
    maxDiscountLimit DECIMAL(15,2) DEFAULT 0,
    maxUsage INT DEFAULT 0,
    currentUsage INT DEFAULT 0,
    pointsCost INT DEFAULT 0,
    startDate DATETIME2,
    endDate DATETIME2,
    isActive VARCHAR(20) DEFAULT 'active',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_vouchers (
    _id VARCHAR(24) PRIMARY KEY,
    customerId VARCHAR(24) NOT NULL,
    voucherId VARCHAR(24) NOT NULL,
    code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    discountType INT DEFAULT 0,
    discountValue DECIMAL(15,2) DEFAULT 0,
    minOrderValue DECIMAL(15,2) DEFAULT 0,
    maxDiscountLimit DECIMAL(15,2) DEFAULT 0,
    isUsed BIT DEFAULT 0,
    usedAt DATETIME2,
    expiryDate DATETIME2,
    orderId VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id)
);

CREATE TABLE orders (
    _id VARCHAR(24) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    orderNumber VARCHAR(100),
    tableId VARCHAR(24),
    customerId VARCHAR(24),
    voucherId VARCHAR(24),
    customerVoucherId VARCHAR(24),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    pointsAwarded INT DEFAULT 0,
    isUrgent BIT DEFAULT 0,
    isPaid BIT DEFAULT 0,
    paymentMethod VARCHAR(50) DEFAULT 'CASH',
    isPickup BIT DEFAULT 0,
    type VARCHAR(50) DEFAULT 'dine_in',
    status VARCHAR(50) DEFAULT 'PENDING',
    note TEXT,
    isActive VARCHAR(20) DEFAULT 'active',
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tableId) REFERENCES tables(_id),
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id),
    FOREIGN KEY (customerVoucherId) REFERENCES customer_vouchers(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

CREATE TABLE order_items (
    _id VARCHAR(24) PRIMARY KEY,
    orderId VARCHAR(24) NOT NULL,
    productId VARCHAR(24) NOT NULL,
    name VARCHAR(255) NOT NULL,
    unitPrice DECIMAL(15,2) NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 1,
    variants NVARCHAR(MAX),
    note TEXT,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(_id),
    FOREIGN KEY (productId) REFERENCES products(_id)
);

-- =====================================================
-- 5. Loyalty, Gamification & Marketing (Tich diem & Vong quay)
-- =====================================================

CREATE TABLE membership_programs (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    earnedPointsRate DECIMAL(5,2) DEFAULT 1.0,
    redeemPointsRate DECIMAL(5,2) DEFAULT 1.0,
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE point_histories (
    _id VARCHAR(24) PRIMARY KEY,
    customerId VARCHAR(24) NOT NULL,
    points INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    orderId VARCHAR(24),
    note TEXT,
    expiresAt DATETIME2,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (orderId) REFERENCES orders(_id)
);

CREATE TABLE campaigns (
    _id VARCHAR(24) PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    startDate DATETIME2,
    endDate DATETIME2,
    status VARCHAR(50) DEFAULT 'draft',
    targetSegmentId VARCHAR(24),
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (targetSegmentId) REFERENCES customer_segments(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

CREATE TABLE lucky_wheels (
    _id VARCHAR(24) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    spinCost INT DEFAULT 0,
    startDate DATETIME2,
    endDate DATETIME2,
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lucky_wheel_slots (
    _id VARCHAR(24) PRIMARY KEY,
    wheelId VARCHAR(24) NOT NULL,
    slotIndex INT NOT NULL,
    prizeType VARCHAR(50) NOT NULL,
    prizeName VARCHAR(255) NOT NULL,
    voucherId VARCHAR(24),
    pointsValue INT DEFAULT 0,
    probability DECIMAL(5,4) DEFAULT 0,
    totalQuantity INT DEFAULT 0,
    remainingQuantity INT DEFAULT 0,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wheelId) REFERENCES lucky_wheels(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id)
);

CREATE TABLE spin_histories (
    _id VARCHAR(24) PRIMARY KEY,
    customerId VARCHAR(24) NOT NULL,
    wheelId VARCHAR(24) NOT NULL,
    slotId VARCHAR(24) NOT NULL,
    prizeType VARCHAR(50) NOT NULL,
    prizeName VARCHAR(255) NOT NULL,
    voucherId VARCHAR(24),
    pointsEarned INT DEFAULT 0,
    customerVoucherId VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (wheelId) REFERENCES lucky_wheels(_id),
    FOREIGN KEY (slotId) REFERENCES lucky_wheel_slots(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id),
    FOREIGN KEY (customerVoucherId) REFERENCES customer_vouchers(_id)
);

-- =====================================================
-- 6. Support, Feedback, AI Chat & System Logs
-- =====================================================

CREATE TABLE activity_logs (
    _id VARCHAR(24) PRIMARY KEY,
    userId VARCHAR(24),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details TEXT,
    ipAddress VARCHAR(50),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES employees(_id)
);

CREATE TABLE banners (
    _id VARCHAR(24) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image VARCHAR(255) NOT NULL,
    link VARCHAR(255),
    isActive VARCHAR(20) DEFAULT 'active',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_sessions (
    _id VARCHAR(24) PRIMARY KEY,
    sessionId VARCHAR(255) NOT NULL UNIQUE,
    customerId VARCHAR(24),
    messages NVARCHAR(MAX),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(_id)
);

CREATE TABLE feedbacks (
    _id VARCHAR(24) PRIMARY KEY,
    customerId VARCHAR(24),
    orderId VARCHAR(24),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (orderId) REFERENCES orders(_id)
);

CREATE TABLE notifications (
    _id VARCHAR(24) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    recipientType VARCHAR(50) DEFAULT 'ALL',
    recipientIds NVARCHAR(MAX),
    isRead BIT DEFAULT 0,
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

CREATE TABLE otps (
    _id VARCHAR(24) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type VARCHAR(50) DEFAULT 'REGISTER',
    expiresAt DATETIME2 NOT NULL,
    createdAt DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

