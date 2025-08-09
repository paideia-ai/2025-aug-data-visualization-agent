import express from 'express'
import cors from 'cors'
import { anthropic } from '@ai-sdk/anthropic'
import { convertToModelMessages, streamText, tool } from 'ai'
import { z } from 'zod'

const app = express()
app.use(cors())
app.use(express.json())

// System prompt for the data analysis agent
const DATA_AGENT_SYSTEM_PROMPT =
  `You are a data analyst assistant with access to an Observable runtime environment containing various pre-loaded datasets. Your role is to help users analyze and visualize data interactively.

AVAILABLE DATASETS (Query Methods):

1. getVisitorCountByHourRange(hourStart, hourEnd)
   - Returns website visitor analytics for specified hour range (0-23)
   - Output: Array of {hour, visitors, uniqueVisitors, pageViews}
   - Example: getVisitorCountByHourRange(9, 17) returns business hours traffic

2. getProductSalesByCategory(category)
   - Returns product sales data, optionally filtered by category
   - Categories: 'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'
   - Output: Array of {category, product, unitsSold, revenue, profit, rating}
   - Example: getProductSalesByCategory('Electronics') or getProductSalesByCategory() for all

3. getCustomerDemographics(ageMin, ageMax)
   - Returns customer demographic data for age range
   - Output: Array of {ageGroup, segment, region, customerCount, avgSpending, retentionRate}
   - Example: getCustomerDemographics(25, 45) returns data for ages 25-45

4. getMonthlySalesData(startMonth, endMonth, year)
   - Returns monthly sales time series data
   - Output: Array of {month, monthNumber, year, sales, orders, averageOrderValue, newCustomers}
   - Example: getMonthlySalesData(1, 6, 2024) returns H1 2024 data

AVAILABLE LIBRARIES:
- Plot: Observable Plot for creating visualizations
- aq: Arquero for data manipulation and analysis
- d3: D3.js utilities (limited to synchronous operations)

CRITICAL - ARQUERO LIMITATIONS:
Arquero table expressions DO NOT support JavaScript closures or external functions. You have two options:
1. Use only built-in Arquero operations (preferred):
   - Use aq.op functions like op.hour(), op.month(), op.year() for dates
   - Use conditional expressions like d => d.hour < 12 ? 'morning' : 'afternoon'
   - Example: table.derive({ period: d => d.hour < 12 ? 'morning' : 'afternoon' })

2. For custom functions, use aq.escape() to bypass the expression system:
   - Example: table.derive({ result: aq.escape(d => customFunction(d.value)) })
   - Note: This is less efficient than native operations

WRONG: table.derive({ period: d => getTimePeriod(d.hour) }) // Error: closures not supported
RIGHT: table.derive({ period: d => d.hour < 12 ? 'morning' : 'afternoon' })
RIGHT: table.derive({ period: aq.escape(d => getTimePeriod(d.hour)) }) // If function is necessary

AVAILABLE TOOLS:

Introspection:
- list_nodes: View all defined nodes in the environment
- inspect_node: Examine a specific node's value (avoid inspecting large datasets directly)

Core Operations:
- define_node: Create reactive data transformations or visualizations
  - Automatically handles redefine if node already exists
  - Returns value preview for debugging (or error if failed)
  - Use the preview/error to verify your code worked correctly
- delete_node: Remove a node from the environment  
- define_input: Create interactive controls (slider, select, text, date)

Display Management:
- create_artifact: Create a container for displaying results
- add_to_artifact: Add nodes to display (auto-detects plots, tables, inputs)
- remove_from_artifact: Remove nodes from display

Utilities:
- evaluate: Execute code and return result (max 2000 chars)

IMPORTANT GUIDELINES:

1. AVOID inspecting nodes with large datasets directly - it will pollute your context
2. Instead, use data transformation to view samples: define a node that selects first few rows
3. Prefer creating visualizations with Plot and tabular views with aq over raw data display
4. Use synchronous operations only - the mock data is loaded synchronously
5. When creating plots, always return the Plot.plot() result directly
6. Create artifacts to organize and display your analysis results to the user
7. Use evaluate for quick calculations, but control output size

CRITICAL - CODE EXECUTION:
Your code for define_node and evaluate tools will be executed inside a function body. You MUST:
- Write complete function body code
- Use explicit 'return' statements to return values
- Multiple statements are allowed, but you must return the final value

Examples:
// CORRECT - explicit return
const data = getVisitorCountByHourRange(0, 23);
const filtered = data.slice(0, 5);
return filtered;

// CORRECT - single line with return
return getVisitorCountByHourRange(0, 23);

// WRONG - no return statement
getVisitorCountByHourRange(0, 23);  // This will return undefined!

// WRONG - expression without return
data.slice(0, 5)  // This will return undefined!

EXAMPLE WORKFLOW:

1. User asks to analyze visitor patterns
2. Use evaluate to get a sample: evaluate with code "return getVisitorCountByHourRange(9, 12).slice(0, 3)"
3. Define a node for the full analysis: define_node with visualization code
   - Check the preview in the response to verify it worked
   - If you see an error, fix your code and call define_node again (it will auto-redefine)
4. Create an artifact to display results
5. Add the visualization node to the artifact

DEBUGGING TIP:
When define_node returns an error, read it carefully and fix your code:
- Arquero errors: Check for closure issues, use aq.escape() if needed
- Reference errors: Check that all dependencies are in the inputs array
- Type errors: Verify the data structure matches what you expect

Remember: You're helping users explore and understand their data through interactive analysis and visualization!`

