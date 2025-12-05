# 🚀 Быстрый старт: Создание структуры

## Команды для создания monorepo

```bash
# 1. Создать новую директорию
mkdir energylogic-platform && cd energylogic-platform

# 2. Инициализировать npm
npm init -y

# 3. Установить зависимости
npm install -D turbo typescript

# 4. Создать структуру
mkdir -p apps/website apps/app packages/shared packages/api-client

# 5. Создать базовые файлы
touch turbo.json
touch packages/shared/package.json
touch apps/website/package.json
touch apps/app/package.json
```

## Минимальная конфигурация

### Root `package.json`

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
    "website:dev": "turbo run dev --filter=website",
    "app:dev": "turbo run dev --filter=app"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
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
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "@energylogic/shared": "*",
    "next": "^15.5.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

### `apps/app/package.json`

```json
{
  "name": "energylogic-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "@energylogic/shared": "*",
    "next": "^15.5.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

## Запуск

```bash
# Установить все зависимости
npm install

# Запустить оба приложения
npm run dev

# Или только website
npm run website:dev

# Или только app
npm run app:dev
```

## Следующие шаги

1. Скопировать код из текущего проекта
2. Разделить на website и app
3. Вынести общий код в shared
4. Настроить развертывание на AWS

