import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, sessionExpired } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location, sessionExpired }}
      />
    )
  }

  return children
}
