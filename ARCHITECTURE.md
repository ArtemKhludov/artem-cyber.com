# Архитектура разделения на два приложения для AWS

## 🎯 Цель

Разделить текущий проект на:
1. **Публичный сайт** (energylogic-site) - для просмотра информации о курсах, каталог, landing page
2. **Основное приложение** (energylogic-app) - дашборд пользователя, админ-панель, сложная функциональность

## 📐 Рекомендуемая архитектура

### Вариант 1: Monorepo с разделением приложений (РЕКОМЕНДУЕТСЯ)

```
energylogic-platform/
├── apps/
│   ├── website/              # Публичный сайт (Next.js)
│   │   ├── app/
│   │   │   ├── page.tsx      # Landing page
│   │   │   ├── catalog/      # Каталог курсов
│   │   │   ├── courses/[id]/ # Страницы курсов
│   │   │   ├── about/         # О проекте
│   │   │   └── contacts/      # Контакты
│   │   └── components/
│   │       └── home/          # Компоненты landing
│   │
│   └── app/                   # Основное приложение (Next.js)
│       ├── app/
│       │   ├── dashboard/    # Пользовательский дашборд
│       │   ├── admin/         # Админ-панель
│       │   ├── auth/          # Авторизация
│       │   └── api/           # API endpoints
│       └── components/
│           ├── dashboard/
│           └── admin/
│
├── packages/
│   ├── shared/                # Общие библиотеки
│   │   ├── lib/
│   │   │   ├── supabase.ts   # Supabase клиент
│   │   │   ├── auth.ts        # Авторизация
│   │   │   ├── stripe.ts      # Stripe интеграция
│   │   │   └── types.ts       # Общие типы
│   │   └── components/        # Переиспользуемые компоненты
│   │       └── ui/
│   │
│   └── api-client/            # API клиент для связи между приложениями
│       ├── src/
│       │   ├── courses.ts    # API для курсов
│       │   ├── users.ts       # API для пользователей
│       │   └── purchases.ts   # API для покупок
│       └── package.json
│
├── package.json               # Root package.json (workspaces)
├── turbo.json                 # Turborepo конфигурация
└── .github/workflows/         # CI/CD
```

**Преимущества:**
- ✅ Общий код в `packages/shared`
- ✅ Единая система сборки
- ✅ Проще синхронизировать изменения
- ✅ Общие типы и утилиты

**Недостатки:**
- ⚠️ Нужно настроить monorepo (Turborepo или Nx)

---

### Вариант 2: Отдельные репозитории с общим API

```
energylogic-website/          # Репозиторий 1
├── app/
│   ├── page.tsx
│   ├── catalog/
│   └── courses/[id]/
└── lib/
    └── api-client.ts          # Клиент для backend API

energylogic-app/              # Репозиторий 2
├── app/
│   ├── dashboard/
│   ├── admin/
│   └── api/                   # Backend API
└── lib/
    └── supabase.ts

energylogic-api/              # Репозиторий 3 (опционально)
└── src/
    ├── routes/
    │   ├── courses.ts
    │   ├── users.ts
    │   └── purchases.ts
    └── lib/
        └── supabase.ts
```

**Преимущества:**
- ✅ Полная независимость проектов
- ✅ Разные команды могут работать независимо
- ✅ Разные циклы релизов

**Недостатки:**
- ⚠️ Дублирование кода
- ⚠️ Сложнее синхронизировать изменения
- ⚠️ Нужно поддерживать API контракты

---

## 🔗 Связь между приложениями

### Способ 1: Прямое подключение к Supabase (ТЕКУЩИЙ)

Оба приложения подключаются напрямую к Supabase:

```
┌─────────────┐         ┌─────────────┐
│   Website   │────────▶│   Supabase  │
└─────────────┘         └─────────────┘
                              ▲
┌─────────────┐                │
│     App     │────────────────┘
└─────────────┘
```

**Плюсы:**
- Простота реализации
- Нет дополнительного слоя
- Быстрая разработка

**Минусы:**
- Нет централизованной бизнес-логики
- Сложнее контролировать доступ
- Дублирование логики

---

### Способ 2: Backend API (РЕКОМЕНДУЕТСЯ для масштабирования)

