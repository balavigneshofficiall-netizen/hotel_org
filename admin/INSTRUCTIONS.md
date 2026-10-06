# Premium Modern Restaurant / Hotel Management Admin Dashboard
## Specification & Architecture Guide

Build a **premium modern restaurant/hotel management admin dashboard** for the QR-based food ordering system.

Use:
- **Next.js latest stable (App Router)**
- **TypeScript**
- **Prisma ORM**
- **MySQL**
- **Tailwind CSS**
- **Motion / Framer Motion**
- **Realtime order updates (SSE / WebSocket)**
- **Responsive design (Desktop first, Tablet & Mobile optimized)**

The customer-facing application already uses a premium **deep green + warm cream + gold** visual identity. The admin dashboard must follow the same brand system but use a more professional operational interface.

---

# DESIGN SYSTEM

Use:

```text
Primary Green:   #12372A
Dark Green:      #0B241B
Gold Accent:     #C9A227
Warm Background: #F7F5EF
White:           #FFFFFF
Primary Text:    #171717
Secondary Text:  #6B7280
Success:         #16803C
Warning:         #D97706
Danger:          #DC2626
Border:          #E5E2D9
```

The overall appearance should feel:
**Premium hotel software + modern SaaS dashboard + restaurant POS**

Do NOT make it look like an old-fashioned POS system.

Avoid:
- Excessive gradients
- Huge colorful charts
- Too many borders
- Overly rounded cartoon-style cards
- Unnecessary animations
- Cluttered tables

Use:
- Clean whitespace
- Compact but readable cards
- Subtle shadows
- Soft borders
- Modern typography
- Consistent spacing
- Clear status colors
- Excellent data hierarchy

---

# 1. ADMIN LAYOUT

Desktop layout:

```text
┌───────────────────────────────────────────────────────┐
│ Sidebar │              Top Header                     │
│         ├─────────────────────────────────────────────┤
│         │                                             │
│         │             Main Content                    │
│         │                                             │
│         │                                             │
└───────────────────────────────────────────────────────┘
```

Sidebar:

```text
HOTEL ADMIN
──────────────────

▣ Dashboard

ORDERS
🛎 Live Orders
🍳 Kitchen
🧾 Orders

RESTAURANT
▦ Tables
🍔 Menu
📂 Categories

CUSTOMERS
👥 Customers

FINANCE
💳 Payments
🧾 Bills
📊 Reports

SYSTEM
🔔 Notifications
⚙ Settings
```

Sidebar should be collapsible.

On mobile, convert it into:
- Bottom navigation for the most important sections
- Hamburger drawer for secondary sections

---

# 2. TOP HEADER

Top header should contain:

```text
Good Morning, Admin 👋

[ 🔍 Search ]

[ 🔔 3 ]

[ Hotel Annapoorna ▼ ]

[ Admin Avatar ]
```

Notification dropdown should show:

```text
🔔 New Order #1025
Table 08 placed a new order

🔔 Order #1022 Ready
Table 04 order is ready
```

---

# 3. DASHBOARD HOME

Create a high-quality operational dashboard.

Header:

```text
Dashboard

Monday, 21 September 2026

[ Today ▼ ]
```

KPI cards:

```text
┌───────────────┐
│ Today's Sales │
│ ₹24,580       │
│ ↑ 12.4%       │
└───────────────┘

┌───────────────┐
│ Orders        │
│ 86            │
│ ↑ 8.2%        │
└───────────────┘

┌───────────────┐
│ Customers     │
│ 64            │
│ ↑ 5.1%        │
└───────────────┘

┌───────────────┐
│ Avg Order     │
│ ₹286          │
│ ↑ 3.4%        │
└───────────────┘
```

Use subtle green/gold accents.

---

# 4. LIVE ORDERS — MOST IMPORTANT PAGE

This is the main operational screen.
Create a real-time order management interface.

Use Kanban columns:

```text
NEW
↓
ACCEPTED
↓
PREPARING
↓
READY
↓
SERVED
```

Example:

