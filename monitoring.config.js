module.exports = {
  // Monitoring settings
  healthCheck: {
    interval: 30 * 60 * 1000, // 30 minutes
    endpoints: [
      'https://energylogic-ai.com',
      'https://energylogic-ai.com/catalog',
      'https://energylogic-ai.com/api/auth/me'
    ],
    timeout: 10000,
    retries: 3
  },

  // Notification settings
  notifications: {
    telegram: {
      enabled: true,
      chatId: process.env.TELEGRAM_CHAT_ID,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      threadId: process.env.TELEGRAM_THREAD_ISSUES
    },
    email: {
      enabled: false, // Enable when email is configured
      recipients: ['admin@energylogic-ai.com']
    }
  },

  // Cleanup settings
  cleanup: {
    sessions: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      interval: 24 * 60 * 60 * 1000 // 24 hours
    },
    logs: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      interval: 24 * 60 * 60 * 1000 // 24 hours
    },
    tempFiles: {
      enabled: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      interval: 6 * 60 * 60 * 1000 // 6 hours
    }
  },

  // Report settings
  reports: {
    daily: {
      enabled: true,
      time: '09:00', // 9:00 AM
      timezone: 'Europe/Moscow'
    },
    weekly: {
      enabled: true,
      day: 'monday', // Monday
      time: '10:00'
    }
  }
}
