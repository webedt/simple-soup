// Authentication state management

export interface User {
  id: string
  email: string
  role: 'admin' | 'free' | 'lite' | 'plus' | 'pro'
  name?: string
  created_at?: string
  updated_at?: string
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

let currentUser: User | null = null
let authListeners: Array<(user: User | null) => void> = []

/**
 * Initialize auth state from localStorage
 */
export function initAuth(): void {
  const token = localStorage.getItem(TOKEN_KEY)
  const userStr = localStorage.getItem(USER_KEY)

  if (token && userStr) {
    try {
      currentUser = JSON.parse(userStr)
      // Note: We don't validate the token here anymore
      // Auth errors are handled by the authError flag in API responses
      // which provides better UX with proper error messages
    } catch (error) {
      console.error('Error parsing stored user:', error)
      clearAuth()
    }
  } else if (token || userStr) {
    // If we have one but not the other, clear both to prevent inconsistency
    clearAuth()
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return currentUser
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return currentUser !== null && localStorage.getItem(TOKEN_KEY) !== null
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: User['role']): boolean {
  return currentUser?.role === role
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return hasRole('admin')
}

/**
 * Get authentication token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set authentication data
 */
export function setAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  currentUser = user
  notifyListeners()
}

/**
 * Clear authentication data (logout)
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  currentUser = null
  notifyListeners()
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  authListeners.push(callback)

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(listener => listener !== callback)
  }
}

/**
 * Notify all listeners of auth state change
 */
function notifyListeners(): void {
  authListeners.forEach(listener => listener(currentUser))
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed' }
    }

    setAuth(data.token, data.user)
    return { success: true }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    const token = getToken()
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    }
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    clearAuth()
  }
}

/**
 * Change password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to change password' }
    }

    return { success: true }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/**
 * Update user profile
 */
export async function updateProfile(updates: { name?: string; email?: string }): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const token = getToken()
    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update profile' }
    }

    // Update stored user data
    if (currentUser) {
      const updatedUser = { ...currentUser, ...data }
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
      currentUser = updatedUser
      notifyListeners()
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// Initialize auth on module load
initAuth()
