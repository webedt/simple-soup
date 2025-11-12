import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'

export function createClaudeRoutes(): Router {
  const router = Router()

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  })

  /**
   * POST /claude/chat
   * Stream chat responses from Claude
   * Body: { messages: Array<{role: string, content: string}>, model?: string }
   */
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { messages, model = 'claude-3-5-sonnet-20241022' } = req.body

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' })
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({
          error: 'ANTHROPIC_API_KEY is not configured on the server'
        })
      }

      // Set up SSE (Server-Sent Events) headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      // Create streaming request to Claude
      const stream = await anthropic.messages.stream({
        model,
        max_tokens: 4096,
        messages,
      })

      // Stream events to client
      stream.on('text', (text) => {
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`)
      })

      stream.on('message', (message) => {
        res.write(`data: ${JSON.stringify({ type: 'message', content: message })}\n\n`)
      })

      stream.on('error', (error) => {
        console.error('Stream error:', error)
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
        res.end()
      })

      stream.on('end', () => {
        res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`)
        res.end()
      })

      // Handle client disconnect
      req.on('close', () => {
        stream.controller.abort()
      })

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
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Most intelligent model'
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          description: 'Fastest model'
        },
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          description: 'Powerful model for complex tasks'
        }
      ]
    })
  })

  return router
}
