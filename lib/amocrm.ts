interface AmoCRMConfig {
  domain: string
  clientId: string
  clientSecret: string
  redirectUri: string
  accessToken?: string
  refreshToken?: string
}

interface CallbackRequest {
  id: string
  name: string
  phone: string
  email?: string
  preferred_time?: string
  message?: string
  source_page: string
  created_at: string
}

interface AmoContact {
  name: string
  phone: string
  email?: string
}

interface AmoLead {
  name: string
  price?: number
  source?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  custom_fields?: Array<{
    id: number
    values: Array<{
      value: string
    }>
  }>
}

class AmoCRM {
  private config: AmoCRMConfig
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor(config: AmoCRMConfig) {
    this.config = config
    this.accessToken = config.accessToken || null
    this.refreshToken = config.refreshToken || null
  }

  // Получение токена доступа
  async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Access token not available. Please authenticate first.')
    }
    return this.accessToken
  }

  // Обновление токена
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('Refresh token not available')
    }

    const response = await fetch(`https://${this.config.domain}/oauth2/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        redirect_uri: this.config.redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh access token')
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token

    // Сохраняем токены в базу данных или переменные окружения
    await this.saveTokens(data.access_token, data.refresh_token)
  }

  // Сохранение токенов
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    // Здесь можно сохранить токены в базу данных
    // или обновить переменные окружения
    console.log('Tokens saved:', { accessToken, refreshToken })
  }

  // Создание контакта
  async createContact(contact: AmoContact): Promise<number> {
    const token = await this.getAccessToken()

    const response = await fetch(`https://${this.config.domain}/api/v4/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          name: contact.name,
          custom_fields_values: [
            {
              field_id: 123456, // ID поля телефона (нужно настроить под вашу AmoCRM)
              values: [
                {
                  value: contact.phone,
                  enum_code: 'WORK'
                }
              ]
            },
            ...(contact.email ? [{
              field_id: 123457, // ID поля email (нужно настроить под вашу AmoCRM)
              values: [
                {
                  value: contact.email,
                  enum_code: 'WORK'
                }
              ]
            }] : [])
          ]
        }
      ])
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create contact: ${error}`)
    }

    const data = await response.json()
    return data[0].id
  }

  // Создание сделки
  async createLead(lead: AmoLead, contactId?: number): Promise<number> {
    const token = await this.getAccessToken()

    const leadData: any = {
      name: lead.name,
      price: lead.price || 0,
      custom_fields_values: [
        {
          field_id: 123458, // ID поля источника (нужно настроить)
          values: [
            {
              value: lead.source || 'Website'
            }
          ]
        },
        ...(lead.utm_source ? [{
          field_id: 123459, // ID поля UTM Source
          values: [{ value: lead.utm_source }]
        }] : []),
        ...(lead.utm_medium ? [{
          field_id: 123460, // ID поля UTM Medium
          values: [{ value: lead.utm_medium }]
        }] : []),
        ...(lead.utm_campaign ? [{
          field_id: 123461, // ID поля UTM Campaign
          values: [{ value: lead.utm_campaign }]
        }] : [])
      ]
    }

    // Добавляем связанный контакт
    if (contactId) {
      leadData._embedded = {
        contacts: [{ id: contactId }]
      }
    }

    const response = await fetch(`https://${this.config.domain}/api/v4/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([leadData])
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create lead: ${error}`)
    }

    const data = await response.json()
    return data[0].id
  }

  // Обработка заявки на обратный звонок
  async processCallbackRequest(request: CallbackRequest): Promise<{
    contactId: number
    leadId: number
  }> {
    try {
      // 1. Создаем контакт
      const contactId = await this.createContact({
        name: request.name,
        phone: request.phone,
        email: request.email
      })

      // 2. Создаем сделку
      const leadName = `Заявка на обратный звонок - ${request.name}`
      const leadId = await this.createLead({
        name: leadName,
        source: request.source_page,
        custom_fields: [
          {
            id: 123462, // ID поля "Удобное время"
            values: request.preferred_time ? [{ value: request.preferred_time }] : []
          },
          {
            id: 123463, // ID поля "Сообщение"
            values: request.message ? [{ value: request.message }] : []
          }
        ]
      }, contactId)

      // 3. Добавляем задачи (опционально)
      await this.createTask(leadId, contactId, request)

      return { contactId, leadId }

    } catch (error) {
      console.error('AmoCRM processing error:', error)
      throw error
    }
  }

  // Создание задачи
  async createTask(leadId: number, contactId: number, request: CallbackRequest): Promise<void> {
    const token = await this.getAccessToken()

    const taskData = {
      text: `Позвонить клиенту ${request.name} по номеру ${request.phone}`,
      entity_id: leadId,
      entity_type: 'leads',
      complete_till: Math.floor(Date.now() / 1000) + 3600, // Через час
      task_type_id: 1, // ID типа задачи "Звонок"
      responsible_user_id: null, // Будет назначен автоматически
      custom_fields_values: [
        {
          field_id: 123464, // ID поля "Приоритет"
          values: [{ value: 'high' }]
        }
      ]
    }

    const response = await fetch(`https://${this.config.domain}/api/v4/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([taskData])
    })

    if (!response.ok) {
      console.error('Failed to create task:', await response.text())
    }
  }

  // Получение информации о сделке
  async getLead(leadId: number): Promise<any> {
    const token = await this.getAccessToken()

    const response = await fetch(`https://${this.config.domain}/api/v4/leads/${leadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get lead')
    }

    return response.json()
  }

  // Обновление статуса сделки
  async updateLeadStatus(leadId: number, statusId: number): Promise<void> {
    const token = await this.getAccessToken()

    const response = await fetch(`https://${this.config.domain}/api/v4/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status_id: statusId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to update lead status')
    }
  }

  // Получение воронок
  async getPipelines(): Promise<any[]> {
    const token = await this.getAccessToken()

    const response = await fetch(`https://${this.config.domain}/api/v4/leads/pipelines`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get pipelines')
    }

    return response.json()
  }

  // Получение полей
  async getCustomFields(entity: 'contacts' | 'leads'): Promise<any[]> {
    const token = await this.getAccessToken()

    const response = await fetch(`https://${this.config.domain}/api/v4/${entity}/custom_fields`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get ${entity} custom fields`)
    }

    return response.json()
  }
}

// Создание экземпляра AmoCRM
export const amocrm = new AmoCRM({
  domain: process.env.AMOCRM_DOMAIN || '',
  clientId: process.env.AMOCRM_CLIENT_ID || '',
  clientSecret: process.env.AMOCRM_CLIENT_SECRET || '',
  redirectUri: process.env.AMOCRM_REDIRECT_URI || '',
  accessToken: process.env.AMOCRM_ACCESS_TOKEN,
  refreshToken: process.env.AMOCRM_REFRESH_TOKEN,
})

export default amocrm
