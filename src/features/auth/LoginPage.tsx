import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { ApiError } from '../../shared/api/apiClient.ts'
import { useAuth } from './authContext.tsx'

type LoginLocationState = {
  from?: string
}

type LoginFormValues = {
  email: string
  password: string
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>()

  // handle form submission and coordinate the login flow
  async function onSubmit({ email, password }: LoginFormValues) {
    clearErrors()
    setFormError('')

    try {
      await login(email, password)
      // restore prev destination if it was set, otherwise go to the default page
      const from = (location.state as LoginLocationState | null)?.from
      const returnTo =
        from?.startsWith('/') && !from.startsWith('//') ? from : '/webhooks'
      navigate(returnTo, { replace: true })
    } catch (error) {
      // show field-specific or general login errors
      if (error instanceof ApiError) {
        const emailError = error.fieldErrors.email?.[0]
        const passwordError = error.fieldErrors.password?.[0]
        if (emailError) setError('email', { type: 'server', message: emailError })
        if (passwordError) setError('password', { type: 'server', message: passwordError })
        if (!emailError && !passwordError) setFormError(error.message)
      } else {
        setFormError('Unable to sign in. Please try again.')
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mb-6 text-sm text-slate-600">
          Enter your account details to continue.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage