export type UserProfile = {
  id: number
  email: string
  first_name: string
  last_name: string
  name: string
}

export type Webhook = {
  id: number
  name: string
  url: string
  active: boolean
  created_at: string
}

export type WebhookList = {
  data: Webhook[]
  paging: {
    pages: { current: number; last: number }
    results: { total: number; limitation: number }
  }
}

export type FieldErrors = Record<string, string[]>
