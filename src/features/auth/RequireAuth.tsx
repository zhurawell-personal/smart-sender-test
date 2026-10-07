import { Navigate, Outlet } from 'react-router'
import { useAuth } from './authContext.tsx'

// render protected routes only for signed-in users
function RequireAuth() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default RequireAuth
