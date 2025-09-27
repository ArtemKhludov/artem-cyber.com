# Спецификация системы email-уведомлений

## 1. Архитектура email-системы

### 1.1 Провайдеры (подготовка к интеграции)

#### Resend (рекомендуемый)
```typescript
// Конфигурация
const resendConfig = {
  apiKey: process.env.RESEND_API_KEY,
  from: {
    email: 'support@energylogic.ru',
    name: 'EnergyLogic Support'
  },
  replyTo: 'support@energylogic.ru'
}

// Ограничения
- 100,000 emails/месяц (бесплатно)
- 3,000 emails/день
- 10 emails/сек
- Максимум 50 получателей за раз
```

#### SendGrid (альтернатива)
```typescript
// Конфигурация
const sendGridConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  from: {
    email: 'support@energylogic.ru',
    name: 'EnergyLogic Support'
  }
}

// Ограничения
- 100 emails/день (бесплатно)
- 40,000 emails/месяц (платно)
- Максимум 1000 получателей за раз
```

#### AWS SES (для масштаба)
```typescript
// Конфигурация
const sesConfig = {
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  from: 'support@energylogic.ru'
}

// Ограничения
- 200 emails/день (sandbox)
- Без ограничений (production)
- $0.10 за 1000 emails
```

### 1.2 DNS настройки (для всех провайдеров)

```dns
; SPF запись
TXT "v=spf1 include:_spf.resend.com ~all"

; DKIM запись (генерируется провайдером)
TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."

; DMARC запись
TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@energylogic.ru; ruf=mailto:dmarc@energylogic.ru; fo=1"

; MX запись (если нужен входящий email)
MX 10 mail.energylogic.ru
```

## 2. Шаблоны уведомлений

