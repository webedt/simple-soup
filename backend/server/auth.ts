import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

// JWT secret - in production, this should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d' // Token expires in 7 days

// User roles
export type UserRole = 'admin' | 'free' | 'lite' | 'plus' | 'pro'

export interface User {
  id: string
  email: string
  password_hash: string
  role: UserRole
  name?: string
  created_at?: string
  updated_at?: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): { payload: JWTPayload | null; error?: string } {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    return { payload }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { payload: null, error: 'Token has expired. Please log in again.' }
    } else if (error instanceof jwt.JsonWebTokenError) {
      return { payload: null, error: 'Invalid token. Please log in again.' }
    }
    return { payload: null, error: 'Authentication failed' }
  }
}

/**
 * Generate a random password
 */
export function generateRandomPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

/**
 * Authentication middleware - Verifies JWT token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentication required', authError: true })
    return
  }

  const result = verifyToken(token)
  if (!result.payload) {
    res.status(401).json({ error: result.error || 'Invalid or expired token', authError: true })
    return
  }

  req.user = result.payload
  next()
}

/**
 * Authorization middleware - Checks if user has required role
 */
export function authorizeRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    next()
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  return { valid: true }
}
