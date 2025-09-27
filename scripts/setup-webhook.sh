#!/bin/bash

# Скрипт для настройки webhook бота EnergyLogic Support

BOT_TOKEN="8289281549:AAHnCv4FRz62TBJN-wjPdt_kZ6T3tBj-sgY"

# Получаем URL от пользователя
if [ -z "$1" ]; then
    echo "Использование: $0 <ваш_домен>"
    echo "Пример: $0 https://yourdomain.com"
    echo "Пример: $0 https://abc123.ngrok.io"
    exit 1
fi

DOMAIN="$1"
WEBHOOK_URL="${DOMAIN}/api/telegram/user-webhook"
WEBHOOK_SECRET="energylogic_webhook_secret_$(date +%s)"

echo "🤖 Настраиваем webhook для EnergyLogic Support Bot..."
echo "📡 URL: $WEBHOOK_URL"
echo "🔐 Secret: $WEBHOOK_SECRET"
echo ""

# Устанавливаем webhook
echo "Устанавливаем webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${WEBHOOK_SECRET}\"
  }")

echo "Ответ от Telegram API:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Webhook установлен!"
echo ""
echo "📝 Добавьте в .env.local:"
echo "USER_TELEGRAM_WEBHOOK_URL=${WEBHOOK_URL}"
echo "USER_TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}"
echo ""

# Проверяем статус webhook
echo "🔍 Проверяем статус webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq . 2>/dev/null || echo "$WEBHOOK_INFO"
