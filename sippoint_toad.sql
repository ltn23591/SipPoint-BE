-- -----------------------------------------------------
-- Core & Users
-- -----------------------------------------------------
CREATE TABLE staff_roles (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50),
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24)
);

CREATE TABLE employees (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    password VARCHAR(255),
    roleId VARCHAR(24),
    isActive BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (roleId) REFERENCES staff_roles(_id)
);

CREATE TABLE membership_tiers (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    minSpend DECIMAL(15,2) DEFAULT 0,
    pointsMultiplier DECIMAL(5,2) DEFAULT 1,
    discountPercentage DECIMAL(5,2) DEFAULT 0,
    benefits TEXT,
    icon VARCHAR(255),
    minPoints INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE customers (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(50),
    googleId VARCHAR(255),
    avatar VARCHAR(255),
    dateOfBirth DATETIME,
    tierId VARCHAR(24),
    currentPoints INT DEFAULT 0,
    cyclePoints INT DEFAULT 0,
    tierAchievedAt DATETIME,
    tierExpiresAt DATETIME,
    lastVisitAt DATETIME,
    totalSpent DECIMAL(15,2) DEFAULT 0,
    orderCount INT DEFAULT 0,
    redeemCount INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    isVerified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tierId) REFERENCES membership_tiers(_id)
);

