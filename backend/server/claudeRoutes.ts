import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { authenticateToken } from './auth.js'

export function createClaudeRoutes(pool: Pool | null, dbAvailable: boolean, inMemoryUsers: Map<string, any>): Router {
  const router = Router()

  // Claude Code API configuration (runs locally)
  const CLAUDE_CODE_API_URL = process.env.DOCKER_CLAUDE_CODE_URL || 'http://localhost:3002'

  /**
   * Helper function to get user's Claude credentials
   */
  async function getUserCredentials(userId: string): Promise<string | null> {
    if (dbAvailable && pool) {
      const result = await pool.query('SELECT claude_credentials FROM users WHERE id = $1', [userId])
      if (result.rows.length > 0) {
        return result.rows[0].claude_credentials
      }
    } else {
      const user = inMemoryUsers.get(userId)
      if (user) {
        return user.claude_credentials || null
      }
    }
    return null
  }

  /**
   * POST /claude/chat
   * Stream chat responses from Claude Code via Docker container
   * Body: { messages: Array<{role: string, content: string}> }
   */
  router.post('/chat', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { messages } = req.body
      const userId = req.user?.userId

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' })
      }

      // Get user's credentials
      const credentials = await getUserCredentials(userId)

      if (!credentials) {
        return res.status(400).json({
          error: 'No Claude credentials found. Please add your credentials in Account settings.'
        })
      }

      // Validate credentials format
      let parsedCredentials
      try {
        parsedCredentials = JSON.parse(credentials)
        if (!parsedCredentials.claudeAiOauth) {
          throw new Error('Invalid credentials format')
        }
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid credentials format. Please update your credentials in Account settings.'
        })
      }

      // Convert chat messages to a single prompt
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (!lastUserMessage) {
        return res.status(400).json({ error: 'No user message found' })
      }

      const prompt = lastUserMessage.content

      // Set up SSE (Server-Sent Events) headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      try {
        // Step 1: Create a session with claude-code-api
        const sessionResponse = await fetch(`${CLAUDE_CODE_API_URL}/api/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credentials: parsedCredentials,
            workspace: '/tmp' // Use temp directory
          })
        })

        if (!sessionResponse.ok) {
          throw new Error('Failed to create session with Claude Code API')
        }

        const { sessionId } = await sessionResponse.json()

        // Step 2: Stream the prompt
        const streamResponse = await fetch(`${CLAUDE_CODE_API_URL}/api/stream/${sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            credentials: parsedCredentials
          })
        })

        if (!streamResponse.ok) {
          throw new Error('Failed to stream from Claude Code API')
        }

        if (!streamResponse.body) {
          throw new Error('Response body is null')
        }

        // Step 3: Forward the SSE stream to client
        const reader = streamResponse.body.getReader()
        const decoder = new TextDecoder()

        req.on('close', () => {
          reader.cancel()
        })

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          // Forward the chunk to the client
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }

        res.end()

      } catch (error) {
        console.error('Claude Code API error:', error)
        res.write(`data: ${JSON.stringify({
          type: 'error',
          content: error instanceof Error ? error.message : 'Failed to communicate with Claude Code API'
        })}\n\n`)
        res.end()
      }

    } catch (error) {
      console.error('Claude API error:', error)

      // Check if headers have been sent (streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          content: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`)
        res.end()
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Internal server error'
        })
      }
    }
  })

  /**
   * GET /claude/models
   * Get available Claude models
   */
  router.get('/models', (req: Request, res: Response) => {
    res.json({
      models: [
        {
          id: 'claude-code',
          name: 'Claude Code (Docker)',
          description: 'Claude running in Docker with full agent capabilities'
        }
      ]
    })
  })

  /**
   * GET /claude/health
   * Check if claude-code-api service is reachable
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const response = await fetch(`${CLAUDE_CODE_API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        res.json({
          status: 'ok',
          claudeCodeApi: 'connected',
          apiUrl: CLAUDE_CODE_API_URL,
          apiHealth: data
        })
      } else {
        res.json({
          status: 'degraded',
          claudeCodeApi: 'error',
          apiUrl: CLAUDE_CODE_API_URL,
          error: `API responded with status ${response.status}`
        })
      }
    } catch (error) {
      res.json({
        status: 'degraded',
        claudeCodeApi: 'unreachable',
        apiUrl: CLAUDE_CODE_API_URL,
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure the claude-code-api service is running (npm run dev)'
      })
    }
  })

  return router
}
