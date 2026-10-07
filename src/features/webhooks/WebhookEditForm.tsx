import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ApiError } from '../../shared/api/apiClient.ts'
import type { Webhook } from '../../shared/api/types.ts'
import { updateWebhook } from './webhooksApi.ts'

type WebhookEditFormProps = {
  webhook: Webhook
  onClose: () => void
}

type WebhookFormValues = {
  name: string
  url: string
}

function WebhookEditForm({ webhook, onClose }: WebhookEditFormProps) {
  // get access to the cached webhook list
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormValues>({
    defaultValues: { name: webhook.name, url: webhook.url },
  })
  
  // save changes, then refresh the webhook list
  const updateMutation = useMutation({
    mutationFn: (values: WebhookFormValues) => updateWebhook(webhook.id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      onClose()
    },
  })

  // send form values and show any server validation errors
  async function onSubmit(values: WebhookFormValues) {
    clearErrors()

    try {
      await updateMutation.mutateAsync(values)
    } catch (error) {
      if (error instanceof ApiError) {
        const nameError = error.fieldErrors.name?.[0]
        const urlError = error.fieldErrors.url?.[0]
        if (nameError) setError('name', { type: 'server', message: nameError })
        if (urlError) setError('url', { type: 'server', message: urlError })
        if (!nameError && !urlError) {
          setError('root.server', { type: 'server', message: error.message })
        }
      } else {
        setError('root.server', {
          type: 'server',
          message: 'Unable to save webhook. Please try again.',
        })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-webhook-title"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="edit-webhook-title" className="text-lg font-semibold text-slate-900">
          Edit webhook
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="webhook-name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="webhook-name"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'webhook-name-error' : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.name && <p id="webhook-name-error" className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="webhook-url" className="mb-1 block text-sm font-medium text-slate-700">
              URL
            </label>
            <input
              id="webhook-url"
              {...register('url')}
              aria-invalid={Boolean(errors.url)}
              aria-describedby={errors.url ? 'webhook-url-error' : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.url && <p id="webhook-url-error" className="mt-1 text-sm text-red-600">{errors.url.message}</p>}
          </div>

          {errors.root?.server?.message && (
            <p role="alert" className="text-sm text-red-600">
              {errors.root.server.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default WebhookEditForm