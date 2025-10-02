// Шаблоны email уведомлений для системы callback

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface UserWelcomeData {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export interface CallbackReplyData {
  name: string;
  email: string;
  adminName: string;
  message: string;
  callbackId: string;
  dashboardUrl: string;
}

export interface CallbackStatusData {
  name: string;
  email: string;
  status: string;
  callbackId: string;
  dashboardUrl: string;
}

// Шаблон приветственного письма для нового пользователя
export function getWelcomeEmailTemplate(data: UserWelcomeData): EmailTemplate {
  const subject = `Добро пожаловать в EnergyLogic! Ваш аккаунт создан`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Добро пожаловать в EnergyLogic</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 40px 30px; }
        .welcome-box { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credentials { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credentials h3 { color: #92400e; margin: 0 0 15px 0; font-size: 18px; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: 600; color: #92400e; }
        .credential-value { font-family: monospace; background: white; padding: 8px 12px; border-radius: 4px; border: 1px solid #d97706; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .security-note { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .security-note p { margin: 0; color: #dc2626; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Добро пожаловать в EnergyLogic!</h1>
          <p>Ваш аккаунт успешно создан</p>
        </div>
        
        <div class="content">
          <p>Здравствуйте, <strong>${data.name}</strong>!</p>
          
          <p>Спасибо за ваш интерес к нашим программам! Мы получили вашу заявку и автоматически создали для вас личный кабинет.</p>
          
          <div class="welcome-box">
            <h3>🎯 Что дальше?</h3>
            <ul>
              <li>Войдите в личный кабинет с данными ниже</li>
              <li>Смените временный пароль на постоянный</li>
              <li>Просматривайте статус ваших заявок</li>
              <li>Общайтесь с нашими специалистами</li>
            </ul>
          </div>
          
          <div class="credentials">
            <h3>🔐 Данные для входа</h3>
            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${data.email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Временный пароль:</div>
              <div class="credential-value">${data.tempPassword}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="cta-button">Войти в личный кабинет</a>
          </div>
          
          <div class="security-note">
            <p>⚠️ <strong>Важно:</strong> Обязательно смените временный пароль при первом входе в систему!</p>
          </div>
          
          <p>Если у вас возникнут вопросы, не стесняйтесь обращаться к нам. Мы всегда готовы помочь!</p>
          
          <p>С уважением,<br>Команда EnergyLogic</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Добро пожаловать в EnergyLogic!

Здравствуйте, ${data.name}!

Спасибо за ваш интерес к нашим программам! Мы получили вашу заявку и автоматически создали для вас личный кабинет.

Данные для входа:
Email: ${data.email}
Временный пароль: ${data.tempPassword}

Войти в личный кабинет: ${data.loginUrl}

ВАЖНО: Обязательно смените временный пароль при первом входе в систему!

Если у вас возникнут вопросы, не стесняйтесь обращаться к нам.

С уважением,
Команда EnergyLogic
  `;
  
  return { subject, html, text };
}

// Шаблон уведомления о новом ответе на заявку
export function getCallbackReplyEmailTemplate(data: CallbackReplyData): EmailTemplate {
  const subject = `Новый ответ на вашу заявку #${data.callbackId.slice(-8)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Новый ответ на вашу заявку</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .message-box { background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .message-box h3 { color: #15803d; margin: 0 0 15px 0; font-size: 18px; }
        .message-content { background: white; padding: 15px; border-radius: 6px; border: 1px solid #bbf7d0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 Новый ответ на вашу заявку</h1>
        </div>
        
        <div class="content">
          <p>Здравствуйте, <strong>${data.name}</strong>!</p>
          
          <p>Мы получили ответ от нашего специалиста <strong>${data.adminName}</strong> на вашу заявку.</p>
          
          <div class="message-box">
            <h3>📝 Ответ специалиста:</h3>
            <div class="message-content">
              ${data.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">Перейти в личный кабинет</a>
          </div>
          
          <p>Вы можете продолжить общение с нашими специалистами прямо в личном кабинете.</p>
          
          <p>С уважением,<br>Команда EnergyLogic</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Новый ответ на вашу заявку

Здравствуйте, ${data.name}!

Мы получили ответ от нашего специалиста ${data.adminName} на вашу заявку.

Ответ специалиста:
${data.message}

Перейти в личный кабинет: ${data.dashboardUrl}

Вы можете продолжить общение с нашими специалистами прямо в личном кабинете.

С уважением,
Команда EnergyLogic
  `;
  
  return { subject, html, text };
}

// Шаблон уведомления об изменении статуса заявки
export function getCallbackStatusEmailTemplate(data: CallbackStatusData): EmailTemplate {
  const subject = `Статус вашей заявки #${data.callbackId.slice(-8)} изменен`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Статус заявки изменен</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .status-box { background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .status-box h3 { color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px; }
        .status-value { background: white; padding: 10px 15px; border-radius: 6px; border: 1px solid #93c5fd; font-weight: 600; color: #1d4ed8; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Статус заявки обновлен</h1>
        </div>
        
        <div class="content">
          <p>Здравствуйте, <strong>${data.name}</strong>!</p>
          
          <p>Статус вашей заявки был изменен.</p>
          
          <div class="status-box">
            <h3>📊 Новый статус:</h3>
            <div class="status-value">${data.status}</div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">Посмотреть в личном кабинете</a>
          </div>
          
          <p>Вы можете отслеживать все изменения по вашей заявке в личном кабинете.</p>
          
          <p>С уважением,<br>Команда EnergyLogic</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Статус заявки изменен

Здравствуйте, ${data.name}!

Статус вашей заявки был изменен.

Новый статус: ${data.status}

Посмотреть в личном кабинете: ${data.dashboardUrl}

Вы можете отслеживать все изменения по вашей заявке в личном кабинете.

С уважением,
Команда EnergyLogic
  `;
  
  return { subject, html, text };
}


// Экспортируем объект с шаблонами для совместимости
export const emailTemplates = {
  getWelcomeEmailTemplate,
  getCallbackReplyEmailTemplate,
  getCallbackStatusEmailTemplate
};