Основное приложение предоставляет API, которое использует публичный сайт:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Website   │────────▶│  Backend    │────────▶│   Supabase  │
│             │  HTTP   │    API      │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
                              ▲
┌─────────────┐                │
│     App     │────────────────┘
│  (Dashboard)│
└─────────────┘
```

**Плюсы:**
- Централизованная бизнес-логика
- Единая точка входа для данных
- Легче контролировать доступ и кэширование
- Можно добавить rate limiting, мониторинг

**Минусы:**
- Дополнительный слой
- Нужно поддерживать API контракты

---

### Способ 3: Гибридный подход

Публичный сайт → Backend API → Supabase
Основное приложение → Supabase напрямую

```
┌─────────────┐         ┌─────────────┐
│   Website   │────────▶│  Backend    │──┐
└─────────────┘         │    API      │  │
                       └─────────────┘  │
                                        ▼
┌─────────────┐         ┌─────────────┐
│     App    │────────▶│   Supabase  │
└─────────────┘         └─────────────┘
```

**Плюсы:**
- Гибкость
- Публичный сайт изолирован
- Основное приложение работает напрямую

---

## ☁️ AWS Инфраструктура

### Рекомендуемая архитектура на AWS

```
┌─────────────────────────────────────────────────────────┐
│                    AWS CloudFront                        │
│              (CDN для статики и кэширования)            │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│  Website       │   │  App           │
│  (Next.js)     │   │  (Next.js)     │
│                │   │                │
│  - Landing     │   │  - Dashboard    │
│  - Catalog     │   │  - Admin        │
│  - Course info │   │  - API         │
└───────┬────────┘   └───────┬────────┘
        │                    │
        │                    │
┌───────▼────────────────────▼────────┐
│     AWS API Gateway (опционально)   │
│     или прямой доступ к Supabase    │
└───────┬──────────────────────────────┘
        │
┌───────▼────────┐
│   Supabase     │
│   (PostgreSQL) │
│   или          │
│   AWS RDS      │
└────────────────┘
```

### Детальная схема развертывания

#### 1. Публичный сайт (Website)

**Вариант A: AWS Amplify (РЕКОМЕНДУЕТСЯ для Next.js)**
```yaml
Service: AWS Amplify
- Автоматический CI/CD из Git
- SSR поддержка
- Edge functions для API routes
- CDN встроен
- SSL автоматически
```

**Вариант B: AWS ECS/Fargate**
```yaml
Service: AWS ECS (Fargate)
- Docker контейнеры
- Application Load Balancer
- Auto Scaling
- CloudWatch мониторинг
```

**Вариант C: AWS Lambda + CloudFront**
```yaml
Service: AWS Lambda@Edge
- Serverless
- Очень быстрый
- Ограничения по времени выполнения
```

#### 2. Основное приложение (App)

**Рекомендуется: AWS ECS/Fargate или AWS App Runner**

```yaml
Service: AWS ECS (Fargate)
Container:
  - Next.js приложение
  - API routes
  - Admin panel
  - Dashboard

Infrastructure:
  - Application Load Balancer
  - Auto Scaling (2-10 instances)
  - CloudWatch Logs
  - Secrets Manager (для env vars)
```

#### 3. База данных

**Вариант A: Оставить Supabase**
```yaml
- Уже настроена
- Управляемый сервис
- Встроенная аутентификация
- Storage для файлов
```

**Вариант B: Миграция на AWS RDS**
```yaml
Service: AWS RDS (PostgreSQL)
- Полный контроль
- VPC изоляция
- Автоматические бэкапы
- Multi-AZ для высокой доступности
```

#### 4. Хранилище файлов

**Вариант A: Supabase Storage**
```yaml
- Уже используется
- Простая интеграция
```

**Вариант B: AWS S3**
```yaml
Service: AWS S3
- Высокая надежность
- CloudFront для CDN
- Lifecycle policies
- Versioning
```

#### 5. Мониторинг и логи

```yaml
Services:
  - CloudWatch Logs (логи приложений)
  - CloudWatch Metrics (метрики)
  - X-Ray (трейсинг запросов)
  - CloudWatch Alarms (алерты)
