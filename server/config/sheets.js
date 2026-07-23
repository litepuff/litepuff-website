export const SHEET_NAMES = Object.freeze({
  CUSTOMERS: 'CUSTOMERS', PRODUCTS: 'PRODUCTS', PRODUCT_IMAGES: 'PRODUCT_IMAGES',
  CATEGORIES: 'CATEGORIES', INVENTORY: 'INVENTORY', CART: 'CART', WISHLIST: 'WISHLIST',
  ADDRESSES: 'ADDRESSES', ORDERS: 'ORDERS', ORDER_ITEMS: 'ORDER_ITEMS',
  PAYMENTS: 'PAYMENTS', ORDER_TRACKING: 'ORDER_TRACKING', COUPONS: 'COUPONS',
  BLOGS: 'BLOGS', BLOG_CATEGORIES: 'BLOG_CATEGORIES', FAQ: 'FAQ', REVIEWS: 'REVIEWS',
  CONTACT_MESSAGES: 'CONTACT_MESSAGES', NEWSLETTER: 'NEWSLETTER', SETTINGS: 'SETTINGS',
  SHIPMENTS: 'SHIPMENTS', NOTIFICATIONS: 'NOTIFICATIONS', AUTH_AUDIT: 'AUTH_AUDIT', SESSIONS: 'SESSIONS', OTP_CHALLENGES: 'OTP_CHALLENGES', IDENTITY_VERIFICATIONS: 'IDENTITY_VERIFICATIONS',
  WHATSAPP_CONVERSATIONS: 'WHATSAPP_CONVERSATIONS', WHATSAPP_SESSIONS: 'WHATSAPP_SESSIONS',
  WHATSAPP_MESSAGES: 'WHATSAPP_MESSAGES', WHATSAPP_CAMPAIGNS: 'WHATSAPP_CAMPAIGNS', WHATSAPP_TEMPLATES: 'WHATSAPP_TEMPLATES'
});

