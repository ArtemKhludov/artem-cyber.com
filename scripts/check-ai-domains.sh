#!/bin/bash

echo "🧠 Проверяем домены для ИИ-психолога EnergyLogic..."
echo ""

domains=(
    "energylogic-ai.com"
    "energylogic-psychology.com"
    "energylogic-mind.com"
    "energylogic-therapy.com"
    "energylogic-consulting.com"
    "energylogic-support.com"
    "energylogic-help.com"
    "energylogic-care.com"
    "energylogic-smart.com"
    "energylogic-solutions.com"
    "energylogic-advice.com"
    "energylogic-guidance.com"
    "energylogic-mental.com"
    "energylogic-wellness.com"
    "energylogic-coach.com"
    "energylogic-ai-psych.com"
    "energylogic-ai-mind.com"
    "energylogic-ai-care.com"
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
echo "🧠 СВОБОДНЫЕ ДОМЕНЫ ДЛЯ ИИ-ПСИХОЛОГА:"
for domain in "${available_domains[@]}"; do
    echo "✅ $domain"
done

echo ""
echo "💡 Рекомендации по категориям:"
echo ""
echo "🤖 ИИ-направление:"
for domain in "${available_domains[@]}"; do
    if [[ $domain == *"ai"* ]]; then
        echo "  ✅ $domain"
    fi
done

echo ""
echo "🧠 Психология/Терапия:"
for domain in "${available_domains[@]}"; do
    if [[ $domain == *"psych"* || $domain == *"therapy"* || $domain == *"mind"* || $domain == *"mental"* ]]; then
        echo "  ✅ $domain"
    fi
done

echo ""
echo "💬 Консультации/Поддержка:"
for domain in "${available_domains[@]}"; do
    if [[ $domain == *"consult"* || $domain == *"support"* || $domain == *"help"* || $domain == *"care"* ]]; then
        echo "  ✅ $domain"
    fi
done