```

---

## 🚀 План миграции

### Этап 1: Подготовка (1-2 недели)

1. **Создать monorepo структуру** (если выбран вариант 1)
   ```bash
   # Установить Turborepo
   npm install -g turbo
   
   # Создать структуру
   mkdir energylogic-platform
   cd energylogic-platform
   npm init -y
   ```

2. **Разделить код**
   - Переместить публичные страницы в `apps/website`
   - Оставить дашборд/админку в `apps/app`
   - Вынести общий код в `packages/shared`

3. **Настроить общий API клиент**
   - Создать `packages/api-client`
   - Определить интерфейсы API

### Этап 2: Развертывание на AWS (2-3 недели)

1. **Настроить AWS Amplify для Website**
   ```bash
   # Установить AWS CLI
   aws configure
   
   # Создать Amplify app
   aws amplify create-app --name energylogic-website
   ```

2. **Настроить ECS для App**
   ```bash
   # Создать ECR репозиторий
   aws ecr create-repository --repository-name energylogic-app
   
   # Создать ECS кластер
   aws ecs create-cluster --cluster-name energylogic-cluster
   ```

3. **Настроить домены и SSL**
   - Route 53 для DNS
   - ACM для SSL сертификатов

### Этап 3: Тестирование и оптимизация (1-2 недели)

1. Настроить мониторинг
2. Настроить алерты
3. Оптимизировать производительность
4. Настроить кэширование

---

## 📦 Структура пакетов (Monorepo)

### Root `package.json`

```json
{
  "name": "energylogic-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "website:dev": "turbo run dev --filter=website",
    "app:dev": "turbo run dev --filter=app"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `packages/shared/package.json`

```json
{
  "name": "@energylogic/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.55.0"
  }
}
```

### `apps/website/package.json`

```json
{
  "name": "energylogic-website",
  "dependencies": {
    "@energylogic/shared": "*",
    "@energylogic/api-client": "*",
    "next": "^15.5.3",
    "react": "19.1.0"
  }
}
```

---

## 🔐 Безопасность и доступ

### Разделение доступа

1. **Публичный сайт**
   - Только чтение данных о курсах
   - Публичные API endpoints
   - Rate limiting через CloudFront

2. **Основное приложение**
   - Полный доступ к Supabase
   - Админ-панель с защитой
   - API с аутентификацией

### API Authentication

```typescript
// packages/shared/lib/api-auth.ts
export async function authenticateRequest(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Unauthorized')
  
  // Проверка токена через Supabase
  const { data, error } = await supabase.auth.getUser(token)
  if (error) throw new Error('Invalid token')
  
  return data.user
}
```

---

## 💰 Оценка стоимости AWS

### Минимальная конфигурация (для старта)

- **AWS Amplify** (Website): ~$15-30/месяц
- **ECS Fargate** (App): ~$30-50/месяц (2 tasks)
- **RDS** (если мигрируем): ~$50-100/месяц
- **S3** (storage): ~$5-10/месяц
- **CloudWatch**: ~$10-20/месяц
- **Data Transfer**: ~$10-30/месяц

**Итого: ~$120-240/месяц**

### Production конфигурация

- **AWS Amplify**: ~$50-100/месяц
- **ECS Fargate**: ~$200-500/месяц (auto-scaling)
- **RDS Multi-AZ**: ~$200-400/месяц
- **S3 + CloudFront**: ~$50-100/месяц
- **CloudWatch + X-Ray**: ~$50-100/месяц
- **Data Transfer**: ~$50-200/месяц

**Итого: ~$600-1400/месяц**

---

## ✅ Рекомендации

1. **Начать с Monorepo** (Вариант 1) - проще поддерживать
2. **Использовать AWS Amplify для Website** - быстрый старт
3. **ECS Fargate для App** - гибкость и масштабируемость
4. **Оставить Supabase** на начальном этапе - меньше миграций
5. **Постепенная миграция** - не все сразу

---

## 📝 Следующие шаги

1. Решить, какой вариант архитектуры выбрать
2. Создать структуру monorepo (если выбран вариант 1)
3. Разделить код на два приложения
4. Настроить CI/CD
5. Развернуть на AWS поэтапно

---

## 🔗 Полезные ссылки

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [AWS Amplify Next.js](https://docs.amplify.aws/guides/hosting/nextjs/q/platform/js/)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [Next.js Deployment on AWS](https://nextjs.org/docs/deployment)

