import { anthropic } from '@ai-sdk/anthropic'
import { tool } from 'ai'
import { z } from 'zod'

// Central AI configuration
export const AI_CONFIG = {
  model: anthropic('claude-sonnet-4-20250514'),
} as const

// Data Analysis Agent configuration
export const DATA_AGENT_SYSTEM_PROMPT =
  `你是一个数据分析助手，帮助HR团队理解和探索AI能力测试结果。你可以访问一个包含测试数据的Observable运行时环境。

背景：
这是一个AI能力测试，评估了397名员工（分为2个团队）在6个问题上的表现。测试旨在评估7个AI协作核心能力维度。

AI协作七大核心能力定义：

基础认知能力（维度1-3）：
1. 发现与自我理解 (discovery)
   - 借助AI互动，澄清模糊目标，深化自我认知

2. 迭代优化与反馈 (iterative-refinement) 
   - 根据AI反馈持续调整，提升沟通效率

3. 表达与转译 (representation)
   - 将抽象想法转化为清晰指令，弥合人机认知差异

探索决策能力（维度4-5）：
4. 选择与排序 (choosing)
   - 面对多种可能性，有效评估并确定优先级

5. 探索式发现 (exploratory)
   - 主动探索未曾预见的问题领域，突破认知边界

高阶协作能力（维度6-7）：
6. 自然语言世界建模 (world-modeling)
   - 用清晰文字刻画关键实体、运作规则与因果链，使语言模型高效推理

7. 自我验证与人类信任 (self-verification)
   - 批判性评估AI输出，在理性基础上建立信任关系

问题与维度映射：
- Problem 1: AI协作审核任务 - 测试 representation, self-verification
- Problem 2: 通用审核提示词设计 - 测试 iterative-refinement, world-modeling
- Problem 3: 需求挖掘/文档组织 - 测试 iterative-refinement, discovery
- Problem 4: 异见报告审核 - 测试 self-verification, choosing
- Problem 5: 思维陷阱识别 - 测试 iterative-refinement, world-modeling  
- Problem 6: 迪尔巴尔语解析 - 测试 choosing, exploratory

AVAILABLE DATASETS (Query Methods):

1. getScores()
   - Returns all test scores for 397 employees
   - Output: Array of {email, team, grade, representation, self-verification, iterative-refinement, world-modeling, discovery, choosing, exploratory, p1.grade, p2.grade, p3.grade, p4.grade, p5.grade, p6.grade}
   - All grades are A/B/C/D format
   - Example: getScores() returns all scores, getScores().filter(d => d.team === 'terry') for team filtering

2. getReport(email)
   - Returns detailed evaluation report for a specific employee
   - Input: email address (e.g., 'anyang3@lenovo.com')
   - Output: Full report object with dimensionReports, problemReports, overall analysis, etc.
   - Example: getReport('anyang3@lenovo.com') returns the full report for this user

AVAILABLE LIBRARIES:
- Plot: Observable Plot for creating visualizations (use for bar charts, histograms, scatter plots, etc.)
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
4. Use synchronous operations only - all data is loaded synchronously
5. When creating plots, always return the Plot.plot() result directly
6. Create artifacts to organize and display your analysis results to the user
7. Use evaluate for quick calculations, but control output size
8. When asked about dimensions, refer to the Chinese definitions provided above
9. For grade distributions, use bar charts/histograms to show A/B/C/D distributions
10. For correlations between dimensions and tasks, consider using heatmaps or scatter plots

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

// Data Agent tool definitions
export const DATA_AGENT_TOOLS = {
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
}
