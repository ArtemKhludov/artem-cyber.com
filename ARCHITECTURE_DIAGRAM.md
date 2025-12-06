# 🏗️ EnergyLogic Platform Architecture
## Multi-Platform Architecture with Mobile Apps

---

## 📐 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CDN / Edge Layer                                   │
│                    (CloudFlare / Vercel Edge / AWS CloudFront)               │
│                         - DDoS Protection                                    │
│                         - SSL/TLS Termination                                │
│                         - Caching                                            │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌─────────▼─────────┐   ┌────────▼────────┐
│   Web App      │    │  Mobile Apps       │   │  Admin Panel   │
│  (Next.js)     │    │  (React Native)   │   │  (Next.js)     │
│                │    │                    │   │                │
│ energylogic-   │    │  iOS + Android     │   │  admin.        │
│  ai.com        │    │  Native Apps       │   │  energylogic   │
│                │    │                    │   │                │
│ - SSR Pages    │    │ - Offline Support  │   │ - Dashboard    │
│ - Client App   │    │ - Push Notifications│  │ - Analytics    │
│ - SEO Optimized│    │ - Biometric Auth   │   │ - User Mgmt    │
└───────┬────────┘    └─────────┬───────────┘   └────────┬───────┘
        │                     │                        │
        │                     │                        │
        └─────────────────────┼────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   API Gateway      │
                    │   (Next.js API)    │
                    │                    │
                    │  ┌──────────────┐  │
                    │  │ Auth Layer   │  │
                    │  │ - Sessions   │  │
                    │  │ - JWT        │  │
                    │  │ - OAuth      │  │
                    │  └──────────────┘  │
                    │  ┌──────────────┐  │
                    │  │ Rate Limit   │  │
                    │  │ - IP based   │  │
                    │  │ - User based │  │
                    │  └──────────────┘  │
                    │  ┌──────────────┐  │
                    │  │ Validation   │  │
                    │  │ - Zod schemas│  │
                    │  │ - Sanitize   │  │
                    │  └──────────────┘  │
                    │  ┌──────────────┐  │
                    │  │ CORS Config  │  │
                    │  │ - Web origins│  │
                    │  │ - Mobile apps│  │
                    │  └──────────────┘  │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐  ┌────────▼────────┐
│   Supabase     │   │   External      │  │   Services      │
│                │   │   Services      │  │                 │
│  ┌──────────┐ │   │                 │  │  ┌───────────┐  │
│  │  Auth     │ │   │  ┌───────────┐  │  │  │  Stripe   │  │
│  │  - Users  │ │   │  │ Telegram │  │  │  │  Payments │  │
│  │  - Roles  │ │   │  │  Bot API │  │  │  └───────────┘  │
│  └──────────┘ │   │  └───────────┘  │  │  ┌───────────┐  │
│  ┌──────────┐ │   │  ┌───────────┐  │  │  │ Cryptomus │  │
│  │ Database │ │   │  │  Resend  │  │  │  │  Crypto   │  │
│  │ PostgreSQL│ │   │  │  Email  │  │  │  └───────────┘  │
│  └──────────┘ │   │  └───────────┘  │  │  ┌───────────┐  │
│  ┌──────────┐ │   │  ┌───────────┐  │  │  │  Daily.co │  │
│  │ Storage  │ │   │  │  PostHog  │  │  │  │   Video   │  │
│  │  S3-like │ │   │  │ Analytics│  │  │  └───────────┘  │
│  └──────────┘ │   │  └───────────┘  │  │  ┌───────────┐  │
│  ┌──────────┐ │   │  ┌───────────┐  │  │  │  Google   │  │
│  │ Realtime │ │   │  │  Sentry   │  │  │  │   OAuth  │  │
│  │ WebSocket│ │   │  │  Errors   │  │  │  └───────────┘  │
│  └──────────┘ │   │  └───────────┘  │  └─────────────────┘
└───────────────┘   └─────────────────┘
```

---

## 🔄 API Versioning Structure

```
/api
│
├── /v1                    # Mobile API (Stable)
│   ├── /auth
│   │   ├── POST /login          # Returns JWT
│   │   ├── POST /refresh        # Refresh token
│   │   ├── POST /logout         # Revoke token
│   │   └── POST /register       # Sign up
│   │
│   ├── /users
│   │   ├── GET  /me             # Current user
│   │   ├── PUT  /me             # Update profile
│   │   └── GET  /me/purchases   # User purchases
│   │
│   ├── /courses
│   │   ├── GET  /               # List courses
│   │   ├── GET  /:id            # Course details
│   │   └── GET  /:id/materials  # Course materials
│   │
│   ├── /purchases
│   │   ├── GET  /               # User purchases
│   │   └── POST /               # Create purchase
│   │
│   └── /notifications
│       ├── GET  /               # Get notifications
│       └── PUT  /:id/read       # Mark as read
│
├── /v2                    # Future API (Backward compatible)
│   └── ...
│
└── /web                   # Web-specific (No versioning)
    ├── /auth
    │   ├── GET  /session        # Session check
    │   └── POST /oauth/google    # OAuth callback
    │
    └── /admin
        └── ...                  # Admin endpoints