CREATE TABLE customer_segments (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    isSystem BOOLEAN DEFAULT FALSE,
    criteria TEXT,
    customerCount INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

-- -----------------------------------------------------
-- Store & Layout
-- -----------------------------------------------------
CREATE TABLE stores (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    status VARCHAR(50)
);

CREATE TABLE zones (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    isActive VARCHAR(20),
    storeId VARCHAR(24),
    FOREIGN KEY (storeId) REFERENCES stores(_id)
);

CREATE TABLE tables (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    zoneId VARCHAR(24),
    capacity INT DEFAULT 4,
    status VARCHAR(50),
    qrCode TEXT,
    isActive VARCHAR(20),
    FOREIGN KEY (zoneId) REFERENCES zones(_id)
);

CREATE TABLE shifts (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    startTime VARCHAR(20),
    endTime VARCHAR(20),
    status VARCHAR(50),
    notes TEXT
);

-- -----------------------------------------------------
-- Products & Categories
-- -----------------------------------------------------
CREATE TABLE categories (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    isActive VARCHAR(20)
);

CREATE TABLE products (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    categoryId VARCHAR(24),
    image VARCHAR(255),
    basePrice DECIMAL(15,2) DEFAULT 0,
    isAvailable BOOLEAN DEFAULT TRUE,
    isActive VARCHAR(20),
    FOREIGN KEY (categoryId) REFERENCES categories(_id)
);

CREATE TABLE product_variants (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    productId VARCHAR(24) NOT NULL,
    size VARCHAR(50) NOT NULL,
    priceAdjustment DECIMAL(15,2) DEFAULT 0,
    isAvailable BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (productId) REFERENCES products(_id)
);

CREATE TABLE product_prices (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    productId VARCHAR(24) NOT NULL,
    variantId VARCHAR(24),
    price DECIMAL(15,2) NOT NULL,
    effectiveDate DATETIME,
    FOREIGN KEY (productId) REFERENCES products(_id),
    FOREIGN KEY (variantId) REFERENCES product_variants(_id)
);

-- -----------------------------------------------------
-- Orders & Order Items
-- -----------------------------------------------------
CREATE TABLE vouchers (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discountType VARCHAR(50),
    discountValue DECIMAL(15,2) DEFAULT 0,
    minOrderAmount DECIMAL(15,2) DEFAULT 0,
    maxDiscountAmount DECIMAL(15,2) DEFAULT 0,
    maxGlobalUsage INT DEFAULT 0,
    maxUsagePerCustomer INT DEFAULT 1,
    pointsCost INT DEFAULT 0,
    startDate DATETIME,
    endDate DATETIME,
    isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE customer_vouchers (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    customerId VARCHAR(24) NOT NULL,
    voucherId VARCHAR(24) NOT NULL,
    status VARCHAR(50),
    redeemedAt DATETIME,
    usedAt DATETIME,
    orderId VARCHAR(24),
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id)
);

CREATE TABLE orders (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    orderNumber VARCHAR(100),
    tableId VARCHAR(24),
    customerId VARCHAR(24),
    voucherId VARCHAR(24),
    customerVoucherId VARCHAR(24),
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    pointsAwarded INT DEFAULT 0,
    isUrgent BOOLEAN DEFAULT FALSE,
    isPaid BOOLEAN DEFAULT FALSE,
    paymentMethod VARCHAR(50),
    isPickup BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    status VARCHAR(50),
    note TEXT,
    isActive VARCHAR(20),
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    FOREIGN KEY (tableId) REFERENCES tables(_id),
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id),
    FOREIGN KEY (customerVoucherId) REFERENCES customer_vouchers(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

CREATE TABLE order_items (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    orderId VARCHAR(24) NOT NULL,
    productId VARCHAR(24) NOT NULL,
    variantId VARCHAR(24),
    quantity INT DEFAULT 1,
    price DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    itemStatus VARCHAR(50),
    note TEXT,
    preparedBy VARCHAR(24),
    FOREIGN KEY (orderId) REFERENCES orders(_id),
    FOREIGN KEY (productId) REFERENCES products(_id),
    FOREIGN KEY (variantId) REFERENCES product_variants(_id),
    FOREIGN KEY (preparedBy) REFERENCES employees(_id)
);

-- -----------------------------------------------------
-- Loyalty, Gamification & Campaigns
-- -----------------------------------------------------
CREATE TABLE membership_programs (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    earnedPointsRate DECIMAL(5,2) DEFAULT 1,
    redeemPointsRate DECIMAL(5,2) DEFAULT 1,
    isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE point_histories (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    customerId VARCHAR(24) NOT NULL,
    points INT NOT NULL,
    type VARCHAR(50),
    orderId VARCHAR(24),
    note TEXT,
    expiresAt DATETIME,
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (orderId) REFERENCES orders(_id)
);

CREATE TABLE campaigns (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    startDate DATETIME,
    endDate DATETIME,
    status VARCHAR(50),
    targetSegmentId VARCHAR(24),
    createdBy VARCHAR(24),
    updatedBy VARCHAR(24),
    FOREIGN KEY (targetSegmentId) REFERENCES customer_segments(_id),
    FOREIGN KEY (createdBy) REFERENCES employees(_id),
    FOREIGN KEY (updatedBy) REFERENCES employees(_id)
);

CREATE TABLE promotion_programs (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    code VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    startDate DATETIME,
    endDate DATETIME,
    isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE lucky_wheels (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    spinCost INT DEFAULT 0,
    startDate DATETIME,
    endDate DATETIME,
    isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE lucky_wheel_slots (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    wheelId VARCHAR(24) NOT NULL,
    slotIndex INT NOT NULL,
    prizeType VARCHAR(50),
    prizeName VARCHAR(255),
    voucherId VARCHAR(24),
    pointsValue INT DEFAULT 0,
    probability DECIMAL(5,4) DEFAULT 0,
    totalQuantity INT DEFAULT 0,
    remainingQuantity INT DEFAULT 0,
    FOREIGN KEY (wheelId) REFERENCES lucky_wheels(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id)
);

CREATE TABLE spin_histories (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    customerId VARCHAR(24) NOT NULL,
    wheelId VARCHAR(24) NOT NULL,
    slotId VARCHAR(24) NOT NULL,
    prizeType VARCHAR(50),
    prizeName VARCHAR(255),
    voucherId VARCHAR(24),
    pointsEarned INT DEFAULT 0,
    customerVoucherId VARCHAR(24),
    FOREIGN KEY (customerId) REFERENCES customers(_id),
    FOREIGN KEY (wheelId) REFERENCES lucky_wheels(_id),
    FOREIGN KEY (slotId) REFERENCES lucky_wheel_slots(_id),
    FOREIGN KEY (voucherId) REFERENCES vouchers(_id),
    FOREIGN KEY (customerVoucherId) REFERENCES customer_vouchers(_id)
);

-- -----------------------------------------------------
-- Support & Logs (Đã loại bỏ Feedback)
-- -----------------------------------------------------
CREATE TABLE activity_logs (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    userId VARCHAR(24),
    action VARCHAR(255),
    module VARCHAR(100),
    details TEXT,
    ipAddress VARCHAR(50),
    FOREIGN KEY (userId) REFERENCES employees(_id)
);

CREATE TABLE banners (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    title VARCHAR(255),
    imageUrl VARCHAR(255),
    linkUrl VARCHAR(255),
    position INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE chat_sessions (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    customerId VARCHAR(24),
    sessionId VARCHAR(255),
    status VARCHAR(50),
    FOREIGN KEY (customerId) REFERENCES customers(_id)
);

CREATE TABLE notifications (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    customerId VARCHAR(24),
    title VARCHAR(255),
    body TEXT,
    type VARCHAR(50),
    isRead BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (customerId) REFERENCES customers(_id)
);

CREATE TABLE otps (
    _id VARCHAR(24) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type VARCHAR(50),
    expiresAt DATETIME
);
