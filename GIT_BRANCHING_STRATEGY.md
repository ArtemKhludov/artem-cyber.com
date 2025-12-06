# 🌳 Git Branching Strategy
## Стратегия ветвления для EnergyLogic Platform

---

## 📐 Branch Structure

```
main (production)
 │
 │  [Protected: Require PR, Status checks, No direct pushes]
 │
 ├── develop (integration branch)
 │     │
 │     ├── feature/web-seo-optimization ✅
 │     ├── feature/security-fixes
 │     ├── feature/api-v1
 │     ├── feature/jwt-authentication
 │     ├── feature/mobile-api-client
 │     ├── feature/push-notifications
 │     └── feature/request-validation
 │
 ├── release/v1.0.0 (pre-production)
 │     │
 │     ├── hotfix/security-patch
 │     └── hotfix/critical-bug
 │
 ├── mobile/ios-v1.0
 │     │
 │     └── mobile/android-v1.0
 │
 └── docs/security-audit ✅
```

---

## 🔀 Branch Types

### 1. `main` - Production
- **Purpose:** Только стабильный, протестированный код
- **Protection:**
  - ✅ Require pull request reviews (2 approvals)
  - ✅ Require status checks to pass
  - ✅ Require branches to be up to date
  - ❌ No direct pushes
  - ✅ Require linear history

**Merge:** Только из `release/*` или `hotfix/*`

### 2. `develop` - Integration
- **Purpose:** Интеграционная ветка для разработки
- **Protection:**
  - ✅ Require pull request reviews (1 approval)
  - ✅ Require status checks
  - ✅ Allow fast-forward merges

**Merge:** Из `feature/*`, `bugfix/*`

### 3. `feature/*` - Features
- **Naming:** `feature/description` (kebab-case)
- **Examples:**
  - `feature/api-v1-endpoints`
  - `feature/jwt-authentication`
  - `feature/mobile-login-screen`
  - `feature/push-notifications`

**Workflow:**
```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/api-v1-endpoints

# Work on feature
git commit -m "feat: add /api/v1/auth/login endpoint"

# Push and create PR
git push origin feature/api-v1-endpoints
# Create PR: feature/api-v1-endpoints → develop
```

**Merge:** Squash and merge в `develop`

### 4. `release/*` - Pre-production
- **Naming:** `release/v1.0.0` (semantic versioning)
- **Purpose:** Подготовка к релизу, финальное тестирование

**Workflow:**
```bash
# Create release branch
git checkout develop
git checkout -b release/v1.0.0

# Final testing, bug fixes
git commit -m "fix: critical bug in payment flow"

# Merge to main and develop
git checkout main
git merge release/v1.0.0
git tag v1.0.0

git checkout develop
git merge release/v1.0.0
```

### 5. `hotfix/*` - Critical Fixes
- **Naming:** `hotfix/description`
- **Purpose:** Критические исправления для production

**Workflow:**
```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/security-patch

# Fix and test
git commit -m "fix: remove console.log from production"

# Merge to main and develop
git checkout main
git merge hotfix/security-patch
git tag v1.0.1

git checkout develop
git merge hotfix/security-patch
```

### 6. `mobile/*` - Mobile App Branches
- **Naming:** `mobile/ios-v1.0`, `mobile/android-v1.0`
- **Purpose:** Отдельные ветки для мобильных приложений

**Workflow:**
```bash
# iOS branch
git checkout -b mobile/ios-v1.0
# Work on iOS app
# Merge to main when ready

# Android branch
git checkout -b mobile/android-v1.0
# Work on Android app
# Merge to main when ready
```

---

## 🔄 Typical Workflow

### Feature Development

```
1. Create feature branch from develop
   git checkout develop
   git pull
   git checkout -b feature/new-feature

2. Develop feature
   git commit -m "feat: implement feature"
   git push origin feature/new-feature

3. Create Pull Request
   feature/new-feature → develop
   - Get code review
   - Fix issues
   - Wait for CI/CD to pass

4. Merge to develop
   - Squash and merge
   - Delete feature branch

5. Deploy to staging
   - Auto-deploy from develop

6. Create release branch
   git checkout -b release/v1.0.0

7. Test and fix
   - Final testing
   - Bug fixes

8. Merge to main
   release/v1.0.0 → main
   - Tag version
   - Deploy to production
```

### Hotfix Workflow

```
1. Create hotfix from main
   git checkout main
   git checkout -b hotfix/critical-bug

2. Fix and test
   git commit -m "fix: critical bug"

3. Merge to main
   hotfix/critical-bug → main
   - Tag patch version
   - Deploy immediately

4. Merge to develop
   hotfix/critical-bug → develop
   - Keep develop up to date
```

---

## 📝 Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: Новая функциональность
- `fix`: Исправление бага
- `docs`: Изменения в документации
- `style`: Форматирование (не влияет на код)
- `refactor`: Рефакторинг
- `perf`: Улучшение производительности
- `test`: Добавление тестов
- `chore`: Обновление зависимостей, конфигурации
- `security`: Исправления безопасности

### Examples

```bash
# Feature
feat(api): add JWT authentication for mobile apps

# Security fix
security(middleware): remove console.log from production

# Bug fix
fix(auth): handle expired refresh tokens correctly

# Refactoring
refactor(api): extract auth logic to middleware

# Documentation
docs(security): add security audit report
```

---

## 🚫 Branch Protection Rules

### main
```yaml
Branch: main
Protection:
  - Require pull request reviews: 2
  - Dismiss stale reviews: true
  - Require status checks: true
    - build
    - lint
    - test
  - Require branches to be up to date: true
  - Require linear history: true
  - No direct pushes: true
  - Allow force pushes: false
  - Allow deletions: false
```

### develop
```yaml
Branch: develop
Protection:
  - Require pull request reviews: 1
  - Require status checks: true
    - build
    - lint
  - Require branches to be up to date: true
  - Allow force pushes: false
  - Allow deletions: false
```

---

## 🔗 Integration with CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npx snyk test
```

---

## 📊 Current Branch Status

```
✅ main - Production (stable)
✅ develop - Integration (active development)
✅ git-push-78b93 - Current working branch
```

### Recommended Next Branches

```bash
# Security fixes
git checkout -b feature/security-fixes

# API versioning
git checkout -b feature/api-v1

# Mobile preparation
git checkout -b feature/mobile-api-preparation
```

---

## 🎯 Best Practices

1. **Keep branches small**
   - Один feature = одна ветка
   - Не смешивать несколько features

2. **Regular merges**
   - Регулярно мержить develop в feature branches
   - Избегать больших конфликтов

3. **Clear naming**
   - Использовать kebab-case
   - Описательные имена

4. **Clean history**
   - Squash commits перед merge
   - Удалять merged branches

5. **Protect main**
   - Никогда не пушить напрямую в main
   - Всегда через PR

---

**Last Updated:** December 2024

