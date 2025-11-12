import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import {
  hashPassword,
  authenticateToken,
  authorizeRole,
  isValidEmail,
  isValidPassword,
  generateRandomPassword,
  type UserRole
} from './auth.js'

export function createUserRoutes(pool: Pool | null, dbAvailable: boolean, inMemoryUsers: Map<string, any>) {
  const router = Router()

  // Credentials endpoints (require authentication, but not admin)
  // GET /users/credentials - Get own credentials
  router.get('/credentials', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (dbAvailable && pool) {
        const result = await pool.query('SELECT claude_credentials FROM users WHERE id = $1', [userId])

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' })
        }

        res.json({ credentials: result.rows[0].claude_credentials || null })
      } else {
        const user = inMemoryUsers.get(userId)
        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }
        res.json({ credentials: user.claude_credentials || null })
      }
    } catch (error) {
      console.error('Get credentials error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PUT /users/credentials - Update own credentials
  router.put('/credentials', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId
      const { credentials } = req.body

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!credentials) {
        return res.status(400).json({ error: 'Credentials are required' })
      }

      // Validate JSON format
      try {
        const parsed = JSON.parse(credentials)
        if (!parsed.claudeAiOauth || !parsed.claudeAiOauth.accessToken || !parsed.claudeAiOauth.refreshToken) {
          return res.status(400).json({ error: 'Invalid credentials format' })
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON format' })
      }

      if (dbAvailable && pool) {
        await pool.query(
          'UPDATE users SET claude_credentials = $1, updated_at = NOW() WHERE id = $2',
          [credentials, userId]
        )
        res.json({ message: 'Credentials saved successfully' })
      } else {
        const user = inMemoryUsers.get(userId)
        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }
        user.claude_credentials = credentials
        user.updated_at = new Date().toISOString()
        inMemoryUsers.set(userId, user)
        res.json({ message: 'Credentials saved successfully' })
      }
    } catch (error) {
      console.error('Update credentials error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // DELETE /users/credentials - Clear own credentials
  router.delete('/credentials', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (dbAvailable && pool) {
        await pool.query(
          'UPDATE users SET claude_credentials = NULL, updated_at = NOW() WHERE id = $1',
          [userId]
        )
        res.json({ message: 'Credentials cleared successfully' })
      } else {
        const user = inMemoryUsers.get(userId)
        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }
        user.claude_credentials = null
        user.updated_at = new Date().toISOString()
        inMemoryUsers.set(userId, user)
        res.json({ message: 'Credentials cleared successfully' })
      }
    } catch (error) {
      console.error('Clear credentials error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /users/credentials/test - Test credentials
  router.post('/credentials/test', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      let credentials = null

      if (dbAvailable && pool) {
        const result = await pool.query('SELECT claude_credentials FROM users WHERE id = $1', [userId])
        if (result.rows.length > 0) {
          credentials = result.rows[0].claude_credentials
        }
      } else {
        const user = inMemoryUsers.get(userId)
        if (user) {
          credentials = user.claude_credentials
        }
      }

      if (!credentials) {
        return res.status(400).json({ error: 'No credentials found. Please save your credentials first.' })
      }

      try {
        const parsed = JSON.parse(credentials)

        // Check if credentials are expired
        if (parsed.claudeAiOauth.expiresAt) {
          const expiresAt = parsed.claudeAiOauth.expiresAt
          const now = Math.floor(Date.now() / 1000)

          if (expiresAt < now) {
            return res.json({
              message: 'Credentials are expired but may be refreshable',
              expired: true
            })
          }
        }

        res.json({ message: 'Credentials format is valid and not expired', expired: false })
      } catch (e) {
        return res.status(400).json({ error: 'Invalid credentials format' })
      }
    } catch (error) {
      console.error('Test credentials error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // All routes below this point require admin role
  router.use(authenticateToken, authorizeRole('admin'))

  // Get all users (admin only)
  router.get('/', async (req: Request, res: Response) => {
    try {
      let users: any[] = []

      if (dbAvailable && pool) {
        // Get from database
        const result = await pool.query(`
          SELECT id, email, role, name, created_at, updated_at
          FROM users
          ORDER BY created_at DESC
        `)
        users = result.rows
      } else {
        // Get from in-memory storage
        users = Array.from(inMemoryUsers.values())
          .filter(u => !u.id.startsWith('email:')) // Filter out email index entries
          .map(u => ({
            id: u.id,
            email: u.email,
            role: u.role,
            name: u.name,
            created_at: u.created_at,
            updated_at: u.updated_at
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }

      res.json(users)
    } catch (error) {
      console.error('Get users error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Get a single user (admin only)
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      if (!pool || !dbAvailable) {
        return res.status(503).json({ error: 'Database not available' })
      }

      const { id } = req.params

      const result = await pool.query(`
        SELECT id, email, role, name, created_at, updated_at
        FROM users
        WHERE id = $1
      `, [id])

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(result.rows[0])
    } catch (error) {
      console.error('Get user error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Create a new user (admin only)
  router.post('/', async (req: Request, res: Response) => {
    try {
      if (!pool || !dbAvailable) {
        return res.status(503).json({ error: 'Database not available' })
      }

      const { email, password, role, name } = req.body

      // Validate required fields
      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' })
      }

      // Validate email
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }

      // Validate role
      const validRoles: UserRole[] = ['admin', 'free', 'lite', 'plus', 'pro']
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be one of: admin, free, lite, plus, pro' })
      }

      // Check if email already exists
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' })
      }

      // Generate or validate password
      let finalPassword = password
      if (!password) {
        finalPassword = generateRandomPassword()
      } else {
        const validation = isValidPassword(password)
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message })
        }
      }

      // Hash password
      const passwordHash = await hashPassword(finalPassword)
      const userId = uuidv4()

      // Create user
      const result = await pool.query(`
        INSERT INTO users (id, email, password_hash, role, name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, role, name, created_at, updated_at
      `, [userId, email.toLowerCase(), passwordHash, role, name || null])

      const newUser = result.rows[0]

      // Include generated password in response if it was auto-generated
      if (!password) {
        res.status(201).json({
          user: newUser,
          generatedPassword: finalPassword,
          message: 'User created successfully. Save the generated password securely.'
        })
      } else {
        res.status(201).json({ user: newUser })
      }
    } catch (error) {
      console.error('Create user error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Update a user (admin only)
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      if (!pool || !dbAvailable) {
        return res.status(503).json({ error: 'Database not available' })
      }

      const { id } = req.params
      const { email, role, name, password } = req.body

      // Check if user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id])
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }

      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (email !== undefined) {
        if (!isValidEmail(email)) {
          return res.status(400).json({ error: 'Invalid email format' })
        }

        // Check if email is already taken by another user
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), id])
        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Email already in use' })
        }

        updates.push(`email = $${paramCount++}`)
        values.push(email.toLowerCase())
      }

      if (role !== undefined) {
        const validRoles: UserRole[] = ['admin', 'free', 'lite', 'plus', 'pro']
        if (!validRoles.includes(role)) {
          return res.status(400).json({ error: 'Invalid role. Must be one of: admin, free, lite, plus, pro' })
        }

        updates.push(`role = $${paramCount++}`)
        values.push(role)
      }

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`)
        values.push(name)
      }

      if (password !== undefined) {
        const validation = isValidPassword(password)
        if (!validation.valid) {
          return res.status(400).json({ error: validation.message })
        }

        const passwordHash = await hashPassword(password)
        updates.push(`password_hash = $${paramCount++}`)
        values.push(passwordHash)
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      updates.push('updated_at = NOW()')
      values.push(id)

      const result = await pool.query(`
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, role, name, created_at, updated_at
      `, values)

      res.json(result.rows[0])
    } catch (error) {
      console.error('Update user error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Delete a user (admin only)
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      if (!pool || !dbAvailable) {
        return res.status(503).json({ error: 'Database not available' })
      }

      const { id } = req.params

      // Prevent deleting yourself
      if (req.user?.userId === id) {
        return res.status(400).json({ error: 'Cannot delete your own account' })
      }

      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email, role', [id])

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json({ message: 'User deleted successfully', user: result.rows[0] })
    } catch (error) {
      console.error('Delete user error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
