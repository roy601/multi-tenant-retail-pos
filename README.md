# Mobile POS - Advanced Point of Sale System

Mobile POS is a comprehensive, desktop-ready Point of Sale (POS) application built with **Next.js**, **Supabase**, and **Electron**. It provides small to medium-sized businesses with a robust platform for managing sales, inventory, and finances with a premium, user-friendly interface.

## 🚀 Features

### 🛒 Point of Sale (POS)
- **Fluid Checkout**: Rapidly add products via barcode scanning or manual search.
- **Hold Sale**: Suspend transactions and resume them later from the "Held Sales" menu.
- **Flexible Payments**: Support for Cash, Card, Bank Transfer, and Mobile Banking (bKash, Nagad, etc.).
- **Customer Integration**: Easily select from existing customers or add new ones on the fly.
- **Invoice Printing**: Professional invoice generation with auto-print functionality for Electron.
- **Email Invoices**: Automatically send digital receipts to customers via SMTP.

### 📦 Inventory & Products
- **Real-time Tracking**: Monitor stock levels across various shops/locations.
- **Product Variants**: Manage products with multiple color and model variants.
- **Purchase Management**: Track supplier purchases and update inventory automatically.
- **Barcode Support**: Full integration for scanning and generating product barcodes.

### 📊 Financial Management
- **Day Cashbook**: Real-time tracking of daily cash flow, expenses, and income.
- **Ledger Groups**: Detailed financial reporting with support for multi-shop accounting.
- **Expense Tracking**: Categorize and monitor business expenses.
- **Income Monitoring**: Track revenue across different payment methods.

### 📈 Analytics & Reporting
- **Interactive Dashboards**: Visualize sales trends, top products, and customer behavior.
- **Inventory Analytics**: Identify low-stock items and high-value inventory.
- **Sales Reports**: Comprehensive breakdown of sales performance over custom date ranges.

### 🔐 Security & Roles
- **Multi-Role Access**: Dedicated views and permissions for Owners and Managers.
- **Secure Authentication**: Powerded by Supabase Auth with protected routes and role-based logic.

## 🛠️ Technology Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) & MySQL (for ledger/backup)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **State Management**: React Hooks & Context API
- **Desktop Wrapper**: [Electron](https://www.electronjs.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- A Supabase Project

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/mobile-pos.git
   cd mobile-pos
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
   Or with npm:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your credentials:
   - **Supabase**: Get your URL and Anon Key from [Supabase Dashboard](https://supabase.com/)
   - **Database**: Configure your MySQL connection details
   - **Optional**: Add SMTP credentials if you want email invoice functionality

   See [SECURITY.md](./SECURITY.md) for security best practices and [.env.example](./.env.example) for all available options.

### Running the App
- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Electron (Desktop)**:
  ```bash
  npm run electron:dev
  ```

### Building for Production
- **Next.js Build**:
  ```bash
  npm run build
  ```
- **Electron Distribution (Windows .exe)**:
  ```bash
  npm run electron:build
  ```

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔐 Privacy & Security
This project is designed with security and privacy in mind. All sensitive data (API keys, database passwords, etc.) should be stored in environment variables and never committed to the repository. See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

## 🤝 Contributing
We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.