```text
┌──────────────┐
│ NEW      4   │
├──────────────┤
│ #1025        │
│ Table 08     │
│ 3 Items      │
│              │
│ Chicken      │
│ Biriyani ×2  │
│ Coke ×1      │
│              │
│ ₹441         │
│ 12:24 PM     │
│              │
│ [ Accept ]   │
└──────────────┘
```

When an order arrives:
- Show realtime notification
- Play optional notification sound
- Animate the new order card
- Update count immediately
- No page refresh

---

# 5. ORDER DETAIL DRAWER

Clicking an order should open a right-side drawer.

Show:

```text
Order #1025

Table 08
Customer: Ramesh
Phone: ********4320

────────────────────

2 × Chicken Biriyani
₹180 × 2

1 × Chicken 65
₹160

2 × Coke
₹40 × 2

────────────────────

Subtotal      ₹420
GST            ₹21
Discount        ₹0

TOTAL         ₹441

────────────────────

Order Status

✓ Received
✓ Accepted
● Preparing
○ Ready
○ Served

[ Mark Ready ]
```

Also show:
- Order time
- Customer note
- Special instructions
- Payment status
- Payment method
- Order history

---

# 6. KITCHEN DISPLAY SYSTEM

Create a dedicated **Kitchen View**.
This should be extremely simple.
Use large cards and large typography because kitchen staff may view it from a distance.

```text
NEW              PREPARING             READY

#1025            #1020                 #1018
TABLE 08         TABLE 04              TABLE 02

Chicken          Fried Rice ×2         Biriyani ×1
Biriyani ×2      Chicken 65 ×1         Coke ×1
Coke ×1

12:24 PM         12:18 PM              12:10 PM

[ START ]        [ READY ]             [ SERVED ]
```

Include:
- Order age
- Table number
- Items
- Quantity
- Special instructions
- Status
- Timer

Color the order age subtly:

```text
0–10 min    Normal
10–20 min   Warning
20+ min     Attention
```

Do not use aggressive flashing animations.

---

# 7. TABLE MANAGEMENT

Create a visual table layout.

Example:

```text
Tables

[ All ] [ Available ] [ Occupied ] [ Reserved ]

┌────────┐
│ Table 1│
│ 🟢 Free│
└────────┘

┌────────┐
│ Table 2│
│ 🔴 Busy│
│ ₹850   │
└────────┘

┌────────┐
│ Table 3│
│ 🟢 Free│
└────────┘
```

Each table should show:
- Table number
- Capacity
- Current status
- Current order
- Current bill amount
- QR code

Actions:

```text
View
Generate QR
Download QR
Reset Table
```

---

# 8. QR MANAGEMENT

Create a dedicated QR management section.

Show:

```text
Table 01
QR Active

[ View QR ]
[ Download ]
[ Print ]
```

Allow admin to:
- Generate QR
- Download QR
- Print QR
- Regenerate QR
- Disable QR

QR should encode the table token securely.

---

# 9. MENU MANAGEMENT

Create a modern menu management page.

Top:

```text
Menu

[ Search food... ]

[ + Add Food ]
```

Categories:
- All
- Starters
- Biriyani
- Main Course
- Chinese
- Drinks
- Desserts

Food table/grid:

```text
┌───────┬────────────────┬───────┬───────────┬────────┐
│ Image │ Product        │ Price │ Available │ Action │
├───────┼────────────────┼───────┼───────────┼────────┤
│ 🍛    │ Chicken        │ ₹180  │ 🟢        │ ⋮      │
│       │ Biriyani       │       │           │        │
├───────┼────────────────┼───────┼───────────┼────────┤
│ 🍜    │ Fried Rice     │ ₹150  │ 🟢        │ ⋮      │
└───────┴────────────────┴───────┴───────────┴────────┘
```

---

# 10. ADD / EDIT FOOD

Create a premium form.

Fields:
- Food Image
- Food Name
- Category
- Description
- Price
- Tax %
- Food Type (Vegetarian, Non-Vegetarian, Egg, Vegan)
- Availability
- Featured
- Sort Order