```

---

## 📱 Mobile App Architecture Detail

```
┌─────────────────────────────────────────────────────────┐
│              Mobile App (React Native)                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Presentation Layer                  │   │
│  │  - Screens (React Native)                       │   │
│  │  - Components (Reusable UI)                     │   │
│  │  - Navigation (React Navigation)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Business Logic Layer               │   │
│  │  - State Management (Zustand/Redux)             │   │
│  │  - API Client (Axios)                           │   │
│  │  - Caching (React Query)                         │   │
│  │  - Offline Support (AsyncStorage + Queue)       │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Security Layer                      │   │
│  │  - Secure Storage (Keychain/Keystore)           │   │
│  │  - Token Management                             │   │
│  │  - Certificate Pinning (Optional)                │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Native Modules                      │   │
│  │  - Push Notifications (FCM/APNs)                │   │
│  │  - Biometric Auth (FaceID/TouchID)              │   │
│  │  - File System                                  │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ HTTPS + JWT Bearer Token
                            │
                ┌───────────▼───────────┐
                │   API Gateway         │
                │   /api/v1/*           │
                └───────────────────────┘
```

---

## 🔐 Authentication Flow Comparison

### Web App Flow (Session-based)
```
User → Login Form
  ↓
POST /api/auth/login
  ↓
Server validates credentials
  ↓
Creates session in database
  ↓
Sets HttpOnly cookie (session_token)
  ↓
Returns success
  ↓
Browser stores cookie automatically
  ↓
All requests include cookie
  ↓
Server validates session on each request
```

### Mobile App Flow (JWT-based)
```
User → Login Screen
  ↓
POST /api/v1/auth/login
  ↓
Server validates credentials
  ↓
Generates JWT access token (15min)
  ↓
Generates refresh token (7 days)
  ↓
Returns { accessToken, refreshToken, user }
  ↓
App stores tokens in Keychain/Keystore
  ↓
All requests: Authorization: Bearer {accessToken}
  ↓
On 401: POST /api/v1/auth/refresh
  ↓
Returns new accessToken
  ↓
On refresh fail: Redirect to login
```

---

## 🔄 Data Flow: Mobile App Purchase

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       │ 1. User selects course
       │
       │ 2. POST /api/v1/purchases
       │    Authorization: Bearer {token}
       │    Body: { courseId, paymentMethod }
       │
       ▼
┌─────────────────┐
│  API Gateway    │
│  - Validate JWT │
│  - Rate limit   │
│  - CORS check   │
└──────┬──────────┘
       │
       │ 3. Create payment intent
       │
       ▼
┌─────────────────┐
│   Stripe API    │
│  - Create intent│
│  - Return client│
│    secret       │
└──────┬──────────┘
       │
       │ 4. Return payment details
       │
       ▼
┌─────────────┐
│ Mobile App  │
│  - Show     │
│    payment  │
│    form     │
└──────┬──────┘
       │
       │ 5. User confirms payment
       │
       │ 6. Stripe SDK processes payment
       │
       │ 7. Webhook: POST /api/webhooks/stripe
       │
       ▼
┌─────────────────┐
│   Supabase      │
│  - Update       │
│    purchase     │
│  - Grant access │
│  - Send         │
│    notification │
└─────────────────┘
```

---

## 🗄️ Database Schema (Key Tables)

```
users
├── id (UUID, PK)
├── email (unique)
├── password_hash
├── role (user/admin)
├── phone
├── telegram_username
└── created_at

user_sessions          # Web sessions
├── session_token (PK)
├── user_id (FK)
├── expires_at
├── last_activity
├── ip_address
└── user_agent

refresh_tokens         # Mobile refresh tokens
├── token (PK)
├── user_id (FK)
├── device_id
├── expires_at
└── revoked_at

mobile_devices         # Push notification tokens
├── id (PK)
├── user_id (FK)
├── device_id (unique)
├── platform (ios/android)
├── fcm_token / apns_token
└── last_active

purchases
├── id (PK)
├── user_id (FK)
├── product_id
├── amount
├── status
└── created_at

course_access
├── id (PK)
├── user_id (FK)
├── course_id
├── granted_at
├── revoked_at
└── source
```

---

## 🚀 Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────┐
│              AWS / Vercel                       │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Web App (Next.js)                       │  │
│  │  - Vercel / AWS Amplify                  │  │
│  │  - Auto-scaling                          │  │
│  │  - Edge functions                        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  API Layer (Next.js API Routes)          │  │
│  │  - Same deployment as web               │  │
│  │  - Serverless functions                 │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Mobile App Backend                     │  │
│  │  - Same API, different endpoints        │  │
│  │  - /api/v1/*                            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────┐      ┌────────▼────────┐
│   Supabase   │      │   External     │
│   (Managed)  │      │   Services     │
│              │      │                │
│  - Database  │      │  - Stripe      │
│  - Auth      │      │  - FCM/APNs    │
│  - Storage   │      │  - Resend      │
│  - Realtime  │      │  - PostHog     │
└──────────────┘      └────────────────┘
```

---

## 🔄 Git Branching Strategy

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/web-seo-optimization
  │     ├── feature/mobile-api-v1
  │     ├── feature/jwt-authentication
  │     └── feature/push-notifications
  │
  ├── release/v1.0.0 (pre-production)
  │     │
  │     └── hotfix/security-patch
  │
  └── mobile/ios-v1.0
        │
        └── mobile/android-v1.0
```

### Branch Protection Rules

- `main`: Require PR review, status checks, no direct pushes
- `develop`: Require PR review, allow fast-forward merges
- `release/*`: Require PR review, deploy to staging
- `feature/*`: Allow direct pushes, require PR to develop

---

## 📦 Monorepo Structure (Recommended)

```
energylogic-platform/
│
├── apps/
│   ├── website/              # Next.js web app
│   │   ├── app/
│   │   ├── components/
│   │   └── package.json
│   │
│   ├── mobile/               # React Native app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── api/
│   │   └── package.json
│   │
│   └── admin/                # Admin panel (optional)
│       └── ...
│
├── packages/
│   ├── shared/               # Shared code
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── auth.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── api-client/           # API client for mobile
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── courses.ts
│   │   │   └── purchases.ts
│   │   └── package.json
│   │
│   └── ui/                   # Shared UI components
│       └── ...
│
├── packages/
│   └── config/              # Shared configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── package.json             # Root workspace
├── turbo.json               # Turborepo config
└── .github/workflows/       # CI/CD
```

---

## 🔗 Integration Points

### 1. Web ↔ Mobile Data Sync

```
Web App (Session)          Mobile App (JWT)
     │                            │
     │                            │
     └──────────┬─────────────────┘
                │
         ┌──────▼──────┐
         │  Supabase   │
         │  Database   │
         └─────────────┘

Both platforms share:
- User accounts
- Purchase history
- Course access
- Preferences
```

### 2. Real-time Updates

```
Supabase Realtime
     │
     ├── Web App (WebSocket)
     │   - Live notifications
     │   - Course updates
     │
     └── Mobile App (WebSocket)
         - Push notifications
         - Sync data
```

### 3. Push Notifications Flow

```
Event (Purchase, Reply, etc.)
     │
     ├── Supabase Trigger
     │
     ├── API: Create Notification
     │
     ├── Check User Devices
     │
     ├── Send FCM (Android)
     │
     ├── Send APNs (iOS)
     │
     └── Mobile App Receives
         - Show notification
         - Update badge
         - Navigate to screen
```

---

## 🛡️ Security Layers

```
Layer 1: Edge/CDN
  - DDoS protection
  - SSL/TLS
  - WAF rules

Layer 2: API Gateway
  - Rate limiting
  - CORS validation
  - Request validation
  - Authentication

Layer 3: Application
  - Authorization checks
  - Input sanitization
  - SQL injection prevention
  - XSS protection

Layer 4: Database
  - Row-level security
  - Encrypted connections
  - Backup encryption
```

---

## 📊 Scalability Considerations

### Current (Monolithic)
- ✅ Simple deployment
- ✅ Shared codebase
- ⚠️ Limited scalability
- ⚠️ Single point of failure

### Future (Microservices - if needed)
```
API Gateway
    │
    ├── Auth Service
    ├── Course Service
    ├── Payment Service
    ├── Notification Service
    └── Analytics Service
```

**When to migrate:**
- > 100k users
- > 1M requests/day
- Need independent scaling
- Multiple teams

---

## 🎯 Next Steps

1. **Week 1-2:** Implement security fixes
2. **Week 3-4:** Create `/api/v1` endpoints
3. **Week 5-6:** Implement JWT authentication
4. **Week 7-8:** Set up mobile app project
5. **Week 9-12:** Develop mobile app MVP
6. **Week 13-16:** Push notifications
7. **Week 17-20:** Testing & optimization

---

**Last Updated:** December 2024

