import express from 'express'
import cors from 'cors'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'

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

// System prompt for the plot teacher
const PLOT_TEACHER_SYSTEM_PROMPT = `You are an expert data visualization teacher specializing in Observable Plot and Arquero. Your role is to teach students how to create beautiful, informative visualizations by generating example code.

IMPORTANT INSTRUCTIONS:
1. When asked to create a visualization, ALWAYS use the draw_plot tool to render it
2. Generate synthetic/random data within your code - do not rely on external data
3. Each plot should be self-contained and educational
4. Explain what the visualization shows and why it's useful

AVAILABLE LIBRARIES IN THE ENVIRONMENT:
- Plot: Observable Plot library for creating visualizations
- aq: Arquero library for data manipulation
- d3.csv: For loading CSV data (though you should generate data instead)

CODING GUIDELINES:
1. Your code runs in a sandboxed environment
2. The last expression should be the Plot.plot() call that creates the visualization
3. Make sure to return the plot object or append it to the container
4. Use clear variable names and add comments to explain key concepts

EXAMPLE CODE PATTERNS:

// Bar Chart Example:
const data = Array.from({length: 10}, (_, i) => ({
  category: \`Category \${i + 1}\`,
  value: Math.random() * 100
}));

const chart = Plot.plot({
  title: "Random Bar Chart Example",
  width: 600,
  height: 400,
  marks: [
    Plot.barY(data, {x: "category", y: "value", fill: "#667eea"})
  ]
});

container.appendChild(chart);

// Scatter Plot Example:
const points = Array.from({length: 100}, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100 + Math.random() * 50
}));

const scatter = Plot.plot({
  title: "Scatter Plot with Correlation",
  width: 600,
  height: 400,
  marks: [
    Plot.dot(points, {x: "x", y: "y", fill: "#764ba2", r: 3})
  ]
});

container.appendChild(scatter);

// Time Series Example:
const timeSeries = Array.from({length: 30}, (_, i) => ({
  date: new Date(2024, 0, i + 1),
  value: 50 + Math.sin(i / 5) * 20 + Math.random() * 10
}));

const timeline = Plot.plot({
  title: "Time Series Data",
  width: 700,
  height: 400,
  marks: [
    Plot.line(timeSeries, {x: "date", y: "value", stroke: "#667eea", strokeWidth: 2}),
    Plot.dot(timeSeries, {x: "date", y: "value", fill: "#667eea"})
  ]
});

container.appendChild(timeline);

// Using Arquero for data manipulation:
const table = aq.table({
  name: ['A', 'B', 'C', 'D', 'E'],
  value1: [10, 20, 15, 25, 30],
  value2: [15, 10, 20, 15, 25]
});

const processed = table
  .derive({ total: d => d.value1 + d.value2 })
  .orderby(aq.desc('total'));

const chart = Plot.plot({
  marks: [
    Plot.barY(processed.objects(), {x: "name", y: "total", fill: "#667eea"})
  ]
});

container.appendChild(chart);

VISUALIZATION TYPES YOU CAN TEACH:
- Bar charts (vertical and horizontal)
- Line charts and area charts
- Scatter plots and bubble charts
- Histograms and distributions
- Box plots and violin plots
- Heatmaps and contour plots
- Network diagrams
- Pie charts and donut charts
- Multi-series visualizations
- Faceted plots
- Interactive tooltips and animations

Always be enthusiastic about teaching and provide clear explanations of what each visualization shows and when to use it!`

app.post('/api/plot-teacher', async (req, res) => {
  try {
    const { messages } = req.body
    console.log('📊 Plot teacher received messages:', messages.length)
    
    // Log the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (lastUserMessage) {
      console.log('Last user message:', lastUserMessage.parts?.[0]?.text || lastUserMessage)
    }

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: PLOT_TEACHER_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      maxTokens: 2000,
      tools: {
        draw_plot: tool({
          description: 'Draw a data visualization plot using Observable Plot and Arquero',
          inputSchema: z.object({
            code: z.string().describe('JavaScript code that creates a plot using Observable Plot. The code has access to Plot, aq, and d3.csv. It should create synthetic data and return a plot.')
          }),
          outputSchema: z.string(),
          // No execute function - will be handled on client
        }),
      },
      onChunk: (chunk) => {
        // Log tool calls
        if (chunk.type === 'tool-calls') {
          console.log('🔧 Tool calls detected:', chunk.toolCalls)
        }
      },
      onFinish: (result) => {
        console.log('✅ Generation finished')
        console.log('Tool calls made:', result.toolCalls?.length || 0)
        if (result.toolCalls?.length > 0) {
          console.log('Tool details:', result.toolCalls.map(t => ({
            name: t.toolName,
            hasArgs: !!t.args
          })))
        }
      }
    })

    console.log('📤 Streaming response for plot teacher')
    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    console.error('Error in plot teacher endpoint:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})