Include image URL / upload with preview.

---

# 11. ORDER HISTORY

Create a powerful searchable order table.

Columns:
- Order ID
- Date
- Table
- Customer
- Items
- Amount
- Payment
- Status
- Actions

Filters:
- Date
- Status
- Payment
- Table
- Customer
- Amount

Search by:
- Order ID
- Phone
- Customer Name

Pagination required.

---

# 12. BILL MANAGEMENT

Create:

```text
Bills

Bill Number
Order Number
Customer
Table
Amount
Payment Status
Generated At
Actions
```

Actions:
- View
- Download PDF
- Print
- Refund

Bill details should be clean and printable.

---

# 13. CUSTOMER MANAGEMENT

Customer page:

```text
Customers

Total Customers: 1,245

Search customers...

┌────────────┬────────────┬──────────┬────────────┐
│ Customer   │ Phone      │ Orders   │ Total Spent│
├────────────┼────────────┼──────────┼────────────┤
│ Ramesh     │ 98****320  │ 14       │ ₹8,420     │
│ Kumar      │ 97****821  │ 8        │ ₹3,250     │
└────────────┴────────────┴──────────┴────────────┘
```

Click customer → customer detail drawer / modal.
Show:
- Profile
- Total orders
- Total spending
- Average order value
- Recent orders
- Bills
- Order history

---

# 14. REPORTS

Create a clean analytics page.

Reports:
- Sales
- Orders
- Popular Foods
- Peak Hours
- Customers
- Payments

Charts:
- Revenue Line chart
- Popular Food Horizontal bar chart
- Order Status Donut chart
- Peak Hours Bar chart

Charts must be minimal and readable. Do not overload the dashboard with charts.

---

# 15. PAYMENTS

Payment dashboard:

```text
Today's Payments

Cash       ₹8,200
UPI        ₹12,420
Card       ₹3,960
Other      ₹0
```

Transaction table:
- Transaction
- Order
- Amount
- Method
- Status
- Time

Statuses:
- PAID
- PENDING
- FAILED
- REFUNDED

---

# 16. NOTIFICATION CENTER

Show system notifications:

```text
Notifications

🔔 New order #1025
Table 08 placed an order

🔔 Order #1020 ready
Table 04

⚠ Low availability
Chicken Biriyani marked unavailable
```

Allow:
- Mark as read
- Mark all as read
- Filter by type

---

# 17. SETTINGS

Sections:
- Restaurant Profile (Restaurant Name, Logo, Phone, Email, Address, GST Number, Currency)
- Tables
- Menu
- Tax
- Payment
- Notifications
- Push Notifications
- Staff
- Roles & Permissions
- Appearance (Primary Color, Accent Color, Logo, Banner)

---

# 18. STAFF & ROLE MANAGEMENT

Create role-based access:
- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`
- `KITCHEN`
- `STAFF`
- `CASHIER`

Permissions:
- View Orders
- Manage Orders
- Manage Menu
- Manage Tables
- Manage Customers
- Manage Bills
- View Reports
- Manage Payments
- Manage Staff
- Settings

---

# 19. REALTIME ARCHITECTURE

Use realtime updates for:
- New Order
- Order Accepted
- Order Preparing
- Order Ready
- Order Served
- Payment Completed
- Table Status

Admin dashboard updates instantly without page refresh.

---

# 20. RESPONSIVE ADMIN

Desktop is the main target.
Also works on:
- Tablet / iPad
- Mobile
Kitchen view is especially optimized for tablets.

---

# 21. TECHNICAL STRUCTURE

```text
app/
├── admin/
│   ├── layout.tsx
│   ├── dashboard/
│   ├── orders/
│   ├── kitchen/
│   ├── tables/
│   ├── menu/
│   ├── customers/
│   ├── bills/
│   ├── payments/
│   ├── reports/
│   ├── notifications/
│   └── settings/
│
├── api/
│   └── admin/
│
components/
├── admin/
```
