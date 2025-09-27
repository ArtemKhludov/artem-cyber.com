#!/bin/bash

# Скрипт для проверки доступности доменов

echo "🔍 Проверяем доступность доменов для EnergyLogic..."
echo ""

domains=(
    "energylogic.com"
    "energylogic.ru"
    "energylogic.net"
    "energylogic.app"
    "energylogic.io"
    "energylogic.co"
)

for domain in "${domains[@]}"; do
    echo -n "Проверяем $domain... "
    
    # Проверяем через whois (упрощенная версия)
    if command -v whois &> /dev/null; then
        if whois "$domain" 2>/dev/null | grep -q "No match\|Not found\|No entries found"; then
            echo "✅ СВОБОДЕН"
        else
            echo "❌ ЗАНЯТ"
        fi
    else
        echo "⚠️  whois не установлен, проверьте вручную"
    fi
done

echo ""
echo "💡 Рекомендации:"
echo "1. Выберите домен с ✅ СВОБОДЕН"
echo "2. Предпочтительно .com или .ru"
echo "3. Проверьте также на https://namecheap.com"
