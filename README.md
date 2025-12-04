# EnergyLogic Platform

A modern web platform I built for selling digital courses and materials on personal development. The platform includes AI-powered psychoanalysis sessions, course management, user dashboards, and integrated payment systems.

## Project Overview

This is a full-stack Next.js application that provides:
- Landing page with product showcases
- User authentication (email/password + Google OAuth)
- Course marketplace and catalog
- Personal dashboard for purchased courses
- Admin panel for content and user management
- Multiple payment integrations (Stripe, Cryptomus)
- Telegram bot integration for support
- Email notifications via Resend
- Session-based authentication with Supabase

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI components
- Lucide icons
- Framer Motion for animations

**Backend:**
- Next.js API routes
- Supabase (PostgreSQL database + Auth)
- Stripe (card payments)
- Cryptomus (crypto payments)
- Daily.co (video sessions)
- Telegram Bot API
- Resend (email delivery)
- PostHog (analytics)

**Infrastructure:**
- Vercel (hosting)
- Supabase (database + storage)

## Project Structure

```
energylogic-site/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── admin/                # Admin operations
│   │   ├── checkout/             # Payment processing
│   │   ├── cryptomus/            # Cryptocurrency payments
│   │   ├── stripe/               # Stripe webhooks
│   │   ├── courses/              # Course data endpoints
│   │   ├── materials/            # Material access (signed URLs)
│   │   ├── purchase/             # Purchase creation
│   │   ├── user/                 # User profile operations
│   │   └── webhooks/             # Third-party webhooks
│   ├── auth/                     # Auth pages (login, signup, etc.)
│   ├── admin/                    # Admin dashboard
│   ├── dashboard/                # User dashboard
│   ├── courses/[id]/             # Individual course pages
│   ├── checkout/                 # Checkout flow
│   ├── catalog/                  # Course catalog
│   ├── about/                    # About page
│   ├── contacts/                 # Contact page
│   ├── reviews/                  # Reviews page
│   ├── terms/                    # Terms of service
│   ├── privacy/                  # Privacy policy
│   ├── disclaimer/               # Disclaimer
│   ├── refund/                   # Refund policy
│   └── page.tsx                  # Homepage
│
├── components/                   # React components
│   ├── admin/                    # Admin panel components
│   ├── auth/                     # Authentication components
│   ├── checkout/                 # Checkout flow components
│   ├── course/                   # Course player and content
│   ├── dashboard/                # Dashboard components
│   ├── home/                     # Landing page sections
│   ├── layout/                   # Layout components (header, footer)
│   ├── modals/                   # Modal dialogs
│   ├── ui/                       # Reusable UI components (shadcn/ui)
│   └── reviews/                  # Review components
│
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Authentication helpers
│   ├── supabase.ts               # Supabase client & helpers
│   ├── stripe.ts                 # Stripe integration
│   ├── session.ts                # Session management
│   ├── documents.ts              # Document operations
│   ├── pricing.ts                # Pricing calculations
│   ├── notify.ts                 # Notification system (Telegram, Email)
│   ├── email-service.ts          # Email templates
│   ├── posthog.ts                # Analytics setup
│   └── utils.ts                  # General utilities
│
├── hooks/                        # Custom React hooks
│   ├── useCourseMaterials.ts     # Course material fetching
│   └── useDocuments.ts           # Document fetching
│
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Global auth state
│
├── types/                        # TypeScript definitions
│   └── index.ts                  # Shared types
│
├── middleware.ts                 # Next.js middleware (auth routing)
│
├── supabase/
│   └── migrations/               # Database migrations
│
├── scripts/                      # Utility scripts
│   ├── check-resend-dns.sh       # DNS verification
│   └── setup-telegram-webhook.sh # Telegram webhook setup
│
└── public/                       # Static assets
```

## Key Features

### Authentication
- Email/password registration and login
- Google OAuth integration
- Password reset flow
- Email verification
- Session-based auth with secure cookies
- Protected routes via middleware

### Course System
- Course catalog with filtering
- Course detail pages with preview
- Secure material access (signed URLs)
- Progress tracking
- Workbook downloads
- Video and audio content support

### Payments
- Stripe integration for card payments
- Cryptomus for cryptocurrency payments
- Payment status tracking
- Webhook handling for payment updates
- Automatic access grant after payment

### User Dashboard
- Purchase history
- Course progress tracking
- Download history
- Issue reporting system
- Callback requests
- Achievement system

### Admin Panel
- User management
- Course/Document management
- Purchase management
- Callback request handling
- Issue management with replies
- Analytics and charts
- Logs viewer

### Support System
- Telegram bot for notifications
- Email notifications via Resend
- Issue tracking with replies
- Callback request system
- User support via Telegram

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (optional)
- Telegram bot token (optional)

### Installation

```bash
git clone <repository-url>
cd energylogic-site
npm install
```

### Environment Variables

Copy `env.example` to `.env.local` and fill in the values:

```bash
cp env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `STRIPE_SECRET_KEY` - Stripe secret key (for payments)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (for notifications)
- `RESEND_API_KEY` - Resend API key (for emails)

See `env.example` for all available configuration options.

### Database Setup

1. Create a Supabase project
2. Run migrations from `supabase/migrations/`
3. Set up Row Level Security (RLS) policies
4. Configure storage buckets for course materials

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Development Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run payments:reconcile  # Reconcile payment records
npm run e2e:payments-access # Test payment access flow
```

## Deployment

The project is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The `vercel.json` file contains deployment configuration.

## API Routes Overview

- `/api/auth/*` - Authentication endpoints
- `/api/admin/*` - Admin operations (protected)
- `/api/checkout/*` - Checkout and payment processing
- `/api/courses/*` - Course data retrieval
- `/api/materials/*` - Secure material access
- `/api/user/*` - User profile operations
- `/api/webhooks/*` - External webhook handlers

## Database Schema

Main tables:
- `users` - User accounts
- `documents` - Course materials
- `purchases` - Purchase records
- `issue_reports` - User support issues
- `callbacks` - Callback requests
- `user_sessions` - Session tracking

See `supabase/migrations/` for full schema.

## Security

- Row Level Security (RLS) enabled on all tables
- Session-based authentication with secure cookies
- Signed URLs for material access
- Rate limiting on API routes
- Input validation on all forms
- CSRF protection via Next.js middleware

## License

Private project - All rights reserved

## Contact

- Email: energylogic@project.ai
- Telegram: @energylogic_callback_bot

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: ✅ Production Ready
