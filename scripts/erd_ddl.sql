-- ERD DDL Normalized Schema
-- Designed for: https://sqltoerdiagram.com/
-- Project: SipPoint (Loyalty & POS Coffee System)

-- 1. BASIC STORES, ZONES & TABLES
CREATE TABLE stores (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  address VARCHAR(255),
  phone VARCHAR(255),
  email VARCHAR(255),
  description VARCHAR(255),
  isActive VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE zones (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(255),
  isActive VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE tables (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  zoneId VARCHAR(24) NOT NULL,
  capacity INT,
  status VARCHAR(255),
  qrCode VARCHAR(255),
  isActive VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

-- 2. EMPLOYEE & ROLES (Normalized Role)
CREATE TABLE staffroles (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(255) NOT NULL UNIQUE,
  permissions TEXT,
  description VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE employees (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  roleId VARCHAR(24) NOT NULL, -- normalized FK to staffroles
  status VARCHAR(255),
  isTwoFactorEnabled BOOLEAN,
  loginAttempts INT NOT NULL,
  lockUntil DATETIME,
  resetPasswordOTP VARCHAR(255),
  resetPasswordOTPExpire DATETIME,
  resetPasswordToken VARCHAR(255),
  resetPasswordTokenExpire DATETIME,
  isDeleted BOOLEAN NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE activitylogs (
  _id VARCHAR(24) PRIMARY KEY,
  employeeId VARCHAR(24) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target VARCHAR(255),
  details VARCHAR(255),
  ipAddress VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

-- 3. MEMBERSHIP & CUSTOMERS (Normalized tierId, customerranks eliminated)
CREATE TABLE membershipprograms (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(255),
  status VARCHAR(255),
  startDate DATETIME,
  endDate DATETIME,
  isApproved BOOLEAN,
  approvedBy VARCHAR(24),
  createdBy VARCHAR(24),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE membershiptiers (
  _id VARCHAR(24) PRIMARY KEY,
  programId VARCHAR(24) NOT NULL,
  name VARCHAR(255) NOT NULL,
  minPoints INT NOT NULL,
  discountPercentage INT,
  description VARCHAR(255),
  status VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE customers (
  _id VARCHAR(24) PRIMARY KEY,
  customerId VARCHAR(255) UNIQUE,
  fullName VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(255) NOT NULL UNIQUE,
  avatar VARCHAR(255),
  dateOfBirth DATETIME,
  tierId VARCHAR(24), -- FK to membershiptiers
  currentPoints INT,
  totalSpent INT,
  password VARCHAR(255),
  isActive BOOLEAN,
  isVerified BOOLEAN,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE pointhistorys (
  _id VARCHAR(24) PRIMARY KEY,
  customerId VARCHAR(24) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  pointsChange INT NOT NULL,
  transactionType VARCHAR(255) NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME
);

-- 4. PRODUCTS, CATEGORIES, GROUPS & OPTION VARIANTS (Normalized groups/options hierarchy)
CREATE TABLE categorys (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE products (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  image VARCHAR(255) NOT NULL,
  images TEXT,
  category VARCHAR(24) NOT NULL,
  stock INT,
  rating INT,
  numReviews INT,
  isActive VARCHAR(255),
  createdBy VARCHAR(24),
  updatedBy VARCHAR(24),
  isDeleted BOOLEAN NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE productprices (
  _id VARCHAR(24) PRIMARY KEY,
  productId VARCHAR(24) NOT NULL UNIQUE,
  price INT NOT NULL,
  sizePriceMap VARCHAR(255),
  sizePriceMap___ INT,
  notes VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Normalized Product Variants Group (e.g., Size, Topping, Ice Level)
CREATE TABLE variantgroups (
  _id VARCHAR(24) PRIMARY KEY,
  productId VARCHAR(24) NOT NULL,
  name VARCHAR(255) NOT NULL, -- "Size", "Topping", "Ice Level"
  isRequired BOOLEAN DEFAULT false,
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Normalized Product Variants Option (e.g., Pearl, Cheese, Size L (+5000))
CREATE TABLE variantoptions (
  _id VARCHAR(24) PRIMARY KEY,
  groupId VARCHAR(24) NOT NULL,
  name VARCHAR(255) NOT NULL, -- "Size M", "Pearl", "Cheese"
  priceAdjustment INT NOT NULL DEFAULT 0,
  isActive VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

-- 5. VOUCHERS, ORDERS & ORDER ITEMS (Order 1 --- N OrderItem, Product 1 --- N OrderItem, Linked Voucher)
CREATE TABLE vouchers (
  _id VARCHAR(24) PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  discountType VARCHAR(255) NOT NULL,
  discountValue INT NOT NULL,
  minOrderValue INT,
  maxDiscountLimit INT,
  startDate DATETIME,
  endDate DATETIME NOT NULL,
  usageLimit INT NOT NULL,
  usedCount INT,
  isActive VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE customervouchers (
  _id VARCHAR(24) PRIMARY KEY,
  customerId VARCHAR(24) NOT NULL,
  voucherId VARCHAR(24),
  title VARCHAR(255) NOT NULL,
  expiryDate DATETIME NOT NULL,
  isUsed BOOLEAN,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE promotionprograms (
  _id VARCHAR(24) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(255),
  discountType VARCHAR(255),
  discountValue INT NOT NULL,
  minOrderValue INT,
  maxDiscountAmount INT,
  startDate DATETIME,
  endDate DATETIME,
  isActive VARCHAR(255),
  isApproved BOOLEAN,
  approvedBy VARCHAR(24),
  createdBy VARCHAR(24),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE orders (
  _id VARCHAR(24) PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  orderNumber VARCHAR(255),
  tableId VARCHAR(24),
  customerId VARCHAR(24),
  voucherId VARCHAR(24), -- FK to vouchers instead of promotionCode (Normalized)
  subtotal INT NOT NULL,
  discount INT NOT NULL,
  total INT NOT NULL,
  isUrgent BOOLEAN,
  isPaid BOOLEAN,
  isPickup BOOLEAN,
  type VARCHAR(255),
  status VARCHAR(255),
  note VARCHAR(255),
  isActive VARCHAR(255),
  createdBy VARCHAR(24),
  updatedBy VARCHAR(24),
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE orderitems (
  _id VARCHAR(24) PRIMARY KEY,
  orderId VARCHAR(24) NOT NULL, -- FK to orders (Fixes disjoint relationship)
  productId VARCHAR(24) NOT NULL, -- FK to products
  name VARCHAR(255) NOT NULL,
  unitPrice INT NOT NULL,
  qty INT NOT NULL,
  note VARCHAR(255),
  subtotal INT NOT NULL
);

-- Link table for ordered item options
CREATE TABLE orderitemoptions (
  _id VARCHAR(24) PRIMARY KEY,
  orderItemId VARCHAR(24) NOT NULL,
  optionId VARCHAR(24) NOT NULL, -- FK to variantoptions
  name VARCHAR(255) NOT NULL,
  priceAdjustment INT NOT NULL
);

-- 6. FEEDBACKS (One unique feedback per order) & NOTIFICATIONS / OTPs (Normalized polymorphic attributes)
CREATE TABLE feedbacks (
  _id VARCHAR(24) PRIMARY KEY,
  customerId VARCHAR(24),
  orderId VARCHAR(24) UNIQUE, -- Added UNIQUE constraint (1 order = 1 feedback)
  rating INT NOT NULL,
  comment VARCHAR(255) NOT NULL,
  reply VARCHAR(255),
  replyBy VARCHAR(24),
  status VARCHAR(255),
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Normalized Notifications (Strict relational FK paths for ERD representation)
CREATE TABLE notifications (
  _id VARCHAR(24) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(255) NOT NULL,
  recipientType VARCHAR(255), -- 'all', 'customer', 'staff'
  employeeRecipientId VARCHAR(24), -- Relational FK to employees
  customerRecipientId VARCHAR(24), -- Relational FK to customers
  type VARCHAR(255),
  status VARCHAR(255),
  isRead BOOLEAN,
  createdBy VARCHAR(24),
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Normalized OTPs (Strict relational FK paths)
CREATE TABLE otps (
  _id VARCHAR(24) PRIMARY KEY,
  employeeUserId VARCHAR(24), -- Relational FK to employees
  customerUserId VARCHAR(24), -- Relational FK to customers
  code VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME
);


-- FOREIGN KEY CONSTRAINTS (Strict verification & validation)
ALTER TABLE activitylogs ADD CONSTRAINT fk_activitylogs_employeeId FOREIGN KEY (employeeId) REFERENCES employees(_id);
ALTER TABLE customervouchers ADD CONSTRAINT fk_customervouchers_customerId FOREIGN KEY (customerId) REFERENCES customers(_id);
ALTER TABLE customervouchers ADD CONSTRAINT fk_customervouchers_voucherId FOREIGN KEY (voucherId) REFERENCES vouchers(_id);
ALTER TABLE feedbacks ADD CONSTRAINT fk_feedbacks_customerId FOREIGN KEY (customerId) REFERENCES customers(_id);
ALTER TABLE feedbacks ADD CONSTRAINT fk_feedbacks_orderId FOREIGN KEY (orderId) REFERENCES orders(_id);
ALTER TABLE feedbacks ADD CONSTRAINT fk_feedbacks_replyBy FOREIGN KEY (replyBy) REFERENCES employees(_id);
ALTER TABLE membershipprograms ADD CONSTRAINT fk_membershipprograms_approvedBy FOREIGN KEY (approvedBy) REFERENCES employees(_id);
ALTER TABLE membershipprograms ADD CONSTRAINT fk_membershipprograms_createdBy FOREIGN KEY (createdBy) REFERENCES employees(_id);
ALTER TABLE membershiptiers ADD CONSTRAINT fk_membershiptiers_programId FOREIGN KEY (programId) REFERENCES membershipprograms(_id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_createdBy FOREIGN KEY (createdBy) REFERENCES employees(_id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_employeeRecipient FOREIGN KEY (employeeRecipientId) REFERENCES employees(_id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_customerRecipient FOREIGN KEY (customerRecipientId) REFERENCES customers(_id);

-- Employee role constraint
ALTER TABLE employees ADD CONSTRAINT fk_employees_roleId FOREIGN KEY (roleId) REFERENCES staffroles(_id);

-- Customer tier constraint
ALTER TABLE customers ADD CONSTRAINT fk_customers_tierId FOREIGN KEY (tierId) REFERENCES membershiptiers(_id);

-- OTP target constraints
ALTER TABLE otps ADD CONSTRAINT fk_otps_employeeUserId FOREIGN KEY (employeeUserId) REFERENCES employees(_id);
ALTER TABLE otps ADD CONSTRAINT fk_otps_customerUserId FOREIGN KEY (customerUserId) REFERENCES customers(_id);

-- Product variants relations
ALTER TABLE variantgroups ADD CONSTRAINT fk_variantgroups_product FOREIGN KEY (productId) REFERENCES products(_id);
ALTER TABLE variantoptions ADD CONSTRAINT fk_variantoptions_group FOREIGN KEY (groupId) REFERENCES variantgroups(_id);

-- Order voucher, items, and item options relations
ALTER TABLE orders ADD CONSTRAINT fk_orders_voucherId FOREIGN KEY (voucherId) REFERENCES vouchers(_id);
ALTER TABLE orderitems ADD CONSTRAINT fk_orderitems_orderId FOREIGN KEY (orderId) REFERENCES orders(_id);
ALTER TABLE orderitems ADD CONSTRAINT fk_orderitems_productId FOREIGN KEY (productId) REFERENCES products(_id);
ALTER TABLE orderitemoptions ADD CONSTRAINT fk_orderitemoptions_orderItemId FOREIGN KEY (orderItemId) REFERENCES orderitems(_id);
ALTER TABLE orderitemoptions ADD CONSTRAINT fk_orderitemoptions_optionId FOREIGN KEY (optionId) REFERENCES variantoptions(_id);

-- Basic orders relations
ALTER TABLE orders ADD CONSTRAINT fk_orders_tableId FOREIGN KEY (tableId) REFERENCES tables(_id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_customerId FOREIGN KEY (customerId) REFERENCES customers(_id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_createdBy FOREIGN KEY (createdBy) REFERENCES employees(_id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_updatedBy FOREIGN KEY (updatedBy) REFERENCES employees(_id);

ALTER TABLE pointhistorys ADD CONSTRAINT fk_pointhistorys_customerId FOREIGN KEY (customerId) REFERENCES customers(_id);
ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category) REFERENCES categorys(_id);
ALTER TABLE products ADD CONSTRAINT fk_products_createdBy FOREIGN KEY (createdBy) REFERENCES employees(_id);
ALTER TABLE products ADD CONSTRAINT fk_products_updatedBy FOREIGN KEY (updatedBy) REFERENCES employees(_id);
ALTER TABLE productprices ADD CONSTRAINT fk_productprices_productId FOREIGN KEY (productId) REFERENCES products(_id);
ALTER TABLE promotionprograms ADD CONSTRAINT fk_promotionprograms_approvedBy FOREIGN KEY (approvedBy) REFERENCES employees(_id);
ALTER TABLE promotionprograms ADD CONSTRAINT fk_promotionprograms_createdBy FOREIGN KEY (createdBy) REFERENCES employees(_id);
ALTER TABLE tables ADD CONSTRAINT fk_tables_zoneId FOREIGN KEY (zoneId) REFERENCES zones(_id);
