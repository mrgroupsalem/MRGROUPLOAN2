# MR Groups Loan Management System

A professional loan management web application built with Next.js, TypeScript, and Tailwind CSS for MR Groups company.

## 🔴 Live Demo

Production URL: https://your-production-domain.example.com

Update this with your actual hosting URL.

## 🚀 Features

### 📊 Dashboard
- Comprehensive loan statistics overview
- Interactive charts for new loans and disbursements
- Real-time data visualization
- Professional card-based layout

### 💳 Loan Management
- Add, edit, and track loan applications
- Loan status management (active, closed, pending)
- Customer loan history
- Search and filter functionality

### 👥 Customer Management
- Customer database with contact information
- Loan history per customer
- Search and filter customers
- Detailed customer profiles

### 📅 Weekly Batch Management
- Create weekly collection batches (Tuesday, Thursday, Friday)
- Track collection amounts and customer counts
- Detailed batch reports with customer breakdowns
- Collection status tracking

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control (Admin, Staff)
- Secure API routes

### 📈 Reports & Analytics
- Export loan reports (CSV, PDF)
- Generate repayment summaries
- Collection analytics

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Deployment**: Any Node.js hosting (Frontend), Supabase (Backend)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mr-groups-loan-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL schema from `database-schema.sql` in your Supabase SQL editor
   - Update the environment variables with your Supabase credentials

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄 Database Schema

The application uses the following main tables:

- **users**: User accounts and roles
- **customers**: Customer information
- **loans**: Loan details and status
- **repayments**: Payment records
- **batches**: Weekly collection batches
- **batch_customers**: Many-to-many relationship between batches and customers

## 🎨 UI Components

The application features a modern, professional design with:

- Responsive layout that works on all devices
- Clean card-based interface
- Interactive charts and graphs
- Modal dialogs for forms
- Professional color scheme
- Intuitive navigation

## 📱 Responsive Design

- Mobile-first approach
- Sidebar navigation with mobile menu
- Responsive grid layouts
- Touch-friendly interface

## 🔧 API Routes

The application includes RESTful API routes:

- `/api/dashboard/stats` - Dashboard statistics
- `/api/dashboard/charts` - Chart data
- `/api/loans` - Loan management
- `/api/customers` - Customer management
- `/api/batches` - Batch management

## 🚀 Deployment

### Backend (Supabase)
1. Create a new Supabase project
2. Run the database schema
3. Configure Row Level Security policies
4. Set up authentication

## 📊 Sample Data

The application includes mock data for demonstration purposes. Replace with real data by:

1. Updating the API routes to fetch from Supabase
2. Implementing proper authentication
3. Adding data validation and error handling

## 🛡 Security Features

- Row Level Security (RLS) policies
- Input validation and sanitization
- Secure API routes
- Role-based access control

## 📈 Performance

- Server-side rendering with Next.js
- Optimized images and assets
- Efficient database queries
- Caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is proprietary software for MR Groups company.

## 📞 Support

For support and questions, please contact the development team.

---

**Built with ❤️ for MR Groups**
