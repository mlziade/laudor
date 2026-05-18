import { createContext, useContext } from 'react'
import type { UserDTO } from '../types'

export interface AuthContextValue {
  user: UserDTO | null
  setUser: (user: UserDTO | null) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  logout: () => {}
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