export const SHEET_SCHEMAS = Object.freeze({
  CUSTOMERS: ['CustomerID', 'FirstName', 'LastName', 'Email', 'Phone', 'Provider', 'GoogleID', 'ProfileImage', 'PasswordHash', 'CreatedAt', 'LastLogin', 'Status', 'Role', 'EmailVerified', 'PhoneVerified', 'MarketingConsent', 'UpdatedAt', 'DeletedAt', 'DeletedReason', 'VerificationDate', 'VerificationMethod', 'VerificationSource', 'LockedUntil', 'LockReason', 'BannedAt'],
  PRODUCTS: ['ProductID', 'Name', 'Slug', 'Category', 'Flavor', 'ShortDescription', 'Description', 'Ingredients', 'NutritionPDF', 'Price', 'DiscountPrice', 'Weight', 'Stock', 'Featured', 'BestSeller', 'Status', 'PrimaryImage', 'CreatedAt', 'UpdatedAt'],
  PRODUCT_IMAGES: ['ImageID', 'ProductID', 'ImageURL', 'SortOrder'],
  CATEGORIES: ['CategoryID', 'Name', 'Slug', 'Status', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
  INVENTORY: ['InventoryID', 'ProductID', 'Stock', 'Reserved', 'ReorderLevel', 'UpdatedAt'],
  CART: ['CartID', 'CustomerID', 'ProductID', 'Quantity', 'AddedAt', 'UpdatedAt'],
  WISHLIST: ['WishlistID', 'CustomerID', 'ProductID', 'CreatedAt'],
  ADDRESSES: ['AddressID', 'CustomerID', 'FullName', 'Phone', 'AddressLine1', 'AddressLine2', 'Landmark', 'City', 'State', 'Pincode', 'Country', 'AddressType', 'IsDefault', 'CreatedAt'],
  ORDERS: ['OrderID', 'OrderNumber', 'CustomerID', 'AddressID', 'Subtotal', 'ProductDiscount', 'FirstOrderDiscount', 'CouponDiscount', 'Shipping', 'Discount', 'Tax', 'GrandTotal', 'CouponCode', 'PaymentMethod', 'PaymentStatus', 'OrderStatus', 'TrackingNumber', 'EstimatedDelivery', 'CreatedAt', 'UpdatedAt'],
  ORDER_ITEMS: ['OrderItemID', 'OrderID', 'ProductID', 'ProductName', 'Price', 'Quantity', 'Total'],
  PAYMENTS: ['PaymentID', 'OrderID', 'CustomerID', 'RazorpayOrderID', 'RazorpayPaymentID', 'RazorpaySignature', 'PaymentMethod', 'Amount', 'Currency', 'Status', 'PaidAt', 'TransactionReference', 'Gateway', 'Remarks'],
  ORDER_TRACKING: ['TrackingID', 'OrderID', 'CurrentStatus', 'UpdatedBy', 'Remarks', 'UpdatedAt', 'EstimatedDeliveryDate'],
  COUPONS: ['CouponID', 'Code', 'Type', 'Value', 'MinOrder', 'MaxDiscount', 'Expiry', 'UsageLimit', 'UsedCount', 'Status'],
  BLOGS: ['BlogID', 'Title', 'Slug', 'Category', 'Author', 'CoverImage', 'Excerpt', 'Content', 'ReadingTime', 'Tags', 'Featured', 'PublishedDate', 'Status'],
  BLOG_CATEGORIES: ['CategoryID', 'Name', 'Slug'],
  FAQ: ['FAQID', 'Category', 'Question', 'Answer', 'SortOrder', 'Status'],
  REVIEWS: ['ReviewID', 'CustomerID', 'OrderID', 'ProductID', 'Rating', 'Title', 'Review', 'Status', 'CreatedAt'],
  CONTACT_MESSAGES: ['MessageID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'CreatedAt', 'Status'],
  NEWSLETTER: ['SubscriberID', 'Email', 'SubscribedAt', 'Status'],
  SETTINGS: ['SettingID', 'Key', 'Value', 'Type', 'UpdatedAt'],
  SHIPMENTS: ['ShipmentID', 'OrderID', 'Provider', 'ProviderShipmentID', 'AWB', 'Courier', 'Cost', 'EstimatedDays', 'LabelURL', 'Status', 'TrackingURL', 'CreatedAt', 'UpdatedAt'],
  NOTIFICATIONS: ['NotificationID', 'CustomerID', 'OrderID', 'Channel', 'Type', 'Status', 'ProviderID', 'SentAt', 'Error', 'Title', 'Message', 'DeepLink', 'IsRead', 'CreatedAt', 'ReadAt', 'Attempts', 'NextAttemptAt', 'Metadata'],
  AUTH_AUDIT: ['AuditID', 'FirebaseUID', 'CustomerID', 'Event', 'IPHash', 'UserAgent', 'CreatedAt', 'ActorID', 'ActorRole', 'Permission', 'Resource', 'Action', 'Decision', 'RequestID', 'Metadata'],
  SESSIONS: ['SessionID', 'CustomerID', 'Role', 'RefreshTokenHash', 'Status', 'CreatedAt', 'LastActivity', 'ExpiresAt', 'UserAgent', 'IPAddress', 'TerminatedAt', 'TerminationReason', 'TrustedAt'],
  OTP_CHALLENGES: ['OTPID', 'CustomerID', 'Identifier', 'Provider', 'OTPHash', 'Purpose', 'CreatedAt', 'ExpiresAt', 'Attempts', 'ResendCount', 'Status', 'LastSentAt', 'LockedUntil', 'VerifiedAt', 'DeliveryStatus', 'ProviderMessageID'],
  IDENTITY_VERIFICATIONS: ['VerificationID', 'CustomerID', 'Channel', 'IdentifierHash', 'Purpose', 'Method', 'Source', 'VerifiedAt'],
  WHATSAPP_CONVERSATIONS: ['ConversationID', 'CustomerID', 'Phone', 'Status', 'CurrentIntent', 'CurrentStep', 'LastMessageID', 'LastMessageType', 'LastMessageAt', 'CreatedAt', 'UpdatedAt', 'ClosedAt', 'Metadata', 'UnreadCount', 'IsPinned', 'AssignedTo', 'AssignedAt', 'ResolvedAt'],
  WHATSAPP_SESSIONS: ['WhatsAppSessionID', 'ConversationID', 'CustomerID', 'Phone', 'Status', 'Authenticated', 'CreatedAt', 'LastActivity', 'ExpiresAt', 'ClosedAt'],
  WHATSAPP_MESSAGES: ['MessageID', 'ConversationID', 'CustomerID', 'Phone', 'Direction', 'MessageType', 'Content', 'ProviderMessageID', 'DeliveryID', 'DeliveryStatus', 'Unread', 'CampaignID', 'TemplateName', 'RetryCount', 'ErrorCode', 'CreatedAt', 'SentAt', 'DeliveredAt', 'ReadAt', 'FailedAt', 'DeletedAt', 'Metadata'],
  WHATSAPP_CAMPAIGNS: ['CampaignID', 'Name', 'TemplateName', 'Audience', 'Status', 'ScheduledAt', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'PausedAt', 'CompletedAt', 'TotalRecipients', 'Queued', 'Sent', 'Delivered', 'Read', 'Failed', 'Metadata'],
  WHATSAPP_TEMPLATES: ['TemplateID', 'Name', 'MetaTemplateID', 'Category', 'Language', 'Status', 'Components', 'Preview', 'UsageCount', 'LastSyncedAt', 'CreatedAt', 'UpdatedAt']
});

export const SHEET_RULES = Object.freeze({
  CUSTOMERS: { primaryKey: 'CustomerID', unique: [['Email']], email: ['Email'], phone: ['Phone'] },
  PRODUCTS: { primaryKey: 'ProductID', unique: [['Slug']], numeric: ['Price', 'DiscountPrice', 'Stock'] },
  PRODUCT_IMAGES: { primaryKey: 'ImageID', foreign: { ProductID: ['PRODUCTS', 'ProductID'] }, numeric: ['SortOrder'] },
  CATEGORIES: { primaryKey: 'CategoryID', unique: [['Name'], ['Slug']], numeric: ['SortOrder'] },
  INVENTORY: { primaryKey: 'InventoryID', unique: [['ProductID']], foreign: { ProductID: ['PRODUCTS', 'ProductID'] }, numeric: ['Stock', 'Reserved', 'ReorderLevel'] },
  CART: { primaryKey: 'CartID', unique: [['CustomerID', 'ProductID']], foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'], ProductID: ['PRODUCTS', 'ProductID'] }, numeric: ['Quantity'] },
  WISHLIST: { primaryKey: 'WishlistID', unique: [['CustomerID', 'ProductID']], foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'], ProductID: ['PRODUCTS', 'ProductID'] } },
  ADDRESSES: { primaryKey: 'AddressID', foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'] }, phone: ['Phone'] },
  ORDERS: { primaryKey: 'OrderID', unique: [['OrderNumber']], foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'], AddressID: ['ADDRESSES', 'AddressID'] }, numeric: ['Subtotal', 'ProductDiscount', 'FirstOrderDiscount', 'CouponDiscount', 'Shipping', 'Discount', 'Tax', 'GrandTotal'] },
  ORDER_ITEMS: { primaryKey: 'OrderItemID', foreign: { OrderID: ['ORDERS', 'OrderID'], ProductID: ['PRODUCTS', 'ProductID'] }, numeric: ['Price', 'Quantity', 'Total'] },
  PAYMENTS: { primaryKey: 'PaymentID', foreign: { OrderID: ['ORDERS', 'OrderID'], CustomerID: ['CUSTOMERS', 'CustomerID'] }, numeric: ['Amount'] },
  ORDER_TRACKING: { primaryKey: 'TrackingID', foreign: { OrderID: ['ORDERS', 'OrderID'] } },
  COUPONS: { primaryKey: 'CouponID', unique: [['Code']], numeric: ['Value', 'MinOrder', 'MaxDiscount', 'UsageLimit', 'UsedCount'] },
  BLOGS: { primaryKey: 'BlogID', unique: [['Slug']] }, BLOG_CATEGORIES: { primaryKey: 'CategoryID', unique: [['Slug']] },
  FAQ: { primaryKey: 'FAQID', numeric: ['SortOrder'] },
  REVIEWS: { primaryKey: 'ReviewID', unique: [['CustomerID', 'OrderID', 'ProductID']], foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'], OrderID: ['ORDERS', 'OrderID'], ProductID: ['PRODUCTS', 'ProductID'] }, numeric: ['Rating'] },
  CONTACT_MESSAGES: { primaryKey: 'MessageID', email: ['Email'], phone: ['Phone'] }, NEWSLETTER: { primaryKey: 'SubscriberID', unique: [['Email']], email: ['Email'] },
  SETTINGS: { primaryKey: 'SettingID', unique: [['Key']] }, SHIPMENTS: { primaryKey: 'ShipmentID', foreign: { OrderID: ['ORDERS', 'OrderID'] } },
  NOTIFICATIONS: { primaryKey: 'NotificationID' }, AUTH_AUDIT: { primaryKey: 'AuditID' },
  SESSIONS: { primaryKey: 'SessionID', foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'] } },
  OTP_CHALLENGES: { primaryKey: 'OTPID', numeric: ['Attempts', 'ResendCount'] },
  IDENTITY_VERIFICATIONS: { primaryKey: 'VerificationID', foreign: { CustomerID: ['CUSTOMERS', 'CustomerID'] } },
  WHATSAPP_CONVERSATIONS: { primaryKey: 'ConversationID' },
  WHATSAPP_SESSIONS: { primaryKey: 'WhatsAppSessionID', unique: [['ConversationID']] },
  WHATSAPP_MESSAGES: { primaryKey: 'MessageID', foreign: { ConversationID: ['WHATSAPP_CONVERSATIONS', 'ConversationID'] }, numeric: ['RetryCount'] },
  WHATSAPP_CAMPAIGNS: { primaryKey: 'CampaignID', numeric: ['TotalRecipients', 'Queued', 'Sent', 'Delivered', 'Read', 'Failed'] },
  WHATSAPP_TEMPLATES: { primaryKey: 'TemplateID', unique: [['Name', 'Language']], numeric: ['UsageCount'] }
});

export const SHEET_DEPENDENCIES = Object.freeze({
  CUSTOMERS: [['CART', 'CustomerID'], ['WISHLIST', 'CustomerID'], ['ADDRESSES', 'CustomerID'], ['ORDERS', 'CustomerID'], ['PAYMENTS', 'CustomerID'], ['REVIEWS', 'CustomerID'], ['SESSIONS', 'CustomerID'], ['IDENTITY_VERIFICATIONS', 'CustomerID'], ['WHATSAPP_CONVERSATIONS', 'CustomerID'], ['WHATSAPP_SESSIONS', 'CustomerID'], ['WHATSAPP_MESSAGES', 'CustomerID']],
  PRODUCTS: [['PRODUCT_IMAGES', 'ProductID'], ['INVENTORY', 'ProductID'], ['CART', 'ProductID'], ['WISHLIST', 'ProductID'], ['ORDER_ITEMS', 'ProductID'], ['REVIEWS', 'ProductID']],
  ADDRESSES: [['ORDERS', 'AddressID']], ORDERS: [['ORDER_ITEMS', 'OrderID'], ['PAYMENTS', 'OrderID'], ['ORDER_TRACKING', 'OrderID'], ['SHIPMENTS', 'OrderID'], ['REVIEWS', 'OrderID']]
});

export const COLUMN_ALIASES = Object.freeze({ PAYMENTS: { RazorpayPaymentID: ['TransactionID'] }, CUSTOMERS: { Provider: ['GoogleAuth'] } });
export const REQUIRED_SHEETS = Object.freeze(['PRODUCTS', 'INVENTORY', 'ORDERS', 'CUSTOMERS', 'COUPONS', 'BLOGS', 'NEWSLETTER', 'SETTINGS', 'SESSIONS', 'OTP_CHALLENGES', 'IDENTITY_VERIFICATIONS', 'WHATSAPP_CONVERSATIONS', 'WHATSAPP_SESSIONS', 'WHATSAPP_MESSAGES', 'WHATSAPP_CAMPAIGNS', 'WHATSAPP_TEMPLATES']);
