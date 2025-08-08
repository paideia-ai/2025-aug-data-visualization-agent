import express from 'express'
import cors from 'cors'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText, convertToModelMessages } from 'ai'

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      messages: convertToModelMessages(messages),
      maxTokens: 1000,
    })

    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})