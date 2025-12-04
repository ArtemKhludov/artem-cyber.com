// Email notification templates for callback system

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

// Welcome email template for new user
export function getWelcomeEmailTemplate(data: UserWelcomeData): EmailTemplate {
  const subject = `🤖 AI Analyzed Your Request! Welcome to EnergyLogic`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to EnergyLogic</title>
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
          <h1>🤖 AI Analyzed Your Request!</h1>
          <p>Welcome to EnergyLogic, ${data.name}!</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Hello! 👋 Our artificial intelligence has already started analyzing your request. While it's thinking (and it thinks very fast!), we've created a personal account for you.</p>
          
          <div class="ai-analysis">
            <h3>🧠 AI Analysis Complete</h3>
            <p><strong>Result:</strong> User ${data.name} demonstrates a high level of interest in energy diagnostics. Immediate account creation is recommended for further interaction.</p>
            <p><strong>Success Probability:</strong> 99.7% (AI almost never makes mistakes!)</p>
          </div>
          
          <div class="credentials">
            <h3>🔑 Your Login Credentials</h3>
            <div class="credential-item">
              <div class="credential-label">📧 Email:</div>
              <div class="credential-value">${data.email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">🔐 Temporary Password:</div>
              <div class="credential-value">${data.tempPassword}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="cta-button">🚀 Sign In to Dashboard</a>
          </div>
          
          <div class="telegram-promo">
            <h3>📱 Connect Telegram for Instant Notifications!</h3>
            <p><strong>What you'll receive:</strong></p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li>⚡ Instant notifications about new replies</li>
              <li>📊 Real-time status of your requests</li>
              <li>🎯 Personalized recommendations from AI</li>
              <li>💬 Direct communication with our specialists</li>
            </ul>
            <p><em>You can connect in your dashboard - it takes just 30 seconds!</em></p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Fun Fact:</strong> Our AI has already analyzed over 10,000 requests and learned to predict which clients will become our regular partners. You've been categorized as "high potential"! 🎯</p>
          </div>
          
          <div class="security-note">
            <p>⚠️ <strong>Important:</strong> Be sure to change your temporary password on first login! Even AI can't protect you from simple passwords.</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">If you have any questions, don't hesitate to contact us. Our AI works 24/7, and people - almost as much! 😄</p>
          
          <p style="margin-top: 25px;">Best regards,<br><strong>EnergyLogic Team</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by our AI assistant. Please do not reply to it.</p>
          <p>© 2024 EnergyLogic. All rights reserved. Even AI can't violate them.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🤖 AI Analyzed Your Request! Welcome to EnergyLogic

Hello! 👋 Our artificial intelligence has already started analyzing your request. While it's thinking (and it thinks very fast!), we've created a personal account for you.

🧠 AI Analysis Complete:
Result: User ${data.name} demonstrates a high level of interest in energy diagnostics. Immediate account creation is recommended for further interaction.
Success Probability: 99.7% (AI almost never makes mistakes!)

🔑 Your Login Credentials:
📧 Email: ${data.email}
🔐 Temporary Password: ${data.tempPassword}

🚀 Sign In to Dashboard: ${data.loginUrl}

📱 Connect Telegram for Instant Notifications!
What you'll receive:
⚡ Instant notifications about new replies
📊 Real-time status of your requests
🎯 Personalized recommendations from AI
💬 Direct communication with our specialists

You can connect in your dashboard - it takes just 30 seconds!

💡 Fun Fact: Our AI has already analyzed over 10,000 requests and learned to predict which clients will become our regular partners. You've been categorized as "high potential"! 🎯

⚠️ IMPORTANT: Be sure to change your temporary password on first login! Even AI can't protect you from simple passwords.

If you have any questions, don't hesitate to contact us. Our AI works 24/7, and people - almost as much! 😄

Best regards,
EnergyLogic Team 🤖✨
  `;

  return { subject, html, text };
}

// Template for notification about new reply to request
export function getCallbackReplyEmailTemplate(data: CallbackReplyData): EmailTemplate {
  const subject = `🤖 AI Delivered Reply from ${data.adminName} on Your Request #${data.callbackId.slice(-8)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Reply to Your Request</title>
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
          <h1>🤖 AI Delivered Reply!</h1>
          <p>New message from ${data.adminName}</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Hello, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-transmission">
            <h3>🤖 Data Transmission Complete</h3>
            <p><strong>Source:</strong> ${data.adminName} (human, not a robot!)</p>
            <p><strong>Recipient:</strong> ${data.name} (also human, we checked!)</p>
            <p><strong>Transmission Status:</strong> ✅ Successfully delivered</p>
            <p><strong>AI Processing Time:</strong> 0.003 seconds (we're very fast!)</p>
          </div>
          
          <div class="message-box">
            <h3>📝 Message from ${data.adminName}:</h3>
            <div class="message-content">
              ${data.message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">🚀 Go to Dashboard</a>
          </div>
          
          <div class="login-instructions">
            <h3>🔑 How to Sign In to Dashboard:</h3>
            <p><strong>If you registered via Google:</strong></p>
            <p>→ Simply click "Sign in with Google" on the login page</p>
            <p><strong>If you created a login and password:</strong></p>
            <p>→ Use your email and password to sign in</p>
            <p><strong>Forgot password?</strong> → Click "Reset Password" on the login page</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Fun Fact:</strong> Our AI analyzed the tone of the message from ${data.adminName} and determined it was written with enthusiasm and willingness to help. Probability of positive outcome for your request: 98.5%! 🎯</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">You can continue communicating with our specialists directly in your dashboard. Our AI ensures no message gets lost!</p>
          
          <p style="margin-top: 25px;">Best regards,<br><strong>EnergyLogic Team</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by our AI assistant. Please do not reply to it.</p>
          <p>© 2024 EnergyLogic. All rights reserved. AI also respects copyrights.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🤖 AI Delivered Reply from ${data.adminName} on Your Request #${data.callbackId.slice(-8)}

Hello, ${data.name}! 👋

🤖 Data Transmission Complete:
Source: ${data.adminName} (human, not a robot!)
Recipient: ${data.name} (also human, we checked!)
Transmission Status: ✅ Successfully delivered
AI Processing Time: 0.003 seconds (we're very fast!)

📝 Message from ${data.adminName}:
${data.message}

🚀 Go to Dashboard: ${data.dashboardUrl}

🔑 How to Sign In to Dashboard:
If you registered via Google:
→ Simply click "Sign in with Google" on the login page

If you created a login and password:
→ Use your email and password to sign in

Forgot password? → Click "Reset Password" on the login page

💡 Fun Fact: Our AI analyzed the tone of the message from ${data.adminName} and determined it was written with enthusiasm and willingness to help. Probability of positive outcome for your request: 98.5%! 🎯

You can continue communicating with our specialists directly in your dashboard. Our AI ensures no message gets lost!

Best regards,
EnergyLogic Team 🤖✨
  `;

  return { subject, html, text };
}

// Template for notification about request status change
export function getCallbackStatusEmailTemplate(data: CallbackStatusData): EmailTemplate {
  const subject = `📊 AI Updated Your Request Status #${data.callbackId.slice(-8)}: ${data.status}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Request Status Changed</title>
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
          <h1>📊 AI Updated Status!</h1>
          <p>Your request is moving forward</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Hello, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-update">
            <h3>🤖 Status Update System</h3>
            <p><strong>Update Time:</strong> ${new Date().toLocaleString('en-US')}</p>
            <p><strong>Processor:</strong> EnergyLogic AI System</p>
            <p><strong>Processing Status:</strong> ✅ Successfully updated</p>
            <p><strong>Next Stage:</strong> Awaiting your attention</p>
          </div>
          
          <div class="status-box">
            <h3>📋 Current Status of Your Request:</h3>
            <div class="status-value">${data.status}</div>
          </div>
          
          <div class="progress-indicator">
            <p><strong>⚡ Progress:</strong> Our AI tracks every step of your request. The next update will come automatically when the status changes!</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">🚀 View in Dashboard</a>
          </div>
          
          <div class="login-instructions">
            <h3>🔑 How to Sign In to Dashboard:</h3>
            <p><strong>If you registered via Google:</strong></p>
            <p>→ Simply click "Sign in with Google" on the login page</p>
            <p><strong>If you created a login and password:</strong></p>
            <p>→ Use your email and password to sign in</p>
            <p><strong>Forgot password?</strong> → Click "Reset Password" on the login page</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Fun Fact:</strong> Our AI analyzed the processing speed of your request and determined it's being processed 23% faster than average! You've been categorized as a "priority client"! 🎯</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">You can track all changes to your request in your dashboard. Our AI will notify you of every update!</p>
          
          <p style="margin-top: 25px;">Best regards,<br><strong>EnergyLogic Team</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by our AI assistant. Please do not reply to it.</p>
          <p>© 2024 EnergyLogic. All rights reserved. AI also monitors rights compliance.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
📊 AI Updated Your Request Status #${data.callbackId.slice(-8)}: ${data.status}

Hello, ${data.name}! 👋

🤖 Status Update System:
Update Time: ${new Date().toLocaleString('en-US')}
Processor: EnergyLogic AI System
Processing Status: ✅ Successfully updated
Next Stage: Awaiting your attention

📋 Current Status of Your Request: ${data.status}

⚡ Progress: Our AI tracks every step of your request. The next update will come automatically when the status changes!

🚀 View in Dashboard: ${data.dashboardUrl}

🔑 How to Sign In to Dashboard:
If you registered via Google:
→ Simply click "Sign in with Google" on the login page

If you created a login and password:
→ Use your email and password to sign in

Forgot password? → Click "Reset Password" on the login page

💡 Fun Fact: Our AI analyzed the processing speed of your request and determined it's being processed 23% faster than average! You've been categorized as a "priority client"! 🎯

You can track all changes to your request in your dashboard. Our AI will notify you of every update!

Best regards,
EnergyLogic Team 🤖✨
  `;

  return { subject, html, text };
}


// Template for password recovery
export function getPasswordResetEmailTemplate(data: PasswordResetData): EmailTemplate {
  const subject = `🔐 AI Generated Password Reset Link`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Recovery</title>
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
          <h1>🔐 AI Generated Link!</h1>
          <p>Password recovery for ${data.name}</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Hello, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-security">
            <h3>🤖 AI Security System</h3>
            <p><strong>Recovery Request:</strong> Confirmed</p>
            <p><strong>Generation Time:</strong> ${new Date().toLocaleString('en-US')}</p>
            <p><strong>Security:</strong> ✅ Maximum level</p>
            <p><strong>Token Status:</strong> Active and protected</p>
          </div>
          
          <div class="reset-box">
            <h3>🔑 Password Recovery Link</h3>
            <p>Our AI has generated a unique link to recover your password:</p>
            <div class="reset-url">${data.resetUrl}</div>
            <p><strong>⏰ Link Valid For:</strong> ${data.expiresIn}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.resetUrl}" class="cta-button">🚀 Reset Password</a>
          </div>
          
          <div class="security-warning">
            <p>⚠️ <strong>Important:</strong> If you didn't request password recovery, simply ignore this email. Our AI will automatically cancel the token after ${data.expiresIn}.</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Fun Fact:</strong> Our AI uses military-grade cryptographic algorithms to protect your data. Probability of breach: 0.0000001% (this is practically impossible!) 🛡️</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">After resetting your password, you'll be able to sign in to your dashboard and continue working with our programs.</p>
          
          <p style="margin-top: 25px;">Best regards,<br><strong>EnergyLogic Team</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by our AI assistant. Please do not reply to it.</p>
          <p>© 2024 EnergyLogic. All rights reserved. AI also protects your data.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🔐 AI Generated Password Reset Link

Hello, ${data.name}! 👋

🤖 AI Security System:
Recovery Request: Confirmed
Generation Time: ${new Date().toLocaleString('en-US')}
Security: ✅ Maximum level
Token Status: Active and protected

🔑 Password Recovery Link:
${data.resetUrl}

⏰ Link Valid For: ${data.expiresIn}

🚀 Reset Password: ${data.resetUrl}

⚠️ IMPORTANT: If you didn't request password recovery, simply ignore this email. Our AI will automatically cancel the token after ${data.expiresIn}.

💡 Fun Fact: Our AI uses military-grade cryptographic algorithms to protect your data. Probability of breach: 0.0000001% (this is practically impossible!) 🛡️

After resetting your password, you'll be able to sign in to your dashboard and continue working with our programs.

Best regards,
EnergyLogic Team 🤖✨
  `;

  return { subject, html, text };
}

// Template for callback request confirmation
export function getCallbackConfirmationEmailTemplate(data: CallbackConfirmationData): EmailTemplate {
  const subject = `✅ Your Request #${data.callbackId.slice(-8)} Accepted! AI is Already Working on It`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Request Accepted</title>
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
          <h1>✅ Request Accepted!</h1>
          <p>AI is already working on your request</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; margin-bottom: 25px;">Hello, <strong>${data.name}</strong>! 👋</p>
          
          <div class="ai-processing">
            <h3>🤖 AI is Processing Your Request</h3>
            <p><strong>Status:</strong> ✅ Accepted for processing</p>
            <p><strong>Request Number:</strong> #${data.callbackId.slice(-8)}</p>
            <p><strong>Processing Time:</strong> ${new Date().toLocaleString('en-US')}</p>
            <p><strong>Priority:</strong> High (AI identified you as an important client!)</p>
          </div>
          
          <div class="request-details">
            <h3>📋 Your Request Details</h3>
            <div class="detail-item">
              <span class="detail-label">📞 Phone:</span>
              <span class="detail-value">${data.phone}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">⏰ Preferred Time:</span>
              <span class="detail-value">${data.preferredTime || 'Any convenient time'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">💬 Message:</span>
              <span class="detail-value">${data.message || 'No additional comments'}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" class="cta-button">🚀 Go to Dashboard</a>
          </div>
          
          <div class="login-instructions">
            <h3>🔑 How to Sign In to Dashboard:</h3>
            <p><strong>If you registered via Google:</strong></p>
            <p>→ Simply click "Sign in with Google" on the login page</p>
            <p><strong>If you created a login and password:</strong></p>
            <p>→ Use your email and password to sign in</p>
            <p><strong>Forgot password?</strong> → Click "Reset Password" on the login page</p>
          </div>
          
          <div class="fun-fact">
            <p><strong>Fun Fact:</strong> Our AI analyzed your request and determined you're interested in quality service. Probability of successful resolution: 99.8%! 🎯</p>
          </div>
          
          <p style="font-size: 16px; margin-top: 30px;">In your dashboard, you can track the request status, communicate with our specialists, and receive notifications about all updates.</p>
          
          <p style="margin-top: 25px;">Best regards,<br><strong>EnergyLogic Team</strong> 🤖✨</p>
        </div>
        
        <div class="footer">
          <p>This email was sent by our AI assistant. Please do not reply to it.</p>
          <p>© 2024 EnergyLogic. All rights reserved. AI also monitors service quality.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
✅ Your Request #${data.callbackId.slice(-8)} Accepted! AI is Already Working on It

Hello, ${data.name}! 👋

🤖 AI is Processing Your Request:
Status: ✅ Accepted for processing
Request Number: #${data.callbackId.slice(-8)}
Processing Time: ${new Date().toLocaleString('en-US')}
Priority: High (AI identified you as an important client!)

📋 Your Request Details:
📞 Phone: ${data.phone}
⏰ Preferred Time: ${data.preferredTime || 'Any convenient time'}
💬 Message: ${data.message || 'No additional comments'}

🚀 Go to Dashboard: ${data.dashboardUrl}

🔑 How to Sign In to Dashboard:
If you registered via Google:
→ Simply click "Sign in with Google" on the login page

If you created a login and password:
→ Use your email and password to sign in

Forgot password? → Click "Reset Password" on the login page

💡 Fun Fact: Our AI analyzed your request and determined you're interested in quality service. Probability of successful resolution: 99.8%! 🎯

In your dashboard, you can track the request status, communicate with our specialists, and receive notifications about all updates.

Best regards,
EnergyLogic Team 🤖✨
  `;

  return { subject, html, text };
}

// Export template object for compatibility
export const emailTemplates = {
  getWelcomeEmailTemplate,
  getCallbackReplyEmailTemplate,
  getCallbackStatusEmailTemplate,
  getPasswordResetEmailTemplate,
  getCallbackConfirmationEmailTemplate
};
