#!/bin/bash

# Скрипт для настройки Telegram webhook
# Использование: ./scripts/setup-telegram-webhook.sh <BOT_TOKEN>

BOT_TOKEN=$1
WEBHOOK_URL="https://www.energylogic-ai.com/api/telegram/webhook"

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Ошибка: Не указан токен бота"
    echo "Использование: $0 <BOT_TOKEN>"
    echo "Пример: $0 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
    exit 1
fi

echo "🤖 Настройка Telegram webhook"
echo "=================================="
echo "Bot Token: ${BOT_TOKEN:0:10}..."
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Проверка токена бота
echo "🔍 Проверка токена бота..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$BOT_INFO" | grep -o '"first_name":"[^"]*"' | cut -d'"' -f4)
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Бот найден: $BOT_NAME (@$BOT_USERNAME)"
else
    echo "❌ Ошибка: Неверный токен бота"
    echo "Ответ API: $BOT_INFO"
    exit 1
fi

echo ""

# Удаление старого webhook
echo "🗑️ Удаление старого webhook..."
DELETE_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook")
if echo "$DELETE_RESULT" | grep -q '"ok":true'; then
    echo "✅ Старый webhook удален"
else
    echo "⚠️ Предупреждение: Не удалось удалить старый webhook"
    echo "Ответ: $DELETE_RESULT"
fi

echo ""

# Установка нового webhook
echo "🔗 Установка нового webhook..."
SET_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }")

if echo "$SET_RESULT" | grep -q '"ok":true'; then
    echo "✅ Webhook успешно установлен"
else
    echo "❌ Ошибка установки webhook"
    echo "Ответ API: $SET_RESULT"
    exit 1
fi

echo ""

# Проверка webhook
echo "🔍 Проверка webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
if echo "$WEBHOOK_INFO" | grep -q '"ok":true'; then
    WEBHOOK_URL_CHECK=$(echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    PENDING_UPDATES=$(echo "$WEBHOOK_INFO" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)
    
    echo "✅ Webhook проверен:"
    echo "   URL: $WEBHOOK_URL_CHECK"
    echo "   Ожидающих обновлений: $PENDING_UPDATES"
    
    if [ "$WEBHOOK_URL_CHECK" = "$WEBHOOK_URL" ]; then
        echo "✅ URL webhook корректен"
    else
        echo "❌ URL webhook не совпадает"
    fi
else
    echo "❌ Ошибка проверки webhook"
    echo "Ответ API: $WEBHOOK_INFO"
fi

echo ""

# Тестирование бота
echo "🧪 Тестирование бота..."
echo "Отправьте команду /start боту @$BOT_USERNAME в Telegram"
echo "Бот должен ответить приветственным сообщением"

echo ""
echo "=================================="
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Добавьте токен в переменные окружения Vercel:"
echo "   USER_TELEGRAM_BOT_TOKEN=$BOT_TOKEN"
echo ""
echo "2. Протестируйте бота, отправив /start"
echo ""
echo "3. Проверьте логи webhook в Vercel Dashboard"
echo ""
echo "4. Настройте подключение пользователей в личном кабинете"
echo ""
echo "🔗 Полезные ссылки:"
echo "• Бот: https://t.me/$BOT_USERNAME"
echo "• Webhook: $WEBHOOK_URL"
echo "• Vercel Dashboard: https://vercel.com/dashboard"
