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

export interface PasswordResetData {
  name: string;
  email: string;
  resetToken: string;
  resetUrl: string;
  expiresIn: string;
}

export interface CallbackConfirmationData {
  name: string;
  email: string;
  callbackId: string;
  message: string;
  phone: string;
  preferredTime: string;
  dashboardUrl: string;
  loginUrl: string;
}

// Шаблон приветственного письма для нового пользователя
export function getWelcomeEmailTemplate(data: UserWelcomeData): EmailTemplate {
  const subject = `🤖 ИИ проанализировал вашу заявку! Добро пожаловать в EnergyLogic`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Добро пожаловать в EnergyLogic</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 30px; text-align: center; position: relative; }
        .header::before { content: '🤖'; font-size: 60px; position: absolute; top: 20px; right: 30px; opacity: 0.3; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 18px; }
        .content { padding: 40px 30px; }
        .ai-analysis { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .ai-analysis::before { content: '🧠'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .ai-analysis h3 { color: #0369a1; margin: 0 0 15px 0; font-size: 20px; }
        .credentials { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .credentials::before { content: '🔑'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .credentials h3 { color: #92400e; margin: 0 0 15px 0; font-size: 20px; }
        .credential-item { margin: 15px 0; }
        .credential-label { font-weight: 600; color: #92400e; font-size: 16px; }
        .credential-value { font-family: 'Courier New', monospace; background: white; padding: 12px 15px; border-radius: 8px; border: 2px solid #d97706; font-size: 14px; word-break: break-all; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 18px 35px; border-radius: 12px; font-weight: 600; margin: 25px 0; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .telegram-promo { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border: 2px solid #0ea5e9; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .telegram-promo::before { content: '📱'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .telegram-promo h3 { color: #0369a1; margin: 0 0 15px 0; font-size: 20px; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .security-note { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fca5a5; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .security-note::before { content: '⚠️'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .security-note p { margin: 0; color: #dc2626; font-size: 15px; font-weight: 600; }
        .fun-fact { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .fun-fact::before { content: '💡'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .fun-fact p { margin: 0; color: #15803d; font-size: 15px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤖 ИИ проанализировал вашу заявку!</h1>
          <p>Добро пожаловать в EnergyLogic, ${data.name}!</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Привет! 👋 Наш искусственный интеллект уже начал анализировать вашу заявку. Пока он думает (а он думает очень быстро!), мы создали для вас личный кабинет.</p>
          
          <div class="ai-analysis">
            <h3>🧠 Анализ ИИ завершен</h3>
            <p><strong>Результат:</strong> Пользователь ${data.name} демонстрирует высокий уровень заинтересованности в энергетической диагностике. Рекомендуется немедленное создание личного кабинета для дальнейшего взаимодействия.</p>
            <p><strong>Вероятность успешного сотрудничества:</strong> 99.7% (ИИ почти никогда не ошибается!)</p>
          </div>
          
          <div class="credentials">
            <h3>🔑 Ваши данные для входа</h3>
            <div class="credential-item">
              <div class="credential-label">📧 Email:</div>
              <div class="credential-value">${data.email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">🔐 Временный пароль:</div>
              <div class="credential-value">${data.tempPassword}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="cta-button">🚀 Войти в личный кабинет</a>
          </div>
          
          <div class="telegram-promo">
            <h3>📱 Подключите Telegram для мгновенных уведомлений!</h3>
            <p><strong>Что вы будете получать:</strong></p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li>⚡ Мгновенные уведомления о новых ответах</li>
              <li>📊 Статус ваших заявок в реальном времени</li>
              <li>🎯 Персональные рекомендации от ИИ</li>
              <li>💬 Прямое общение с нашими специалистами</li>
            </ul>
            <p><em>Подключить можно в личном кабинете - это займет 30 секунд!</em></p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Интересный факт:</strong> Наш ИИ проанализировал уже более 10,000 заявок и научился предсказывать, кто из клиентов станет нашими постоянными партнерами. Вы попали в категорию "высокопотенциальных"! 🎯</p>
          </div>
          
          <div class="security-note">
            <p>⚠️ <strong>Важно:</strong> Обязательно смените временный пароль при первом входе! Даже ИИ не может защитить вас от простых паролей.</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">Если у вас возникнут вопросы, не стесняйтесь обращаться к нам. Наш ИИ работает 24/7, а люди - почти столько же! 😄</p>
          
          <p style="margin-top: 25px;">С уважением,<br><strong>Команда EnergyLogic</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено нашим ИИ-помощником. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены. Даже ИИ не может их нарушить.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🤖 ИИ проанализировал вашу заявку! Добро пожаловать в EnergyLogic

Привет! 👋 Наш искусственный интеллект уже начал анализировать вашу заявку. Пока он думает (а он думает очень быстро!), мы создали для вас личный кабинет.

🧠 Анализ ИИ завершен:
Результат: Пользователь ${data.name} демонстрирует высокий уровень заинтересованности в энергетической диагностике. Рекомендуется немедленное создание личного кабинета для дальнейшего взаимодействия.
Вероятность успешного сотрудничества: 99.7% (ИИ почти никогда не ошибается!)

🔑 Ваши данные для входа:
📧 Email: ${data.email}
🔐 Временный пароль: ${data.tempPassword}

🚀 Войти в личный кабинет: ${data.loginUrl}

📱 Подключите Telegram для мгновенных уведомлений!
Что вы будете получать:
⚡ Мгновенные уведомления о новых ответах
📊 Статус ваших заявок в реальном времени
🎯 Персональные рекомендации от ИИ
💬 Прямое общение с нашими специалистами

Подключить можно в личном кабинете - это займет 30 секунд!

💡 Интересный факт: Наш ИИ проанализировал уже более 10,000 заявок и научился предсказывать, кто из клиентов станет нашими постоянными партнерами. Вы попали в категорию "высокопотенциальных"! 🎯

⚠️ ВАЖНО: Обязательно смените временный пароль при первом входе! Даже ИИ не может защитить вас от простых паролей.

Если у вас возникнут вопросы, не стесняйтесь обращаться к нам. Наш ИИ работает 24/7, а люди - почти столько же! 😄

С уважением,
Команда EnergyLogic 🤖✨
  `;

  return { subject, html, text };
}

// Шаблон уведомления о новом ответе на заявку
export function getCallbackReplyEmailTemplate(data: CallbackReplyData): EmailTemplate {
  const subject = `🤖 ИИ передал ответ от ${data.adminName} на вашу заявку #${data.callbackId.slice(-8)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Новый ответ на вашу заявку</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 50px 30px; text-align: center; position: relative; }
        .header::before { content: '💬'; font-size: 60px; position: absolute; top: 20px; right: 30px; opacity: 0.3; animation: bounce 2s ease-in-out infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 18px; }
        .content { padding: 40px 30px; }
        .ai-transmission { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .ai-transmission::before { content: '🤖'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .ai-transmission h3 { color: #15803d; margin: 0 0 15px 0; font-size: 20px; }
        .message-box { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .message-box::before { content: '📝'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .message-box h3 { color: #15803d; margin: 0 0 15px 0; font-size: 20px; }
        .message-content { background: white; padding: 20px; border-radius: 10px; border: 2px solid #bbf7d0; font-size: 16px; line-height: 1.6; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 18px 35px; border-radius: 12px; font-weight: 600; margin: 25px 0; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .login-instructions { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .login-instructions::before { content: '🔑'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .login-instructions h3 { color: #92400e; margin: 0 0 15px 0; font-size: 20px; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .fun-fact { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border: 2px solid #0ea5e9; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .fun-fact::before { content: '💡'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .fun-fact p { margin: 0; color: #0369a1; font-size: 15px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤖 ИИ передал ответ!</h1>
          <p>Новое сообщение от ${data.adminName}</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Привет, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-transmission">
            <h3>🤖 Передача данных завершена</h3>
            <p><strong>Источник:</strong> ${data.adminName} (человек, не робот!)</p>
            <p><strong>Получатель:</strong> ${data.name} (тоже человек, мы проверили!)</p>
            <p><strong>Статус передачи:</strong> ✅ Успешно доставлено</p>
            <p><strong>Время обработки ИИ:</strong> 0.003 секунды (мы очень быстрые!)</p>
          </div>
          
          <div class="message-box">
            <h3>📝 Сообщение от ${data.adminName}:</h3>
            <div class="message-content">
              ${data.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">🚀 Перейти в личный кабинет</a>
          </div>
          
          <div class="login-instructions">
            <h3>🔑 Как войти в личный кабинет:</h3>
            <p><strong>Если вы регистрировались через Google:</strong></p>
            <p>→ Просто нажмите "Войти через Google" на странице входа</p>
            <p><strong>Если вы создавали логин и пароль:</strong></p>
            <p>→ Используйте ваш email и пароль для входа</p>
            <p><strong>Забыли пароль?</strong> → Нажмите "Восстановить пароль" на странице входа</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Интересный факт:</strong> Наш ИИ проанализировал тон сообщения от ${data.adminName} и определил, что он написан с энтузиазмом и готовностью помочь. Вероятность положительного исхода вашего обращения: 98.5%! 🎯</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">Вы можете продолжить общение с нашими специалистами прямо в личном кабинете. Наш ИИ следит за тем, чтобы ни одно сообщение не потерялось!</p>
          
          <p style="margin-top: 25px;">С уважением,<br><strong>Команда EnergyLogic</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено нашим ИИ-помощником. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены. ИИ тоже соблюдает авторские права.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🤖 ИИ передал ответ от ${data.adminName} на вашу заявку #${data.callbackId.slice(-8)}

Привет, ${data.name}! 👋

🤖 Передача данных завершена:
Источник: ${data.adminName} (человек, не робот!)
Получатель: ${data.name} (тоже человек, мы проверили!)
Статус передачи: ✅ Успешно доставлено
Время обработки ИИ: 0.003 секунды (мы очень быстрые!)

📝 Сообщение от ${data.adminName}:
${data.message}

🚀 Перейти в личный кабинет: ${data.dashboardUrl}

🔑 Как войти в личный кабинет:
Если вы регистрировались через Google:
→ Просто нажмите "Войти через Google" на странице входа

Если вы создавали логин и пароль:
→ Используйте ваш email и пароль для входа

Забыли пароль? → Нажмите "Восстановить пароль" на странице входа

💡 Интересный факт: Наш ИИ проанализировал тон сообщения от ${data.adminName} и определил, что он написан с энтузиазмом и готовностью помочь. Вероятность положительного исхода вашего обращения: 98.5%! 🎯

Вы можете продолжить общение с нашими специалистами прямо в личном кабинете. Наш ИИ следит за тем, чтобы ни одно сообщение не потерялось!

С уважением,
Команда EnergyLogic 🤖✨
  `;

  return { subject, html, text };
}

// Шаблон уведомления об изменении статуса заявки
export function getCallbackStatusEmailTemplate(data: CallbackStatusData): EmailTemplate {
  const subject = `📊 ИИ обновил статус вашей заявки #${data.callbackId.slice(-8)}: ${data.status}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Статус заявки изменен</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 50px 30px; text-align: center; position: relative; }
        .header::before { content: '📊'; font-size: 60px; position: absolute; top: 20px; right: 30px; opacity: 0.3; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 18px; }
        .content { padding: 40px 30px; }
        .ai-update { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .ai-update::before { content: '🤖'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .ai-update h3 { color: #1d4ed8; margin: 0 0 15px 0; font-size: 20px; }
        .status-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .status-box::before { content: '📋'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .status-box h3 { color: #1d4ed8; margin: 0 0 15px 0; font-size: 20px; }
        .status-value { background: white; padding: 15px 20px; border-radius: 10px; border: 2px solid #93c5fd; font-weight: 600; color: #1d4ed8; font-size: 18px; text-align: center; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 18px 35px; border-radius: 12px; font-weight: 600; margin: 25px 0; font-size: 16px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .login-instructions { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .login-instructions::before { content: '🔑'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .login-instructions h3 { color: #92400e; margin: 0 0 15px 0; font-size: 20px; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .progress-indicator { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .progress-indicator::before { content: '⚡'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .progress-indicator p { margin: 0; color: #15803d; font-size: 15px; }
        .fun-fact { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border: 2px solid #0ea5e9; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .fun-fact::before { content: '💡'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .fun-fact p { margin: 0; color: #0369a1; font-size: 15px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 ИИ обновил статус!</h1>
          <p>Ваша заявка движется вперед</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Привет, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-update">
            <h3>🤖 Система обновления статуса</h3>
            <p><strong>Время обновления:</strong> ${new Date().toLocaleString('ru-RU')}</p>
            <p><strong>Обработчик:</strong> ИИ-система EnergyLogic</p>
            <p><strong>Статус обработки:</strong> ✅ Успешно обновлено</p>
            <p><strong>Следующий этап:</strong> Ожидание вашего внимания</p>
          </div>
          
          <div class="status-box">
            <h3>📋 Текущий статус вашей заявки:</h3>
            <div class="status-value">${data.status}</div>
          </div>
          
          <div class="progress-indicator">
            <p><strong>⚡ Прогресс:</strong> Наш ИИ отслеживает каждый шаг вашей заявки. Следующее обновление придет автоматически, когда статус изменится!</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">🚀 Посмотреть в личном кабинете</a>
          </div>
          
          <div class="login-instructions">
            <h3>🔑 Как войти в личный кабинет:</h3>
            <p><strong>Если вы регистрировались через Google:</strong></p>
            <p>→ Просто нажмите "Войти через Google" на странице входа</p>
            <p><strong>Если вы создавали логин и пароль:</strong></p>
            <p>→ Используйте ваш email и пароль для входа</p>
            <p><strong>Забыли пароль?</strong> → Нажмите "Восстановить пароль" на странице входа</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Интересный факт:</strong> Наш ИИ проанализировал скорость обработки вашей заявки и определил, что она обрабатывается на 23% быстрее среднего показателя! Вы попали в категорию "приоритетных клиентов"! 🎯</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">Вы можете отслеживать все изменения по вашей заявке в личном кабинете. Наш ИИ уведомит вас о каждом обновлении!</p>
          
          <p style="margin-top: 25px;">С уважением,<br><strong>Команда EnergyLogic</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено нашим ИИ-помощником. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены. ИИ тоже следит за соблюдением прав.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
📊 ИИ обновил статус вашей заявки #${data.callbackId.slice(-8)}: ${data.status}

Привет, ${data.name}! 👋

🤖 Система обновления статуса:
Время обновления: ${new Date().toLocaleString('ru-RU')}
Обработчик: ИИ-система EnergyLogic
Статус обработки: ✅ Успешно обновлено
Следующий этап: Ожидание вашего внимания

📋 Текущий статус вашей заявки: ${data.status}

⚡ Прогресс: Наш ИИ отслеживает каждый шаг вашей заявки. Следующее обновление придет автоматически, когда статус изменится!

🚀 Посмотреть в личном кабинете: ${data.dashboardUrl}

🔑 Как войти в личный кабинет:
Если вы регистрировались через Google:
→ Просто нажмите "Войти через Google" на странице входа

Если вы создавали логин и пароль:
→ Используйте ваш email и пароль для входа

Забыли пароль? → Нажмите "Восстановить пароль" на странице входа

💡 Интересный факт: Наш ИИ проанализировал скорость обработки вашей заявки и определил, что она обрабатывается на 23% быстрее среднего показателя! Вы попали в категорию "приоритетных клиентов"! 🎯

Вы можете отслеживать все изменения по вашей заявке в личном кабинете. Наш ИИ уведомит вас о каждом обновлении!

С уважением,
Команда EnergyLogic 🤖✨
  `;

  return { subject, html, text };
}


// Шаблон для восстановления пароля
export function getPasswordResetEmailTemplate(data: PasswordResetData): EmailTemplate {
  const subject = `🔐 ИИ сгенерировал ссылку для восстановления пароля`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Восстановление пароля</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 50px 30px; text-align: center; position: relative; }
        .header::before { content: '🔐'; font-size: 60px; position: absolute; top: 20px; right: 30px; opacity: 0.3; animation: shake 2s ease-in-out infinite; }
        @keyframes shake { 0%, 100% { transform: translateX(0px); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 18px; }
        .content { padding: 40px 30px; }
        .ai-security { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .ai-security::before { content: '🤖'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .ai-security h3 { color: #92400e; margin: 0 0 15px 0; font-size: 20px; }
        .reset-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .reset-box::before { content: '🔑'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .reset-box h3 { color: #92400e; margin: 0 0 15px 0; font-size: 20px; }
        .reset-url { background: white; padding: 15px 20px; border-radius: 10px; border: 2px solid #d97706; font-family: 'Courier New', monospace; font-size: 14px; word-break: break-all; margin: 15px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 18px 35px; border-radius: 12px; font-weight: 600; margin: 25px 0; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .security-warning { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fca5a5; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .security-warning::before { content: '⚠️'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .security-warning p { margin: 0; color: #dc2626; font-size: 15px; font-weight: 600; }
        .fun-fact { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border: 2px solid #0ea5e9; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .fun-fact::before { content: '💡'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .fun-fact p { margin: 0; color: #0369a1; font-size: 15px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 ИИ сгенерировал ссылку!</h1>
          <p>Восстановление пароля для ${data.name}</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Привет, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-security">
            <h3>🤖 Система безопасности ИИ</h3>
            <p><strong>Запрос на восстановление:</strong> Подтвержден</p>
            <p><strong>Время генерации:</strong> ${new Date().toLocaleString('ru-RU')}</p>
            <p><strong>Безопасность:</strong> ✅ Максимальный уровень</p>
            <p><strong>Статус токена:</strong> Активен и защищен</p>
          </div>
          
          <div class="reset-box">
            <h3>🔑 Ссылка для восстановления пароля</h3>
            <p>Наш ИИ сгенерировал уникальную ссылку для восстановления вашего пароля:</p>
            <div class="reset-url">${data.resetUrl}</div>
            <p><strong>⏰ Ссылка действительна:</strong> ${data.expiresIn}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.resetUrl}" class="cta-button">🚀 Восстановить пароль</a>
          </div>
          
          <div class="security-warning">
            <p>⚠️ <strong>Важно:</strong> Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Наш ИИ автоматически отменит токен через ${data.expiresIn}.</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Интересный факт:</strong> Наш ИИ использует криптографические алгоритмы военного уровня для защиты ваших данных. Вероятность взлома: 0.0000001% (это практически невозможно!) 🛡️</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">После восстановления пароля вы сможете войти в личный кабинет и продолжить работу с нашими программами.</p>
          
          <p style="margin-top: 25px;">С уважением,<br><strong>Команда EnergyLogic</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено нашим ИИ-помощником. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены. ИИ тоже защищает ваши данные.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🔐 ИИ сгенерировал ссылку для восстановления пароля

Привет, ${data.name}! 👋

🤖 Система безопасности ИИ:
Запрос на восстановление: Подтвержден
Время генерации: ${new Date().toLocaleString('ru-RU')}
Безопасность: ✅ Максимальный уровень
Статус токена: Активен и защищен

🔑 Ссылка для восстановления пароля:
${data.resetUrl}

⏰ Ссылка действительна: ${data.expiresIn}

🚀 Восстановить пароль: ${data.resetUrl}

⚠️ ВАЖНО: Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Наш ИИ автоматически отменит токен через ${data.expiresIn}.

💡 Интересный факт: Наш ИИ использует криптографические алгоритмы военного уровня для защиты ваших данных. Вероятность взлома: 0.0000001% (это практически невозможно!) 🛡️

После восстановления пароля вы сможете войти в личный кабинет и продолжить работу с нашими программами.

С уважением,
Команда EnergyLogic 🤖✨
  `;

  return { subject, html, text };
}

// Шаблон подтверждения заявки на callback
export function getCallbackConfirmationEmailTemplate(data: CallbackConfirmationData): EmailTemplate {
  const subject = `✅ Ваша заявка #${data.callbackId.slice(-8)} принята! ИИ уже работает над ней`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Заявка принята</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 50px 30px; text-align: center; position: relative; }
        .header::before { content: '✅'; font-size: 60px; position: absolute; top: 20px; right: 30px; opacity: 0.3; animation: checkmark 2s ease-in-out infinite; }
        @keyframes checkmark { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { margin: 15px 0 0 0; opacity: 0.9; font-size: 18px; }
        .content { padding: 40px 30px; }
        .ai-processing { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .ai-processing::before { content: '🤖'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .ai-processing h3 { color: #15803d; margin: 0 0 15px 0; font-size: 20px; }
        .request-details { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .request-details::before { content: '📋'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .request-details h3 { color: #15803d; margin: 0 0 15px 0; font-size: 20px; }
        .detail-item { margin: 10px 0; display: flex; justify-content: space-between; }
        .detail-label { font-weight: 600; color: #15803d; }
        .detail-value { color: #333; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 18px 35px; border-radius: 12px; font-weight: 600; margin: 25px 0; font-size: 16px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .login-instructions { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 15px; padding: 25px; margin: 25px 0; position: relative; }
        .login-instructions::before { content: '🔑'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .login-instructions h3 { color: #92400e; margin: 0 0 15px 0; font-size: 20px; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        .fun-fact { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border: 2px solid #0ea5e9; border-radius: 15px; padding: 20px; margin: 25px 0; position: relative; }
        .fun-fact::before { content: '💡'; font-size: 24px; position: absolute; top: -12px; left: 20px; background: white; padding: 0 10px; }
        .fun-fact p { margin: 0; color: #0369a1; font-size: 15px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Заявка принята!</h1>
          <p>ИИ уже работает над вашим запросом</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Привет, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-processing">
            <h3>🤖 ИИ обрабатывает вашу заявку</h3>
            <p><strong>Статус:</strong> ✅ Принята в работу</p>
            <p><strong>Номер заявки:</strong> #${data.callbackId.slice(-8)}</p>
            <p><strong>Время обработки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
            <p><strong>Приоритет:</strong> Высокий (ИИ определил вас как важного клиента!)</p>
          </div>
          
          <div class="request-details">
            <h3>📋 Детали вашей заявки</h3>
            <div class="detail-item">
              <span class="detail-label">📞 Телефон:</span>
              <span class="detail-value">${data.phone}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">⏰ Предпочтительное время:</span>
              <span class="detail-value">${data.preferredTime || 'Любое удобное время'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">💬 Сообщение:</span>
              <span class="detail-value">${data.message || 'Без дополнительных комментариев'}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">🚀 Перейти в личный кабинет</a>
          </div>
          
          <div class="login-instructions">
            <h3>🔑 Как войти в личный кабинет:</h3>
            <p><strong>Если вы регистрировались через Google:</strong></p>
            <p>→ Просто нажмите "Войти через Google" на странице входа</p>
            <p><strong>Если вы создавали логин и пароль:</strong></p>
            <p>→ Используйте ваш email и пароль для входа</p>
            <p><strong>Забыли пароль?</strong> → Нажмите "Восстановить пароль" на странице входа</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Интересный факт:</strong> Наш ИИ проанализировал вашу заявку и определил, что вы заинтересованы в качественном сервисе. Вероятность успешного решения вашего вопроса: 99.8%! 🎯</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">В личном кабинете вы сможете отслеживать статус заявки, общаться с нашими специалистами и получать уведомления о всех обновлениях.</p>
          
          <p style="margin-top: 25px;">С уважением,<br><strong>Команда EnergyLogic</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>Это письмо отправлено нашим ИИ-помощником. Пожалуйста, не отвечайте на него.</p>
          <p>© 2024 EnergyLogic. Все права защищены. ИИ тоже следит за качеством сервиса.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
✅ Ваша заявка #${data.callbackId.slice(-8)} принята! ИИ уже работает над ней

Привет, ${data.name}! 👋

🤖 ИИ обрабатывает вашу заявку:
Статус: ✅ Принята в работу
Номер заявки: #${data.callbackId.slice(-8)}
Время обработки: ${new Date().toLocaleString('ru-RU')}
Приоритет: Высокий (ИИ определил вас как важного клиента!)

📋 Детали вашей заявки:
📞 Телефон: ${data.phone}
⏰ Предпочтительное время: ${data.preferredTime || 'Любое удобное время'}
💬 Сообщение: ${data.message || 'Без дополнительных комментариев'}

🚀 Перейти в личный кабинет: ${data.dashboardUrl}

🔑 Как войти в личный кабинет:
Если вы регистрировались через Google:
→ Просто нажмите "Войти через Google" на странице входа

Если вы создавали логин и пароль:
→ Используйте ваш email и пароль для входа

Забыли пароль? → Нажмите "Восстановить пароль" на странице входа

💡 Интересный факт: Наш ИИ проанализировал вашу заявку и определил, что вы заинтересованы в качественном сервисе. Вероятность успешного решения вашего вопроса: 99.8%! 🎯

В личном кабинете вы сможете отслеживать статус заявки, общаться с нашими специалистами и получать уведомления о всех обновлениях.

С уважением,
Команда EnergyLogic 🤖✨
  `;

  return { subject, html, text };
}

// Экспортируем объект с шаблонами для совместимости
export const emailTemplates = {
  getWelcomeEmailTemplate,
  getCallbackReplyEmailTemplate,
  getCallbackStatusEmailTemplate,
  getPasswordResetEmailTemplate,
  getCallbackConfirmationEmailTemplate
};
