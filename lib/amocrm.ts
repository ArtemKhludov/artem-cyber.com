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

  // Retrieve access token
  async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Access token not available. Please authenticate first.')
    }
    return this.accessToken
  }

  // Refresh token
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

    // Save tokens to a datastore or environment
    await this.saveTokens(data.access_token, data.refresh_token)
  }

  // Persist tokens
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    // Persist tokens to DB or update env vars as needed
    console.log('Tokens saved:', { accessToken, refreshToken })
  }

  // Create contact
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
              field_id: 123456, // Phone field ID (configure for your AmoCRM)
              values: [
                {
                  value: contact.phone,
                  enum_code: 'WORK'
                }
              ]
            },
            ...(contact.email
              ? [{
                  field_id: 123457, // Email field ID (configure for your AmoCRM)
                  values: [
                    {
                      value: contact.email,
                      enum_code: 'WORK'
                    }
                  ]
                }]
              : [])
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

  // Create lead
  async createLead(lead: AmoLead, contactId?: number): Promise<number> {
    const token = await this.getAccessToken()

    const leadData: any = {
      name: lead.name,
      price: lead.price || 0,
      custom_fields_values: [
        {
          field_id: 123458, // Source field ID (configure)
          values: [
            {
              value: lead.source || 'Website'
            }
          ]
        },
        ...(lead.utm_source
          ? [{
              field_id: 123459, // UTM Source field ID
              values: [{ value: lead.utm_source }]
            }]
          : []),
        ...(lead.utm_medium
          ? [{
              field_id: 123460, // UTM Medium field ID
              values: [{ value: lead.utm_medium }]
            }]
          : []),
        ...(lead.utm_campaign
          ? [{
              field_id: 123461, // UTM Campaign field ID
              values: [{ value: lead.utm_campaign }]
            }]
          : [])
      ]
    }

    // Link contact to the lead
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

  // Process callback request
  async processCallbackRequest(request: CallbackRequest): Promise<{
    contactId: number
    leadId: number
  }> {
    try {
      // 1. Create contact
      const contactId = await this.createContact({
        name: request.name,
        phone: request.phone,
        email: request.email
      })

      // 2. Create lead
      const leadName = `Callback request - ${request.name}`
      const leadId = await this.createLead({
        name: leadName,
        source: request.source_page,
        custom_fields: [
          {
            id: 123462, // Field ID for "Preferred time"
            values: request.preferred_time ? [{ value: request.preferred_time }] : []
          },
          {
            id: 123463, // Field ID for "Message"
            values: request.message ? [{ value: request.message }] : []
          }
        ]
      }, contactId)

      // 3. Add tasks (optional)
      await this.createTask(leadId, contactId, request)

      return { contactId, leadId }

    } catch (error) {
      console.error('AmoCRM processing error:', error)
      throw error
    }
  }

  // Create task
  async createTask(leadId: number, contactId: number, request: CallbackRequest): Promise<void> {
    const token = await this.getAccessToken()

    const taskData = {
      text: `Call client ${request.name} at ${request.phone}`,
      entity_id: leadId,
      entity_type: 'leads',
      complete_till: Math.floor(Date.now() / 1000) + 3600, // In one hour
      task_type_id: 1, // Task type ID "Call"
      responsible_user_id: null, // Assigned automatically
      custom_fields_values: [
        {
          field_id: 123464, // Field ID "Priority"
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

  // Get lead info
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

  // Update lead status
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

  // Get pipelines
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

  // Get custom fields
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

// Create AmoCRM instance
export const amocrm = new AmoCRM({
  domain: process.env.AMOCRM_DOMAIN || '',
  clientId: process.env.AMOCRM_CLIENT_ID || '',
  clientSecret: process.env.AMOCRM_CLIENT_SECRET || '',
  redirectUri: process.env.AMOCRM_REDIRECT_URI || '',
  accessToken: process.env.AMOCRM_ACCESS_TOKEN,
  refreshToken: process.env.AMOCRM_REFRESH_TOKEN,
})

export default amocrm
