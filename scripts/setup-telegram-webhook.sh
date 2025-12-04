#!/bin/bash

# Script for setting up Telegram webhook
# Usage: ./scripts/setup-telegram-webhook.sh <BOT_TOKEN>

BOT_TOKEN=$1
WEBHOOK_URL="https://www.energylogic-ai.com/api/telegram/webhook"

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Error: Bot token not specified"
    echo "Usage: $0 <BOT_TOKEN>"
    echo "Example: $0 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
    exit 1
fi

echo "🤖 Setting up Telegram webhook"
echo "=================================="
echo "Bot Token: ${BOT_TOKEN:0:10}..."
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Check bot token
echo "🔍 Checking bot token..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$BOT_INFO" | grep -o '"first_name":"[^"]*"' | cut -d'"' -f4)
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Bot found: $BOT_NAME (@$BOT_USERNAME)"
else
    echo "❌ Error: Invalid bot token"
    echo "API Response: $BOT_INFO"
    exit 1
fi

echo ""

# Delete old webhook
echo "🗑️ Deleting old webhook..."
DELETE_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook")
if echo "$DELETE_RESULT" | grep -q '"ok":true'; then
    echo "✅ Old webhook deleted"
else
    echo "⚠️ Warning: Failed to delete old webhook"
    echo "Response: $DELETE_RESULT"
fi

echo ""

# Set new webhook
echo "🔗 Setting up new webhook..."
SET_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }")

if echo "$SET_RESULT" | grep -q '"ok":true'; then
    echo "✅ Webhook successfully set"
else
    echo "❌ Error setting webhook"
    echo "API Response: $SET_RESULT"
    exit 1
fi

echo ""

# Check webhook
echo "🔍 Checking webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
if echo "$WEBHOOK_INFO" | grep -q '"ok":true'; then
    WEBHOOK_URL_CHECK=$(echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    PENDING_UPDATES=$(echo "$WEBHOOK_INFO" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)
    
    echo "✅ Webhook verified:"
    echo "   URL: $WEBHOOK_URL_CHECK"
    echo "   Pending updates: $PENDING_UPDATES"
    
    if [ "$WEBHOOK_URL_CHECK" = "$WEBHOOK_URL" ]; then
        echo "✅ Webhook URL is correct"
    else
        echo "❌ Webhook URL mismatch"
    fi
else
    echo "❌ Error checking webhook"
    echo "API Response: $WEBHOOK_INFO"
fi

echo ""

# Test bot
echo "🧪 Testing bot..."
echo "Send /start command to @$BOT_USERNAME bot in Telegram"
echo "Bot should respond with a welcome message"

echo ""
echo "=================================="
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add token to Vercel environment variables:"
echo "   USER_TELEGRAM_BOT_TOKEN=$BOT_TOKEN"
echo ""
echo "2. Test the bot by sending /start"
echo ""
echo "3. Check webhook logs in Vercel Dashboard"
echo ""
echo "4. Set up user connection in dashboard"
echo ""
echo "🔗 Useful links:"
echo "• Bot: https://t.me/$BOT_USERNAME"
echo "• Webhook: $WEBHOOK_URL"
echo "• Vercel Dashboard: https://vercel.com/dashboard"