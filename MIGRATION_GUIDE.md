# Пошаговое руководство по миграции

## 🎯 Быстрый старт: Создание Monorepo структуры

### Шаг 1: Подготовка структуры

```bash
# Создать новую директорию для monorepo
mkdir energylogic-platform
cd energylogic-platform

# Инициализировать root package.json
npm init -y

# Установить Turborepo
npm install -D turbo

# Создать структуру директорий
mkdir -p apps/website apps/app packages/shared packages/api-client
```

### Шаг 2: Настройка root package.json

```json
{
  "name": "energylogic-platform",
  "version": "1.0.0",
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
    "app:dev": "turbo run dev --filter=app",
    "website:build": "turbo run build --filter=website",
    "app:build": "turbo run build --filter=app"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### Шаг 3: Создать turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

---

## 📦 Создание packages/shared

### package.json

```json
{
  "name": "@energylogic/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./supabase": "./src/lib/supabase.ts",
    "./auth": "./src/lib/auth.ts",
    "./types": "./src/types/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.55.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### src/index.ts

```typescript
// Экспорт всех общих утилит
export * from './lib/supabase'
export * from './lib/auth'
export * from './types'
```

### src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export { createClient }
```

### src/types/index.ts

```typescript
// Общие типы для всех приложений
export interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
}

export interface Course {
  id: string
  title: string
  description: string | null
  price: number
  // ... остальные поля
}

export interface Purchase {
  id: string
  user_id: string
  product_id: string
  amount: number
  status: 'completed' | 'pending' | 'cancelled'
  // ... остальные поля
}
```

---

## 🌐 Создание apps/website

### package.json

```json
{
  "name": "energylogic-website",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@energylogic/shared": "*",
    "next": "^15.5.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^4"
  }
}
```

### Структура apps/website

```
apps/website/
├── app/
│   ├── page.tsx              # Landing page
│   ├── catalog/
│   │   └── page.tsx          # Каталог курсов
│   ├── courses/
│   │   └── [id]/
│   │       └── page.tsx      # Страница курса
│   ├── about/
│   │   └── page.tsx
│   ├── contacts/
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── home/                 # Компоненты landing
│   ├── catalog/              # Компоненты каталога
│   └── layout/               # Header, Footer
├── lib/
│   └── api-client.ts         # Клиент для API (если нужен)
└── package.json
```

### Пример использования shared пакета

```typescript
// apps/website/app/catalog/page.tsx
import { supabase } from '@energylogic/shared/supabase'
import type { Course } from '@energylogic/shared/types'

export default async function CatalogPage() {
  const { data: courses } = await supabase
    .from('documents')
    .select('*')
    .eq('type', 'mini_course')
  
  return (
    <div>
      {courses?.map((course: Course) => (
        <div key={course.id}>{course.title}</div>
      ))}
    </div>
  )
}
```

---

## 📱 Создание apps/app

### package.json

```json
{
  "name": "energylogic-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@energylogic/shared": "*",
    "next": "^15.5.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^4"
  }
}
```

### Структура apps/app

```
apps/app/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Пользовательский дашборд
│   ├── admin/
│   │   └── page.tsx          # Админ-панель
│   ├── auth/
│   │   ├── login/
│   │   └── signup/
│   ├── api/                  # API endpoints
│   │   ├── courses/
│   │   ├── users/
│   │   └── purchases/
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   ├── admin/
│   └── auth/
└── package.json
```

---

## 🔄 Миграция существующего кода

### Шаг 1: Копирование файлов

```bash
# Из текущего проекта в website
cp -r app/page.tsx apps/website/app/
cp -r app/catalog apps/website/app/
cp -r app/courses apps/website/app/
cp -r app/about apps/website/app/
cp -r app/contacts apps/website/app/
cp -r components/home apps/website/components/
cp -r components/catalog apps/website/components/
cp -r components/layout apps/website/components/

# В app
cp -r app/dashboard apps/app/app/
cp -r app/admin apps/app/app/
cp -r app/auth apps/app/app/
cp -r app/api apps/app/app/
cp -r components/dashboard apps/app/components/
cp -r components/admin apps/app/components/
cp -r components/auth apps/app/components/
```

### Шаг 2: Обновление импортов

Заменить:
```typescript
// Было
import { supabase } from '@/lib/supabase'

