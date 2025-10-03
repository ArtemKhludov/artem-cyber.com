#!/bin/bash

# Скрипт для проверки DNS записей Resend
# Использование: ./scripts/check-resend-dns.sh

DOMAIN="energylogic-ai.com"

echo "🔍 Проверка DNS записей для домена: $DOMAIN"
echo "=================================================="

# Проверка SPF записи
echo "📧 Проверка SPF записи..."
SPF_RECORD=$(nslookup -type=TXT $DOMAIN 2>/dev/null | grep -i "v=spf1")
if [ -n "$SPF_RECORD" ]; then
    echo "✅ SPF запись найдена:"
    echo "   $SPF_RECORD"
else
    echo "❌ SPF запись не найдена или неверно настроена"
fi

echo ""

# Проверка DKIM записи
echo "🔐 Проверка DKIM записи..."
DKIM_RECORD=$(nslookup -type=CNAME resend._domainkey.$DOMAIN 2>/dev/null | grep -i "resend._domainkey.resend.com")
if [ -n "$DKIM_RECORD" ]; then
    echo "✅ DKIM запись найдена:"
    echo "   resend._domainkey.$DOMAIN -> resend._domainkey.resend.com"
else
    echo "❌ DKIM запись не найдена или неверно настроена"
fi

echo ""

# Проверка DMARC записи
echo "🛡️ Проверка DMARC записи..."
DMARC_RECORD=$(nslookup -type=TXT _dmarc.$DOMAIN 2>/dev/null | grep -i "v=dmarc1")
if [ -n "$DMARC_RECORD" ]; then
    echo "✅ DMARC запись найдена:"
    echo "   $DMARC_RECORD"
else
    echo "❌ DMARC запись не найдена или неверно настроена"
fi

echo ""

# Проверка MX записей
echo "📬 Проверка MX записей..."
MX_RECORDS=$(nslookup -type=MX $DOMAIN 2>/dev/null | grep -i "mail exchanger")
if [ -n "$MX_RECORDS" ]; then
    echo "✅ MX записи найдены:"
    echo "$MX_RECORDS"
else
    echo "❌ MX записи не найдены"
fi

echo ""

# Проверка A записи
echo "🌐 Проверка A записи..."
A_RECORD=$(nslookup -type=A $DOMAIN 2>/dev/null | grep -i "address:" | tail -1)
if [ -n "$A_RECORD" ]; then
    echo "✅ A запись найдена:"
    echo "   $A_RECORD"
else
    echo "❌ A запись не найдена"
fi

echo ""
echo "=================================================="
echo "📋 Рекомендации:"
echo "1. Если какие-то записи не найдены, добавьте их в Namecheap"
echo "2. Подождите 5-10 минут после добавления записей"
echo "3. Проверьте верификацию в Resend Dashboard"
echo "4. Для полной проверки используйте онлайн инструменты:"
echo "   - https://mxtoolbox.com/spf.aspx"
echo "   - https://mxtoolbox.com/dkim.aspx"
echo "   - https://mxtoolbox.com/dmarc.aspx"
