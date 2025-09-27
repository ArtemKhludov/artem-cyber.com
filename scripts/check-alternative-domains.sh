#!/bin/bash

echo "🔍 Проверяем альтернативные домены для EnergyLogic..."
echo ""

domains=(
    "energylogic-site.com"
    "energylogic-platform.com"
    "energylogic-courses.com"
    "energylogic-edu.com"
    "energylogics.com"
    "energylogicpro.com"
    "energylogicacademy.com"
    "energylogiclearn.com"
    "energylogic2024.com"
    "energylogic24.com"
    "energylogic.online"
    "energylogic.website"
    "energylogic.store"
    "energylogic.school"
)

available_domains=()

for domain in "${domains[@]}"; do
    echo -n "Проверяем $domain... "
    
    if command -v whois &> /dev/null; then
        if whois "$domain" 2>/dev/null | grep -q "No match\|Not found\|No entries found"; then
            echo "✅ СВОБОДЕН"
            available_domains+=("$domain")
        else
            echo "❌ ЗАНЯТ"
        fi
    else
        echo "⚠️  whois не установлен, проверьте вручную"
    fi
done

echo ""
echo "🎯 СВОБОДНЫЕ ДОМЕНЫ:"
for domain in "${available_domains[@]}"; do
    echo "✅ $domain"
done

if [ ${#available_domains[@]} -eq 0 ]; then
    echo "❌ Все проверенные домены заняты"
    echo ""
    echo "💡 Рекомендации:"
    echo "1. Попробуйте другие варианты на https://namecheap.com"
    echo "2. Используйте генератор доменов"
    echo "3. Добавьте больше слов или цифр"
fi
