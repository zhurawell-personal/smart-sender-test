import { request } from '../../shared/api/apiClient.ts'
import type { Webhook, WebhookList } from '../../shared/api/types.ts'

// load one page of webhooks using the current search
export function getWebhooks(page: number, search: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
    search,
  })

  return request<WebhookList>(`/v1/webhooks?${params}`)
}

// save the edited name and url
export function updateWebhook(
  id: number,
  values: Pick<Webhook, 'name' | 'url'>,
) {
  return request<Webhook>(`/v1/webhooks/${id}`, {
    method: 'PUT',
    body: values,
  })
}