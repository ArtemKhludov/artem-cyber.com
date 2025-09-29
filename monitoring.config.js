module.exports = {
  // Настройки мониторинга
  healthCheck: {
    interval: 30 * 60 * 1000, // 30 минут
    endpoints: [
      'https://energylogic-ai.com',
      'https://energylogic-ai.com/catalog',
      'https://energylogic-ai.com/api/auth/me'
    ],
    timeout: 10000,
    retries: 3
  },

  // Настройки уведомлений
  notifications: {
    telegram: {
      enabled: true,
      chatId: process.env.TELEGRAM_CHAT_ID,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      threadId: process.env.TELEGRAM_THREAD_ISSUES
    },
    email: {
      enabled: false, // Включить когда настроите email
      recipients: ['admin@energylogic-ai.com']
    }
  },

  // Настройки очистки
  cleanup: {
    sessions: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      interval: 24 * 60 * 60 * 1000 // 24 часа
    },
    logs: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      interval: 24 * 60 * 60 * 1000 // 24 часа
    },
    tempFiles: {
      enabled: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
      interval: 6 * 60 * 60 * 1000 // 6 часов
    }
  },

  // Настройки отчетов
  reports: {
    daily: {
      enabled: true,
      time: '09:00', // 9:00 утра
      timezone: 'Europe/Moscow'
    },
    weekly: {
      enabled: true,
      day: 'monday', // Понедельник
      time: '10:00'
    }
  }
}
