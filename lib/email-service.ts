// Сервис для отправки email уведомлений через Resend

import {
  getWelcomeEmailTemplate,
  getCallbackReplyEmailTemplate,
  getCallbackStatusEmailTemplate,
  type UserWelcomeData,
  type CallbackReplyData,
  type CallbackStatusData
} from './email-templates';

interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl: string;
}

class EmailService {
  private config: EmailServiceConfig;

  constructor() {
    this.config = {
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: process.env.NOTIFY_SENDER_EMAIL || 'no-reply@energylogic-ai.com',
      fromName: 'EnergyLogic',
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://www.energylogic-ai.com')
    };
  }

  // Универсальный метод для отправки email
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        console.log('📧 Email service not configured (RESEND_API_KEY not set)');
        return false;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text || params.html.replace(/<[^>]*>/g, '')
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Email sending failed:', response.status, errorData);
        return false;
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', result.id);
      return true;
    } catch (error) {
      console.error('❌ Email sending error:', error);
      return false;
    }
  }

  // Отправка приветственного письма новому пользователю
  async sendWelcomeEmail(userData: UserWelcomeData): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        console.log('📧 Email service not configured (RESEND_API_KEY not set)');
        return false;
      }

      const template = getWelcomeEmailTemplate({
        ...userData,
        loginUrl: `${this.config.baseUrl}/auth/login`
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [userData.email],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Welcome email sent successfully:', result.id);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Failed to send welcome email:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return false;
    }
  }

  // Отправка уведомления о новом ответе на заявку
  async sendCallbackReplyEmail(replyData: CallbackReplyData): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        console.log('📧 Email service not configured (RESEND_API_KEY not set)');
        return false;
      }

      const template = getCallbackReplyEmailTemplate({
        ...replyData,
        dashboardUrl: `${this.config.baseUrl}/dashboard`
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [replyData.email],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Callback reply email sent successfully:', result.id);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Failed to send callback reply email:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending callback reply email:', error);
      return false;
    }
  }

  // Отправка уведомления об изменении статуса заявки
  async sendCallbackStatusEmail(statusData: CallbackStatusData): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        console.log('📧 Email service not configured (RESEND_API_KEY not set)');
        return false;
      }

      const template = getCallbackStatusEmailTemplate({
        ...statusData,
        dashboardUrl: `${this.config.baseUrl}/dashboard`
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [statusData.email],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Callback status email sent successfully:', result.id);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Failed to send callback status email:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending callback status email:', error);
      return false;
    }
  }

  // Проверка конфигурации email сервиса
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  // Получение информации о конфигурации
  getConfig(): Partial<EmailServiceConfig> {
    return {
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey ? '***configured***' : 'not configured'
    };
  }
}

// Экспортируем singleton instance
export const emailService = new EmailService();

// Экспортируем функцию sendEmail для совместимости
export const sendEmail = emailService.sendEmail.bind(emailService);

// Экспортируем типы для использования в других модулях
export type { UserWelcomeData, CallbackReplyData, CallbackStatusData };
