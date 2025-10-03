# 🌐 Конфигурация доменов для разработки и продакшна

## 📋 Обзор

Проект настроен для автоматической работы на разных окружениях:
- **Локальная разработка**: `http://localhost:3000`
- **Продакшн**: `https://www.energylogic-ai.com`

## 🔧 Переменные окружения

### Для локальной разработки (.env.local):
```bash
# Базовые URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/google/callback
```

### Для продакшна (Vercel Environment Variables):
```bash
# Базовые URL
NEXT_PUBLIC_APP_URL=https://www.energylogic-ai.com
NEXT_PUBLIC_SITE_URL=https://www.energylogic-ai.com
APP_URL=https://www.energylogic-ai.com

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://www.energylogic-ai.com/api/auth/oauth/google/callback
```

## 🚀 Автоматическое определение окружения

Код автоматически определяет окружение и использует правильные URL:

### Frontend (браузер):
```typescript
// Автоматически использует window.location.origin
const baseUrl = window.location.origin
```

### Backend (сервер):
```typescript
// Приоритет переменных окружения:
// 1. NEXT_PUBLIC_SITE_URL
// 2. NEXT_PUBLIC_APP_URL  
// 3. APP_URL
// 4. VERCEL_URL (автоматически)
// 5. localhost:3000 (development)
// 6. energylogic-ai.com (production fallback)
```

## 🔐 Google OAuth настройка

### В Google Cloud Console добавьте:

**Authorized redirect URIs:**
- `http://localhost:3000/api/auth/oauth/google/callback` (разработка)
- `https://www.energylogic-ai.com/api/auth/oauth/google/callback` (продакшн)

**Authorized JavaScript origins:**
- `http://localhost:3000` (разработка)
- `https://www.energylogic-ai.com` (продакшн)

## 📧 Email настройка

### Resend домен:
- **Домен**: `energylogic-ai.com`
- **From email**: `noreply@energylogic-ai.com`

### DNS записи в Namecheap:
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT  
Name: resend._domainkey
Value: [DKIM ключ от Resend]

Type: CNAME
Name: resend
Value: resend.com
```

## 🔄 CSRF защита

Автоматически разрешены origins:
- `http://localhost:3000` (development)
- `http://localhost:3001` (development)
- `https://www.energylogic-ai.com` (production)
- Vercel preview URLs

## 🧪 Тестирование

### Локально:
```bash
npm run dev
# Откройте http://localhost:3000
```

### Продакшн:
```bash
npm run build
npm run start
# Или деплой на Vercel
```

## ✅ Проверочный список

- [ ] Google OAuth работает на localhost
- [ ] Google OAuth работает на продакшне  
- [ ] Email отправляется с правильного домена
- [ ] CSRF защита не блокирует запросы
- [ ] Все redirect URI настроены в Google Console
- [ ] DNS записи для email настроены
- [ ] Vercel environment variables установлены

## 🐛 Отладка

### Проверить текущие URL:
```javascript
// В браузере
console.log('Current origin:', window.location.origin)

// На сервере
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
```

### Логи OAuth:
```bash
# Проверить логи в Vercel
vercel logs --follow
```

## 📝 Примечания

- Все hardcoded localhost заменены на динамическое определение
- Поддержка портов 3000 и 3001 для разработки
- Автоматический fallback на продакшн домен
- Совместимость с Vercel preview deployments
