import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Webhook } from '../../shared/api/types.ts'
import { useAuth } from '../auth/authContext.tsx'
import { getWebhooks } from './webhooksApi.ts'
import WebhookEditForm from './WebhookEditForm.tsx'

function WebhooksPage() {
  const { user, logout } = useAuth()
  // read and update list filters in the url
  const [searchParams, setSearchParams] = useSearchParams()
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook | null>(null)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('search') ?? ''
  const [searchState, setSearchState] = useState({ urlSearch: search, input: search })
  const searchInput = searchState.urlSearch === search ? searchState.input : search
  // load the list for the current page and search
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['webhooks', page, search],
    queryFn: () => getWebhooks(page, search),
  })

  // update the url after the user pauses typing
  useEffect(() => {
    if (searchInput === search) return

    // debounce search input to avoid excessive API calls
    const timeout = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams)
      if (searchInput) nextParams.set('search', searchInput)
      else nextParams.delete('search')
      nextParams.delete('page')
      setSearchParams(nextParams)
    }, 300)

    // cancel the old timer when the input changes again
    return () => window.clearTimeout(timeout)
  }, [searchInput, search, searchParams, setSearchParams])

  
  // write the selected page to the url
  function updatePage(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(nextPage))
    setSearchParams(nextParams)
  }

  // run the logout flow from auth context
  async function handleLogout() {
    await logout()
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-600">Signed in as {user?.name}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <label htmlFor="webhook-search" className="mb-2 block text-sm font-medium text-slate-700">
          Search by name
        </label>
        <input
          id="webhook-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchState({ urlSearch: search, input: event.target.value })}
          placeholder="Search webhooks"
          className="mb-5 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        {/* show the request state before the list */}
        {isPending && <p role="status" className="py-8 text-sm text-slate-600">Loading webhooks...</p>}
        {isError && <p role="alert" className="py-8 text-sm text-red-600">{error.message}</p>}
        {!isPending && !isError && data?.data.length === 0 && (
          <p className="py-8 text-sm text-slate-600">No webhooks found.</p>
        )}
        {!isPending && !isError && data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">URL</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((webhook) => (
                    <tr key={webhook.id}>
                      <td className="py-3 pr-4 font-medium text-slate-900">{webhook.name}</td>
                      <td className="max-w-sm truncate py-3 pr-4 text-slate-600">{webhook.url}</td>
                      <td className="py-3 pr-4 text-slate-600">{webhook.active ? 'Active' : 'Inactive'}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setWebhookToEdit(webhook)}
                          className="font-medium text-indigo-700 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                Page {data.paging.pages.current} of {data.paging.pages.last} | {data.paging.results.total} results
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updatePage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => updatePage(page + 1)}
                  disabled={page >= data.paging.pages.last}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {webhookToEdit && (
        <WebhookEditForm
          key={webhookToEdit.id}
          webhook={webhookToEdit}
          onClose={() => setWebhookToEdit(null)}
        />
      )}
    </main>
  )
}

export default WebhooksPage