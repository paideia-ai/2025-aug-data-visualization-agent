import { anthropic } from '@ai-sdk/anthropic'
import { convertToModelMessages, streamText, tool } from 'ai'
import { z } from 'zod'

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

// WRONG - no return
const data = getVisitorCountByHourRange(0, 23);
const filtered = data.slice(0, 5);
// Missing return!`

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
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: DATA_AGENT_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      maxToolRoundtrips: 10,
      tools: {
        list_nodes: tool({
          description: 'List all defined nodes in the Observable runtime',
          inputSchema: z.object({}),
          outputSchema: z.object({
            nodes: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                hasValue: z.boolean(),
              }),
            ),
          }),
        }),

        inspect_node: tool({
          description: 'Inspect the current value of a specific node',
          inputSchema: z.object({
            name: z.string().describe('Name of the node to inspect'),
            options: z
              .object({
                maxLength: z.number().optional(),
                maxItems: z.number().optional(),
              })
              .optional()
              .describe('Options for limiting output size'),
          }),
          outputSchema: z.object({
            name: z.string(),
            hasValue: z.boolean(),
            valueType: z.string().optional(),
            preview: z.string().optional(),
            error: z.string().optional(),
          }),
        }),

        define_node: tool({
          description: 'Define or update a reactive node in the Observable runtime',
          inputSchema: z.object({
            name: z.string().describe('Name for the node'),
            code: z.string().describe(
              'JavaScript function body with explicit return. Example: "return getVisitorCountByHourRange(0, 23);"',
            ),
            inputs: z.array(z.string()).optional().describe('Dependencies - other node names this depends on'),
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
