#!/bin/bash

echo "⏰ Настраиваем cron jobs для автоматизации..."

# Проверяем наличие переменных окружения
if [ -z "$CRON_SECRET" ]; then
    echo "⚠️ CRON_SECRET не установлен. Генерируем случайный..."
    CRON_SECRET=$(openssl rand -hex 32)
    echo "🔐 CRON_SECRET: $CRON_SECRET"
    echo "📝 Добавьте в .env.local: CRON_SECRET=$CRON_SECRET"
fi

# URL для cron jobs
BASE_URL="https://energylogic-ai.com"
CRON_SECRET=${CRON_SECRET:-"default-secret"}

echo "🌐 Base URL: $BASE_URL"
echo "🔐 Cron Secret: ${CRON_SECRET:0:8}..."

# Создаем cron задачи
echo "📋 Создаем cron задачи..."

# Очистка каждые 6 часов
CLEANUP_CRON="0 */6 * * * curl -X POST '$BASE_URL/api/cron/cleanup' -H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'"

# Проверка здоровья каждые 30 минут
HEALTH_CRON="*/30 * * * * curl -X POST '$BASE_URL/api/cron/health-check' -H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'"

# Ежедневный отчет в 9:00
REPORT_CRON="0 9 * * * curl -X POST '$BASE_URL/api/cron/daily-report' -H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'"

echo ""
echo "📝 Добавьте эти строки в crontab (crontab -e):"
echo ""
echo "# EnergyLogic Automation"
echo "$CLEANUP_CRON"
echo "$HEALTH_CRON"
echo "$REPORT_CRON"
echo ""

# Альтернативный способ через GitHub Actions
echo "🔄 Альтернативно, используйте GitHub Actions (уже настроены):"
echo "   - .github/workflows/monitor.yml - мониторинг каждые 30 минут"
echo "   - .github/workflows/deploy.yml - автоматический деплой"
echo ""

echo "✅ Настройка cron jobs завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Добавьте CRON_SECRET в переменные окружения Vercel"
echo "2. Настройте webhooks в Supabase и Stripe"
echo "3. Проверьте работу автоматизации"