// Стало
import { supabase } from '@energylogic/shared/supabase'
```

### Шаг 3: Вынести общий код

```bash
# Переместить в packages/shared
cp lib/supabase.ts packages/shared/src/lib/
cp lib/auth.ts packages/shared/src/lib/
cp lib/stripe.ts packages/shared/src/lib/
cp types/index.ts packages/shared/src/types/
```

---

## 🚀 Развертывание на AWS

### Вариант 1: AWS Amplify для Website

#### 1. Установить AWS CLI и Amplify CLI

```bash
# Установить AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Установить Amplify CLI
npm install -g @aws-amplify/cli
amplify configure
```

#### 2. Инициализировать Amplify

```bash
cd apps/website
amplify init

# Выбрать:
# - Project name: energylogic-website
# - Environment: production
# - Default editor: VS Code
# - App type: javascript
# - Framework: Next.js
# - Source directory: .
# - Build command: npm run build
# - Start command: npm run start
```

#### 3. Настроить переменные окружения

```bash
amplify env add

# Добавить переменные:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY (для API routes)
```

#### 4. Развернуть

```bash
amplify publish
```

### Вариант 2: AWS ECS для App

#### 1. Создать Dockerfile

```dockerfile
# apps/app/Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY ../../package*.json ../../
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### 2. Настроить next.config.ts для standalone

```typescript
// apps/app/next.config.ts
const nextConfig = {
  output: 'standalone',
  // ... остальная конфигурация
}
```

#### 3. Создать ECR репозиторий

```bash
aws ecr create-repository --repository-name energylogic-app
```

#### 4. Собрать и загрузить образ

```bash
# Авторизоваться в ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Собрать образ
docker build -t energylogic-app -f apps/app/Dockerfile .

# Тегировать
docker tag energylogic-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/energylogic-app:latest

# Загрузить
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/energylogic-app:latest
```

#### 5. Создать ECS Task Definition

```json
{
  "family": "energylogic-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "energylogic-app",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/energylogic-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NEXT_PUBLIC_SUPABASE_URL",
          "value": "https://your-project.supabase.co"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account-id:secret:supabase-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/energylogic-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## 🔗 Связь между приложениями

### Вариант 1: Прямое подключение к Supabase

Оба приложения используют `@energylogic/shared/supabase`:

```typescript
// apps/website/app/courses/[id]/page.tsx
import { supabase } from '@energylogic/shared/supabase'

export default async function CoursePage({ params }: { params: { id: string } }) {
  const { data: course } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()
  
  return <div>{course?.title}</div>
}
```

### Вариант 2: API через основное приложение

```typescript
// packages/api-client/src/courses.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://app.energylogic.com/api'

export async function getCourse(id: string) {
  const response = await fetch(`${API_BASE_URL}/courses/${id}`)
  return response.json()
}

// apps/website/app/courses/[id]/page.tsx
import { getCourse } from '@energylogic/api-client/courses'

export default async function CoursePage({ params }: { params: { id: string } }) {
  const course = await getCourse(params.id)
  return <div>{course.title}</div>
}
```

---

## ✅ Чеклист миграции

- [ ] Создать monorepo структуру
- [ ] Настроить Turborepo
- [ ] Создать packages/shared
- [ ] Разделить код на website и app
- [ ] Обновить все импорты
- [ ] Протестировать локально
- [ ] Настроить CI/CD
- [ ] Развернуть website на AWS Amplify
- [ ] Развернуть app на AWS ECS
- [ ] Настроить домены и SSL
- [ ] Настроить мониторинг
- [ ] Настроить алерты

---

## 🐛 Решение проблем

### Проблема: Импорты не работают

**Решение:** Убедиться, что в `tsconfig.json` настроены paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@energylogic/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

### Проблема: Turbo не находит зависимости

**Решение:** Убедиться, что в `package.json` правильно указаны workspaces:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Проблема: Build падает

**Решение:** Проверить порядок сборки в `turbo.json`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

## 📚 Дополнительные ресурсы

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [AWS Amplify Next.js Guide](https://docs.amplify.aws/guides/hosting/nextjs/q/platform/js/)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)

