import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './authContext.tsx'

// render protected routes only for signed-in users
function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}

export default RequireAuth
