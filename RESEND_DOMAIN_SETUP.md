# 📧 Настройка домена в Resend для улучшения доставляемости

## 🎯 Цель
Верифицировать домен `energylogic-ai.com` в Resend для улучшения доставляемости email и избежания попадания в спам.

## 📋 Пошаговая инструкция

### Шаг 1: Вход в Resend Dashboard
1. Перейдите на [resend.com](https://resend.com)
2. Войдите в свой аккаунт
3. Перейдите в раздел **Domains**

### Шаг 2: Добавление домена
1. Нажмите **Add Domain**
2. Введите домен: `energylogic-ai.com`
3. Выберите регион: **US East (N. Virginia)** или **EU West (Ireland)**
4. Нажмите **Add**

### Шаг 3: Получение DNS записей
После добавления домена Resend предоставит следующие DNS записи:

#### Обязательные записи:
```
Type: TXT
Name: energylogic-ai.com
Value: v=spf1 include:_spf.resend.com ~all
```

```
Type: CNAME
Name: resend._domainkey.energylogic-ai.com
Value: resend._domainkey.resend.com
```

```
Type: TXT
Name: _dmarc.energylogic-ai.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@energylogic-ai.com
```

### Шаг 4: Настройка DNS в Namecheap

#### 4.1. Вход в Namecheap
1. Перейдите на [namecheap.com](https://namecheap.com)
2. Войдите в аккаунт
3. Перейдите в **Domain List**
4. Найдите домен `energylogic-ai.com`
5. Нажмите **Manage**

#### 4.2. Добавление DNS записей
1. Перейдите в раздел **Advanced DNS**
2. Удалите существующие записи (если есть):
   - Старые SPF записи
   - Старые DKIM записи
   - Старые DMARC записи

3. Добавьте новые записи:

**SPF запись:**
```
Type: TXT Record
Host: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: Automatic
```

**DKIM запись:**
```
Type: CNAME Record
Host: resend._domainkey
Value: resend._domainkey.resend.com
TTL: Automatic
```

**DMARC запись:**
```
Type: TXT Record
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@energylogic-ai.com
TTL: Automatic
```

### Шаг 5: Проверка DNS записей
После добавления записей подождите 5-10 минут и проверьте:

1. **SPF проверка:**
   ```bash
   nslookup -type=TXT energylogic-ai.com
   ```

2. **DKIM проверка:**
   ```bash
   nslookup -type=CNAME resend._domainkey.energylogic-ai.com
   ```

3. **DMARC проверка:**
   ```bash
   nslookup -type=TXT _dmarc.energylogic-ai.com
   ```

### Шаг 6: Верификация в Resend
1. Вернитесь в Resend Dashboard
2. Нажмите **Verify** рядом с доменом
3. Дождитесь успешной верификации (может занять до 24 часов)

## 🔧 Дополнительные настройки

### Настройка отправителя
После верификации домена обновите переменные окружения:

```env
NOTIFY_SENDER_EMAIL=noreply@energylogic-ai.com
```

### Тестирование отправки
Используйте API endpoint для тестирования:
```bash
curl -X POST https://www.energylogic-ai.com/api/test-resend \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "testType": "simple"
  }'
```

## ⚠️ Важные моменты

1. **Время распространения DNS:** Изменения DNS могут занять до 24 часов
2. **Кэширование:** Браузеры и почтовые клиенты могут кэшировать DNS записи
3. **Проверка SPF:** Убедитесь, что SPF запись не конфликтует с существующими
4. **DMARC политика:** Начните с `p=quarantine`, затем переходите к `p=reject`

## 🚨 Устранение проблем

### Проблема: DNS записи не обновляются
**Решение:**
- Проверьте правильность ввода записей
- Убедитесь, что TTL установлен на минимальное значение
- Подождите до 24 часов

### Проблема: Верификация не проходит
**Решение:**
- Проверьте все DNS записи через онлайн инструменты
- Убедитесь, что нет конфликтующих записей
- Обратитесь в поддержку Resend

### Проблема: Письма все еще попадают в спам
**Решение:**
- Проверьте репутацию домена через [MXToolbox](https://mxtoolbox.com)
- Убедитесь, что DMARC политика настроена правильно
- Проверьте содержимое писем на спам-триггеры

## 📊 Мониторинг

После настройки мониторьте:
- Доставляемость писем в Resend Dashboard
- DMARC отчеты на email dmarc@energylogic-ai.com
- Репутацию домена через онлайн инструменты

## 🎉 Результат

После успешной настройки:
- ✅ Письма будут доставляться с домена energylogic-ai.com
- ✅ Улучшится репутация отправителя
- ✅ Снизится вероятность попадания в спам
- ✅ Повысится доставляемость email уведомлений