app.post('/api/data-analysis-agent', async (req, res) => {
  try {
    const { messages } = req.body
    console.log('📊 Data analysis agent received messages:', messages.length)

    // Log incoming messages with tool results
    console.log('📨 Incoming messages structure:')
    messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        console.log(`  Message ${idx}: User - "${msg.parts?.[0]?.text?.substring(0, 50)}..."`)
      } else if (msg.role === 'assistant') {
        const toolParts = msg.parts?.filter((p) => p.type?.startsWith('tool-'))
        if (toolParts?.length > 0) {
          toolParts.forEach((tp) => {
            const toolName = tp.type.replace('tool-', '')
            console.log(`  Message ${idx}: Assistant Tool Call - ${toolName}`)
            if (tp.input) {
              console.log(`    📥 Input:`, JSON.stringify(tp.input, null, 2).substring(0, 500))
            }
            if (tp.output) {
              console.log(`    📤 Output:`, JSON.stringify(tp.output, null, 2).substring(0, 500))
            }
          })
        }
      }
    })

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: DATA_AGENT_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      maxTokens: 2000,
      tools: {
        list_nodes: tool({
          description: 'List all nodes in the Observable runtime environment',
          inputSchema: z.object({
            type: z.enum(['all', 'data', 'plot', 'input']).optional().describe('Filter nodes by type'),
          }),
          outputSchema: z.object({
            nodes: z.array(z.object({
              name: z.string(),
              type: z.string(),
              inputs: z.array(z.string()),
            })),
          }),
        }),

        inspect_node: tool({
          description: 'Inspect the current value and type of a specific node',
          inputSchema: z.object({
            name: z.string().describe('Name of the node to inspect'),
          }),
          outputSchema: z.object({
            name: z.string(),
            value: z.any().optional(),
            type: z.string(),
            shape: z.any().optional(),
            error: z.string().optional(),
          }),
        }),

        define_node: tool({
          description:
            'Define a new reactive node in the Observable runtime. Code must include explicit return statement. If node exists, it will be redefined. Returns computed value preview or error for debugging.',
          inputSchema: z.object({
            name: z.string().describe('Name for the new node'),
            inputs: z.array(z.string()).describe('Names of input nodes this depends on'),
            code: z.string().describe(
              'JavaScript function body with explicit return. Example: "const data = getData(); return data.slice(0, 5);"',
            ),
          }),
          outputSchema: z.object({
            nodeId: z.string(),
            status: z.enum(['success', 'error']),
            valueType: z.string().optional(),
            preview: z.string().optional(),
            wasRedefined: z.boolean().optional(),
            error: z.string().optional(),
          }),
        }),

        delete_node: tool({
          description: 'Delete a node from the Observable runtime',
          inputSchema: z.object({
            name: z.string().describe('Name of the node to delete'),
          }),
          outputSchema: z.object({
            status: z.enum(['success', 'error']),
            error: z.string().optional(),
          }),
        }),

        define_input: tool({
          description: 'Create an interactive input control',
          inputSchema: z.object({
            name: z.string().describe('Name for the input node'),
            type: z.enum(['slider', 'select', 'text', 'date']).describe('Type of input control'),
            config: z.object({
              min: z.number().optional(),
              max: z.number().optional(),
              step: z.number().optional(),
              options: z.array(z.string()).optional(),
              defaultValue: z.any().optional(),
            }).describe('Configuration for the input control'),
          }),
          outputSchema: z.object({
            nodeId: z.string(),
            initialValue: z.any(),
          }),
        }),

        create_artifact: tool({
          description: 'Create a display container for showing results to the user',
          inputSchema: z.object({
            id: z.string().describe('Unique identifier for the artifact'),
            title: z.string().describe('Title for the artifact display'),
            description: z.string().optional().describe('Description of what this artifact shows'),
          }),
          outputSchema: z.object({
            artifactId: z.string(),
          }),
        }),

        add_to_artifact: tool({
          description: 'Add a node to an artifact for display',
          inputSchema: z.object({
            artifactId: z.string().describe('ID of the artifact'),
            nodeId: z.string().describe('ID of the node to display'),
            displayType: z.enum(['auto', 'table', 'raw', 'plot']).optional().describe('How to display the node'),
          }),
          outputSchema: z.object({
            status: z.enum(['success', 'error']),
          }),
        }),

        remove_from_artifact: tool({
          description: 'Remove a node from an artifact display',
          inputSchema: z.object({
            artifactId: z.string().describe('ID of the artifact'),
            nodeId: z.string().describe('ID of the node to remove'),
          }),
          outputSchema: z.object({
            status: z.enum(['success', 'error']),
          }),
        }),

        evaluate: tool({
          description: 'Evaluate JavaScript code and return the result. Code must include explicit return statement.',
          inputSchema: z.object({
            code: z.string().describe(
              'JavaScript function body with explicit return. Example: "const result = getVisitorCountByHourRange(0, 5); return result;"',
            ),
          }),
          outputSchema: z.object({
            status: z.enum(['success', 'error']),
            value: z.any().optional(),
            error: z.string().optional(),
          }),
        }),
      },
    })

    console.log('📤 Streaming response for data analysis agent')
    result.pipeUIMessageStreamToResponse(res)
  } catch (error) {
    console.error('Error in data analysis agent endpoint:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
