#!/bin/bash

# Script for checking Resend DNS records
# Usage: ./scripts/check-resend-dns.sh

DOMAIN="energylogic-ai.com"

echo "🔍 Checking DNS records for domain: $DOMAIN"
echo "=================================================="

# Check SPF record
echo "📧 Checking SPF record..."
SPF_RECORD=$(nslookup -type=TXT $DOMAIN 2>/dev/null | grep -i "v=spf1")
if [ -n "$SPF_RECORD" ]; then
    echo "✅ SPF record found:"
    echo "   $SPF_RECORD"
else
    echo "❌ SPF record not found or incorrectly configured"
fi

echo ""

# Check DKIM record
echo "🔐 Checking DKIM record..."
DKIM_RECORD=$(nslookup -type=CNAME resend._domainkey.$DOMAIN 2>/dev/null | grep -i "resend._domainkey.resend.com")
if [ -n "$DKIM_RECORD" ]; then
    echo "✅ DKIM record found:"
    echo "   resend._domainkey.$DOMAIN -> resend._domainkey.resend.com"
else
    echo "❌ DKIM record not found or incorrectly configured"
fi

echo ""

# Check DMARC record
echo "🛡️ Checking DMARC record..."
DMARC_RECORD=$(nslookup -type=TXT _dmarc.$DOMAIN 2>/dev/null | grep -i "v=dmarc1")
if [ -n "$DMARC_RECORD" ]; then
    echo "✅ DMARC record found:"
    echo "   $DMARC_RECORD"
else
    echo "❌ DMARC record not found or incorrectly configured"
fi

echo ""

# Check MX records
echo "📬 Checking MX records..."
MX_RECORDS=$(nslookup -type=MX $DOMAIN 2>/dev/null | grep -i "mail exchanger")
if [ -n "$MX_RECORDS" ]; then
    echo "✅ MX records found:"
    echo "$MX_RECORDS"
else
    echo "❌ MX records not found"
fi

echo ""

# Check A record
echo "🌐 Checking A record..."
A_RECORD=$(nslookup -type=A $DOMAIN 2>/dev/null | grep -i "address:" | tail -1)
if [ -n "$A_RECORD" ]; then
    echo "✅ A record found:"
    echo "   $A_RECORD"
else
    echo "❌ A record not found"
fi

echo ""
echo "=================================================="
echo "📋 Recommendations:"
echo "1. If some records are not found, add them in Namecheap"
echo "2. Wait 5-10 minutes after adding records"
echo "3. Check verification in Resend Dashboard"
echo "4. For full check, use online tools:"
echo "   - https://mxtoolbox.com/spf.aspx"
echo "   - https://mxtoolbox.com/dkim.aspx"
echo "   - https://mxtoolbox.com/dmarc.aspx"