import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { adminLogin, hydrateAdminToken, setAdminToken, setSessionExpiredHandler } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => hydrateAdminToken())
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setToken(null)
      setSessionExpired(true)
    })
    return () => setSessionExpiredHandler(null)
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await adminLogin(credentials)
    const authToken = response?.data?.token
    if (response?.success !== true || typeof authToken !== 'string' || !authToken) {
      throw new Error('Invalid credentials')
    }

    setAdminToken(authToken)
    setToken(authToken)
    setSessionExpired(false)
  }, [])

  const logout = useCallback(() => {
    setAdminToken(null)
    setToken(null)
    setSessionExpired(false)
  }, [])

  const value = useMemo(() => ({
    token,
    isAuthenticated: Boolean(token),
    sessionExpired,
    login,
    logout,
    clearSessionExpired: () => setSessionExpired(false),
  }), [token, sessionExpired, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