### 2.1 Структура шаблона

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  type: 'issue_created' | 'issue_replied' | 'issue_status_changed' | 'telegram_linked';
  language: 'ru' | 'en';
  subject: string;
  html: string;
  text: string;
  variables: string[];
  isActive: boolean;
}
```

### 2.2 Шаблон: Новое обращение (админам)

```html
<!-- subject: "🆕 Новое обращение #{{issue_id}} от {{user_name}}" -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Новое обращение</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🆕 Новое обращение</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Детали обращения</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">ID:</td>
                    <td style="padding: 8px 0;">#{{issue_id}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Тема:</td>
                    <td style="padding: 8px 0;">{{issue_title}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Тип:</td>
                    <td style="padding: 8px 0;">
                        <span style="background: {{type_color}}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                            {{type_label}}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Приоритет:</td>
                    <td style="padding: 8px 0;">
                        <span style="background: {{priority_color}}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                            {{priority_label}}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Создано:</td>
                    <td style="padding: 8px 0;">{{created_at}}</td>
                </tr>
            </table>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Информация о пользователе</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Имя:</td>
                    <td style="padding: 8px 0;">{{user_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                    <td style="padding: 8px 0;">{{user_email}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Телефон:</td>
                    <td style="padding: 8px 0;">{{user_phone}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Telegram:</td>
                    <td style="padding: 8px 0;">{{user_telegram}}</td>
                </tr>
            </table>
        </div>

        {{#if purchase_info}}
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Связанная покупка</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Товар:</td>
                    <td style="padding: 8px 0;">{{purchase_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Сумма:</td>
                    <td style="padding: 8px 0;">{{purchase_amount}} {{purchase_currency}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Дата:</td>
                    <td style="padding: 8px 0;">{{purchase_date}}</td>
                </tr>
            </table>
        </div>
        {{/if}}

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Описание проблемы</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
                {{issue_description}}
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{admin_url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Открыть в админ-панели
            </a>
        </div>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
        <p>Это автоматическое уведомление от системы EnergyLogic</p>
        <p>Если вы не должны получать эти уведомления, обратитесь к администратору</p>
    </div>
</body>
</html>
```

### 2.3 Шаблон: Ответ на обращение (пользователю)

```html
<!-- subject: "Ответ на ваше обращение #{{issue_id}}" -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ответ на обращение</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">💬 Ответ на ваше обращение</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Ваше обращение</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">ID:</td>
                    <td style="padding: 8px 0;">#{{issue_id}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Тема:</td>
                    <td style="padding: 8px 0;">{{issue_title}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Статус:</td>
                    <td style="padding: 8px 0;">
                        <span style="background: {{status_color}}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                            {{status_label}}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Создано:</td>
                    <td style="padding: 8px 0;">{{created_at}}</td>
                </tr>
            </table>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Ответ поддержки</h3>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 4px; border-left: 4px solid #2196f3;">
                <p style="margin: 0; white-space: pre-wrap;">{{reply_message}}</p>
            </div>
            <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
                Ответил: {{admin_name}} • {{reply_date}}
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboard_url}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Открыть в личном кабинете
            </a>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
                <strong>💡 Совет:</strong> Если у вас есть дополнительные вопросы, вы можете ответить на это письмо или создать новое обращение в личном кабинете.
            </p>
        </div>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
        <p>С уважением, команда EnergyLogic</p>
        <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него напрямую, если это не требуется.</p>
    </div>
</body>
</html>
```

### 2.4 Шаблон: Подключение Telegram

```html
<!-- subject: "Telegram успешно подключен" -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram подключен</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📱 Telegram подключен</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
            <h2 style="color: #495057; margin-top: 0;">Отлично!</h2>
            <p>Ваш Telegram успешно подключен к системе уведомлений EnergyLogic.</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Что это означает?</h3>
            <ul style="color: #495057;">
                <li>Вы будете получать уведомления о новых ответах на ваши обращения</li>
                <li>Уведомления будут приходить мгновенно</li>
                <li>Вы можете отключить уведомления в любое время</li>
            </ul>
        </div>

        <div style="background: #e8f5e8; padding: 15px; border-radius: 4px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">
                <strong>🔔 Уведомления:</strong> Теперь вы будете получать уведомления о новых ответах как по email, так и в Telegram.
            </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboard_url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Настроить уведомления
            </a>
        </div>
    </div>

    <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
        <p>С уважением, команда EnergyLogic</p>
    </div>
</body>
</html>
```

## 3. Система отправки

### 3.1 Сервис отправки

```typescript
// lib/email-service.ts
interface EmailService {
  sendTemplate(templateId: string, to: string, variables: Record<string, any>): Promise<EmailResult>;
  sendCustom(to: string, subject: string, html: string, text?: string): Promise<EmailResult>;
  validateEmail(email: string): boolean;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'resend' | 'sendgrid' | 'ses';
}

interface DeliveryStatus {
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  timestamp: string;
  error?: string;
}
```

### 3.2 Обработка ошибок

```typescript
// Стратегии обработки ошибок
const errorHandlers = {
  // Временная ошибка - повторить
  'rate_limit': { retry: true, delay: 60000, maxRetries: 3 },
  'temporary_failure': { retry: true, delay: 30000, maxRetries: 5 },
  
  // Постоянная ошибка - не повторять
  'invalid_email': { retry: false, log: true, notify: false },
  'bounced': { retry: false, log: true, notify: true },
  'blocked': { retry: false, log: true, notify: true },
  
  // Критическая ошибка - уведомить админа
  'api_key_invalid': { retry: false, log: true, notify: true, escalate: true },
  'quota_exceeded': { retry: false, log: true, notify: true, escalate: true }
};
```

### 3.3 Мониторинг и метрики

```typescript
// Метрики для отслеживания
interface EmailMetrics {
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

// Алерты
const alerts = {
  bounceRate: { threshold: 0.05, action: 'notify_admin' },
  deliveryRate: { threshold: 0.95, action: 'notify_admin' },
  quotaUsage: { threshold: 0.9, action: 'notify_admin' }
};
```

## 4. Тестирование

### 4.1 Тестовые сценарии

```typescript
// Тесты отправки
describe('Email Service', () => {
  test('should send issue notification to admin', async () => {
    const result = await emailService.sendTemplate('issue_created', 'admin@test.com', {
      issue_id: '123',
      user_name: 'Test User',
      issue_title: 'Test Issue'
    });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  test('should handle invalid email gracefully', async () => {
    const result = await emailService.sendTemplate('issue_created', 'invalid-email', {});
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid');
  });

  test('should retry on temporary failure', async () => {
    // Mock temporary failure
    mockEmailProvider.mockRejectedValueOnce(new Error('rate_limit'));
    
    const result = await emailService.sendTemplate('issue_created', 'test@test.com', {});
    
    expect(mockEmailProvider).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
```

### 4.2 Sandbox режим

```typescript
// Конфигурация для разработки
const devConfig = {
  provider: 'resend',
  sandbox: true,
  testEmails: ['test@energylogic.ru', 'admin@energylogic.ru'],
  mockDelivery: true,
  logLevel: 'debug'
};
```

## 5. Развертывание

### 5.1 Переменные окружения

```bash
# Email провайдер
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
SENDGRID_API_KEY=SG.xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Настройки отправителя
NOTIFY_SENDER_EMAIL=support@energylogic.ru
NOTIFY_SENDER_NAME=EnergyLogic Support
NOTIFY_REPLY_TO=support@energylogic.ru

# Настройки домена
EMAIL_DOMAIN=energylogic.ru
EMAIL_DKIM_SELECTOR=resend
EMAIL_SPF_RECORD=v=spf1 include:_spf.resend.com ~all

# Флаги
EMAIL_ENABLED=true
EMAIL_SANDBOX=false
EMAIL_RETRY_ENABLED=true
EMAIL_METRICS_ENABLED=true
```

### 5.2 Мониторинг

```typescript
// Дашборд метрик
interface EmailDashboard {
  today: EmailMetrics;
  week: EmailMetrics;
  month: EmailMetrics;
  topTemplates: Array<{ template: string; count: number }>;
  deliveryTrends: Array<{ date: string; delivered: number; bounced: number }>;
  errorLogs: Array<{ timestamp: string; error: string; count: number }>;
}
```

## 6. Безопасность

### 6.1 Защита от спама

```typescript
// Rate limiting
const rateLimits = {
  perUser: { limit: 10, window: 3600000 }, // 10 emails per hour per user
  perIP: { limit: 100, window: 3600000 },  // 100 emails per hour per IP
  global: { limit: 1000, window: 3600000 } // 1000 emails per hour globally
};

// Валидация контента
const contentValidation = {
  maxSubjectLength: 200,
  maxBodyLength: 10000,
  allowedHtmlTags: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  blockExternalImages: true,
  sanitizeHtml: true
};
```

### 6.2 Защита данных

```typescript
// Шифрование чувствительных данных
const encryption = {
  encryptApiKeys: true,
  encryptUserEmails: false, // Нужны для отправки
  encryptTemplates: false,  // Нужны для рендеринга
  logSensitiveData: false
};

// Аудит
const audit = {
  logAllSends: true,
  logFailures: true,
  logBounces: true,
  retentionDays: 90
};
```

## 7. Интеграция с системой

### 7.1 API эндпоинты

```typescript
// POST /api/email/send
{
  template: string;
  to: string | string[];
  variables: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  scheduledAt?: string;
}

// GET /api/email/status/:messageId
{
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  timestamp: string;
  error?: string;
}

// POST /api/email/webhook (для провайдеров)
{
  event: 'delivered' | 'bounced' | 'opened' | 'clicked';
  messageId: string;
  timestamp: string;
  data: any;
}
```

### 7.2 Интеграция с уведомлениями

```typescript
// lib/notify.ts - расширение
export async function sendEmailNotification(
  userId: string,
  template: string,
  variables: Record<string, any>
): Promise<NotificationResult> {
  const user = await getUserInfo(userId);
  if (!user?.email) {
    return { success: false, error: 'No email address' };
  }

  const result = await emailService.sendTemplate(template, user.email, variables);
  
  // Записываем статус доставки
  await recordDeliveryStatus('email', result.messageId, result.success);
  
  return result;
}
```

Эта спецификация обеспечивает полную готовность к интеграции email-провайдера. После настройки DNS и получения API ключей система будет готова к работе.
