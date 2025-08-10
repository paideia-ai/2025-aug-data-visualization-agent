import { convertToModelMessages, streamText } from 'ai'
import { AI_CONFIG, DATA_AGENT_SYSTEM_PROMPT, DATA_AGENT_TOOLS } from '../ai/config.ts'

// This is a resource route - no default export (component)

// Handle GET requests (for testing)
export async function loader() {
  return new Response(JSON.stringify({ message: 'Data Analysis Agent API' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// Handle POST requests (main API)
export async function action({ request }: { request: Request }) {
  try {
    const { messages } = await request.json()
    console.log('📥 Received request for data analysis agent')

    const result = await streamText({
      model: AI_CONFIG.model,
      system: DATA_AGENT_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      maxToolRoundtrips: 10,
      tools: DATA_AGENT_TOOLS,
    })

    console.log('📤 Streaming response for data analysis agent')

    // Use the same UI message stream response that works with useChat
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Error in data analysis agent endpoint:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
