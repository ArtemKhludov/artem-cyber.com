#!/bin/bash

# Полный скрипт настройки продакшена

echo "🚀 Настройка продакшена EnergyLogic"
echo "=================================="
echo ""

# Получаем домен от пользователя
if [ -z "$1" ]; then
    echo "Использование: $0 <ваш_домен>"
    echo "Пример: $0 energylogic.com"
    exit 1
fi

DOMAIN="$1"
BOT_TOKEN="8289281549:AAHnCv4FRz62TBJN-wjPdt_kZ6T3tBj-sgY"

echo "🌐 Домен: $DOMAIN"
echo ""

# 1. Настройка webhook
echo "1️⃣ Настраиваем Telegram webhook..."
WEBHOOK_URL="https://${DOMAIN}/api/telegram/user-webhook"
WEBHOOK_SECRET="energylogic_webhook_$(date +%s)"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${WEBHOOK_SECRET}\"
  }" | jq . 2>/dev/null || echo "Webhook установлен"

echo "✅ Webhook настроен: $WEBHOOK_URL"
echo ""

# 2. Создание .env.production
echo "2️⃣ Создаем .env.production..."
cat > .env.production << EOF
# Production Environment Variables
NEXT_PUBLIC_APP_URL=https://${DOMAIN}

# EnergyLogic Support Bot
USER_TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
USER_TELEGRAM_BOT_USERNAME=EnergyLogic_Support_bot
USER_TELEGRAM_WEBHOOK_URL=${WEBHOOK_URL}
USER_TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}

# Основной бот для админов (замените на ваши данные)
TELEGRAM_BOT_TOKEN=your_admin_bot_token
TELEGRAM_CHAT_ID=your_admin_chat_id
TELEGRAM_THREAD_ISSUES=thread_id_for_issues

# Email провайдер (настройте позже)
RESEND_API_KEY=your_resend_api_key
NOTIFY_SENDER_EMAIL=noreply@${DOMAIN}

# Supabase (ваши данные)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Другие настройки
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=your_nextauth_secret
EOF

echo "✅ .env.production создан"
echo ""

# 3. Инструкции по настройке
echo "3️⃣ Следующие шаги:"
echo ""
echo "📋 В Vercel Dashboard добавьте переменные окружения:"
echo "   - Перейдите в Settings → Environment Variables"
echo "   - Добавьте все переменные из .env.production"
echo ""
echo "🌐 Подключите домен в Vercel:"
echo "   - Settings → Domains → Add Domain"
echo "   - Настройте DNS в регистраторе домена"
echo ""
echo "📧 Настройте email провайдер:"
echo "   - Зарегистрируйтесь на https://resend.com"
echo "   - Получите API ключ"
echo "   - Добавьте в переменные окружения"
echo ""
echo "🔧 Проверьте настройки:"
echo "   - Откройте https://${DOMAIN}"
echo "   - Протестируйте создание обращений"
echo "   - Проверьте Telegram уведомления"
echo ""

# 4. Проверка webhook
echo "4️⃣ Проверяем статус webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq . 2>/dev/null || echo "$WEBHOOK_INFO"

echo ""
echo "🎉 Настройка завершена!"
echo "📖 Подробная инструкция: BOT_SETUP_GUIDE.md"
