import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import * as Plot from '@observablehq/plot'
import * as aq from 'arquero'
import { Runtime } from '@observablehq/runtime'
import { Library } from '@observablehq/stdlib'
import './DataAnalysisAgent.css'
import scoresData from '../scores.json'
import reportsData from '../reports.json'

function DataAnalysisAgent() {
  const [input, setInput] = useState('帮我看看两个团队的整体表现对比')
  const [runtime, setRuntime] = useState(null)
  const [library, setLibrary] = useState(null)
  const [mainModule, setMainModule] = useState(null)
  const [nodes, setNodes] = useState(new Map())
  const [artifacts, setArtifacts] = useState([])
  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(0)
  const [nodeUpdateTrigger, setNodeUpdateTrigger] = useState(0) // Force re-render when nodes update
  const outputContainerRef = useRef(null)
  const libraryRef = useRef(null)

  const { messages, sendMessage, status, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/data-analysis-agent',
    }),
    sendAutomaticallyWhen: () => false,
  })

  // Update debug object when state changes
  useEffect(() => {
    if (globalThis.observableDebug) {
      globalThis.observableDebug.nodes = nodes
      globalThis.observableDebug.runtime = runtime
      globalThis.observableDebug.module = mainModule
      globalThis.observableDebug.getArtifacts = () => artifacts
      globalThis.observableDebug.getCurrentArtifact = () => artifacts[currentArtifactIndex]

      // Update the debug utilities to use current state
      globalThis.observableDebug.getNode = (name) => {
        const node = nodes.get(name)
        if (!node) {
          console.log(`Node '${name}' not found. Available nodes:`, Array.from(nodes.keys()))
          return null
        }
        return {
          name,
          type: node.type,
          hasValue: '_value' in node.variable,
          value: node.variable._value,
          valueType: typeof node.variable._value,
          inputs: node.inputs || [],
        }
      }

      globalThis.observableDebug.listNodes = () => {
        const result = []
        for (const [name, node] of nodes) {
          result.push({
            name,
            type: node.type,
            hasValue: '_value' in node.variable,
            valueType: typeof node.variable._value,
            inputs: node.inputs || [],
          })
        }
        return result
      }

      globalThis.observableDebug.getValue = (name) => {
        return nodes.get(name)?.variable?._value
      }
    }
  }, [nodes, runtime, mainModule, artifacts, currentArtifactIndex])

  // Initialize Observable runtime
  useEffect(() => {
    console.log('🚀 Initializing Observable runtime')
    const library = new Library()
    const rt = new Runtime(library)
    const mod = rt.module()

    // Create a simple observer to trigger computation
    const dataObserver = {
      pending() {},
      fulfilled(value) {
        console.log('Data function computed:', typeof value)
      },
      rejected(error) {
        console.error('Data function error:', error)
      },
    }

    // Define initial data query methods WITH observers
    const initialNodes = {
      // AI ability test scores data
      getScores: mod.variable(dataObserver).define('getScores', [], () => {
        return () => {
          // Return a copy of the scores data to prevent mutations
          return [...scoresData]
        }
      }),

      // Individual employee report data
      getReport: mod.variable(dataObserver).define('getReport', [], () => {
        return (email) => {
          // Find the report by email
          const report = reportsData.find((r) => r.email === email)
          if (!report) {
            throw new Error(`No report found for email: ${email}`)
          }
          // Return a copy to prevent mutations
          return JSON.parse(JSON.stringify(report))
        }
      }),
    }

    // Store node references
    const nodeMap = new Map()
    for (const [name, variable] of Object.entries(initialNodes)) {
      nodeMap.set(name, {
        type: 'data',
        variable,
        inputs: [],
      })
    }

    setRuntime(rt)
    setLibrary(library)
    setMainModule(mod)
    setNodes(nodeMap)
    libraryRef.current = library // Store in ref for immediate access

    // Force initial computation of data functions
    rt._compute().then(() => {
      console.log('✅ Runtime initialized and computed with', nodeMap.size, 'initial nodes')
    })

    // Add debugging utilities to window
    if (!globalThis.observableDebug) {
      globalThis.observableDebug = {
        runtime: rt,
        module: mod,
        nodes: nodeMap,
        // List all variables in the module scope
        listScope: () => {
          if (!mod._scope) return []
          return Array.from(mod._scope).map(([name, variable]) => ({
            name,
            hasValue: '_value' in variable,
            valueType: typeof variable._value,
          }))
        },
        // Force recomputation
        compute: async () => {
          await rt._compute()
          console.log('Computation complete')
        },
      }
      console.log('🔧 Debug utilities added to globalThis.observableDebug')
      console.log(
        'Available commands: getNode(name), listNodes(), getValue(name), listScope(), compute(), getArtifacts()',
      )
    }
  }, [])

  // Tool execution functions
  const executeTool = async (toolName, input, toolCallId) => {
    console.log(`🔧 Executing tool: ${toolName}`)
    console.log(`📥 Input for ${toolName}:`, JSON.stringify(input, null, 2))

    try {
      let output

      switch (toolName) {
        case 'list_nodes':
          output = listNodes(input?.type)
          break

        case 'inspect_node':
          output = inspectNode(input?.name)
          break

        case 'define_node':
          output = await defineNode(input?.name, input?.inputs, input?.code)
          break

        case 'delete_node':
          output = deleteNode(input?.name)
          break

        case 'define_input':
          output = defineInput(input?.name, input?.type, input?.config)
          break

        case 'create_artifact':
          output = createArtifact(input?.id, input?.title, input?.description)
          break

        case 'add_to_artifact':
          output = addToArtifact(input?.artifactId, input?.nodeId, input?.displayType)
          break

        case 'remove_from_artifact':
          output = removeFromArtifact(input?.artifactId, input?.nodeId)
          break

        case 'evaluate':
          output = await evaluateCode(input?.code)
          break

        default:
          output = { status: 'error', error: `Unknown tool: ${toolName}` }
      }

      console.log(`✅ Tool ${toolName} executed successfully`)
      console.log(`📤 Output from ${toolName}:`, JSON.stringify(output, null, 2))

      await addToolResult({
        toolCallId,
        tool: toolName,
        output: JSON.stringify(output),
      })
    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error)
      await addToolResult({
        toolCallId,
        tool: toolName,
        output: JSON.stringify({ status: 'error', error: error.toString() }),
      })
    }
  }

  // Tool implementations
  const listNodes = (type = 'all') => {
    const nodeList = []
    for (const [name, node] of nodes) {
      if (type === 'all' || node.type === type) {
        nodeList.push({
          name,
          type: node.type,
          inputs: node.inputs || [],
        })
      }
    }
    return { nodes: nodeList }
  }

  const inspectNode = (name) => {
    const node = nodes.get(name)
    if (!node) {
      return { name, error: 'Node not found' }
    }

    try {
      const value = node.variable?._value
      const result = { name, type: node.type }

      if (value !== undefined) {
        // For functions, show signature
        if (typeof value === 'function') {
          result.value = `[Function: ${value.toString().substring(0, 100)}...]`
        } else if (Array.isArray(value)) {
          result.value = value.slice(0, 5) // Show first 5 items
          result.shape = { length: value.length }
        } else if (typeof value === 'object') {
          result.value = JSON.stringify(value, null, 2).substring(0, 500)
        } else {
          result.value = value
        }
      }

      return result
    } catch (error) {
      return { name, type: node.type, error: error.toString() }
    }
  }

  const defineNode = async (name, inputs = [], code) => {
    try {
      console.log(`📝 Defining node: ${name} with inputs:`, inputs)
      console.log(`  Code preview:`, code.substring(0, 100) + '...')

      // Check if node already exists
      const nodeExists = nodes.has(name)

      // Delete existing node if it exists (for redefine)
      if (nodeExists) {
        console.log(`  Node ${name} already exists, will redefine`)
        nodes.get(name).variable.delete()
      }

      // Create a promise to wait for the node result
      let nodeResult = null
      let nodeError = null
      const _computeComplete = false

      const resultPromise = new Promise((resolve) => {
        // Create observer for the node
        const nodeObserver = {
          pending() {
            console.log(`  Node ${name} is computing...`)
          },
          fulfilled(value) {
            console.log(`  Node ${name} computed:`, typeof value)
            nodeResult = value
            computeComplete = true
            resolve()
            // Trigger React re-render when node updates
            setNodeUpdateTrigger((prev) => prev + 1)
          },
          rejected(error) {
            console.error(`  Node ${name} error:`, error)
            nodeError = error
            computeComplete = true
            resolve()
          },
        }

        // Create the node definition function with observer
        // Use define() for new nodes, redefine() would be done by deleting and defining
        const variable = mainModule.variable(nodeObserver).define(name, inputs, function (...inputValues) {
          // Get all data query methods from nodes
          const queryMethods = {}
          for (const [nodeName, node] of nodes) {
            if (node.variable?._value && typeof node.variable._value === 'function') {
              queryMethods[nodeName] = node.variable._value
            }
          }

          // Create a context with all available libraries and input values
          const context = {
            Plot,
            aq,
            d3: { csv: () => {} },
            Library,
            ...queryMethods,
          }

          // Add input values
          inputs.forEach((inputName, index) => {
            context[inputName] = inputValues[index]
          })

          // Execute the code with the context
          const func = new Function(...Object.keys(context), code)
          return func(...Object.values(context))
        })

        nodes.set(name, {
          type: 'data',
          variable,
          inputs,
        })
      })

      // Force computation of the new node
      await runtime._compute()

      // Wait for the observer to report the result (with timeout)
      await Promise.race([
        resultPromise,
        new Promise((resolve) => setTimeout(resolve, 2000)), // 2 second timeout
      ])

      // Prepare the response
      if (nodeError) {
        console.log(`  Node ${name} failed with error`)
        return {
          nodeId: name,
          status: 'error',
          error: nodeError.toString(),
          wasRedefined: nodeExists,
        }
      } else if (nodeResult !== undefined) {
        // Create a preview of the value
        let preview = null
        try {
          if (typeof nodeResult === 'function') {
            preview = `[Function: ${nodeResult.toString().substring(0, 100)}...]`
          } else if (nodeResult?.tagName) {
            preview = `[DOM Element: ${nodeResult.tagName}]`
          } else if (nodeResult?._names) {
            // Arquero table
            preview = `[Arquero Table: ${nodeResult._nrows} rows, columns: ${nodeResult._names.join(', ')}]`
          } else {
            const stringified = JSON.stringify(nodeResult)
            preview = stringified.length > 200 ? stringified.substring(0, 200) + '...' : stringified
          }
        } catch (_e) {
          preview = `[Value of type ${typeof nodeResult}]`
        }

        console.log(`  Node ${name} defined successfully with value preview:`, preview)
        return {
          nodeId: name,
          status: 'success',
          valueType: typeof nodeResult,
          preview,
          wasRedefined: nodeExists,
        }
      } else {
        // No error but also no value yet (might still be computing)
        console.log(`  Node ${name} defined but value not yet available`)
        return {
          nodeId: name,
          status: 'success',
          valueType: 'pending',
          wasRedefined: nodeExists,
        }
      }
    } catch (error) {
      console.error('Error defining node:', error)
      return {
        nodeId: name,
        status: 'error',
        error: error.toString(),
      }
    }
  }

  const deleteNode = (name) => {
    const node = nodes.get(name)
    if (!node) {
      return { status: 'error', error: 'Node not found' }
    }

    try {
      node.variable.delete()
      nodes.delete(name)
      return { status: 'success' }
    } catch (error) {
      return { status: 'error', error: error.toString() }
    }
  }

  const defineInput = (name, type, config) => {
    try {
      let initialValue
      let inputElement

      switch (type) {
        case 'slider':
          initialValue = config.defaultValue ?? config.min ?? 0
          inputElement = document.createElement('input')
          inputElement.type = 'range'
          inputElement.min = config.min || 0
          inputElement.max = config.max || 100
          inputElement.step = config.step || 1
          inputElement.value = initialValue
          break

        case 'select':
          initialValue = config.defaultValue ?? config.options?.[0] ?? ''
          inputElement = document.createElement('select')
          for (const option of (config.options || [])) {
            const opt = document.createElement('option')
            opt.value = option
            opt.text = option
            if (option === initialValue) {
              opt.selected = true
            }
            inputElement.appendChild(opt)
          }
          inputElement.value = initialValue
          break

        case 'text':
          initialValue = config.defaultValue || ''
          inputElement = document.createElement('input')
          inputElement.type = 'text'
          inputElement.value = initialValue
          break

        case 'date':
          initialValue = config.defaultValue || new Date().toISOString().split('T')[0]
          inputElement = document.createElement('input')
          inputElement.type = 'date'
          inputElement.value = initialValue
          break

        default:
          return { status: 'error', error: `Unknown input type: ${type}` }
      }

      // Use Observable's Generators.input for reactive inputs
      // Define the viewof node that returns the element
      const viewVariable = mainModule.define(`viewof ${name}`, [], () => {
        return inputElement
      })

      // Define the value node using Generators.input
      // This creates a generator that yields new values when the input changes
      const valueVariable = mainModule.variable().define(name, [], () => {
        // Use ref to access library since this might be called before state updates
        const lib = libraryRef.current || library
        if (!lib) {
          console.error('Library not available yet')
          return initialValue // Fallback to static value
        }
        const generator = lib.Generators.input(inputElement)

        // Wrap the generator to log what it's yielding
        const wrappedGenerator = {
          next: function (value) {
            const result = generator.next(value)
            console.log(`Generator ${name}.next() called:`, {
              value: value,
              result: result,
              done: result.done,
              yielded: result.value,
            })
            if (result.value && typeof result.value.then === 'function') {
              result.value.then((v) => console.log(`  Generator ${name} promise resolved to:`, v))
            }
            return result
          },
          return: function (value) {
            console.log(`Generator ${name}.return() called with:`, value)
            return generator.return(value)
          },
        }

        return wrappedGenerator
      })

      // Store both the view and value variables
      nodes.set(`viewof ${name}`, {
        type: 'input-view',
        variable: viewVariable,
        element: inputElement,
        inputs: [],
      })

      nodes.set(name, {
        type: 'input-value',
        variable: valueVariable,
        element: inputElement,
        inputs: [`viewof ${name}`],
      })

      // Force computation to ensure the value is available
      runtime._compute().then(() => {
        console.log(`Input ${name} initialized with value:`, inputElement.value)
      })

      return { nodeId: name, initialValue }
    } catch (error) {
      return { status: 'error', error: error.toString() }
    }
  }

  const createArtifact = (id, title, description) => {
    const artifact = {
      id,
      title,
      description,
      nodes: [],
    }
    setArtifacts((prev) => [...prev, artifact])
    setCurrentArtifactIndex(artifacts.length)
    return { artifactId: id }
  }

  const addToArtifact = (artifactId, nodeId, displayType = 'auto') => {
    setArtifacts((prev) =>
      prev.map((artifact) => {
        if (artifact.id === artifactId) {
          return {
            ...artifact,
            nodes: [...artifact.nodes, { nodeId, displayType }],
          }
        }
        return artifact
      })
    )
    return { status: 'success' }
  }

  const removeFromArtifact = (artifactId, nodeId) => {
    setArtifacts((prev) =>
      prev.map((artifact) => {
        if (artifact.id === artifactId) {
          return {
            ...artifact,
            nodes: artifact.nodes.filter((n) => n.nodeId !== nodeId),
          }
        }
        return artifact
      })
    )
    return { status: 'success' }
  }

  const evaluateCode = async (code) => {
    try {
      console.log('🔍 Evaluating code:', code)

      // First, try direct evaluation with already computed values
      const directContext = {}
      for (const [name, node] of nodes) {
        if (node.variable?._value !== undefined) {
          directContext[name] = node.variable._value
          console.log(`  Found ${name}:`, typeof node.variable._value)
        }
      }

      // Add libraries
      directContext.Plot = Plot
      directContext.aq = aq
      directContext.d3 = { csv: () => {} }
      directContext.Library = Library

      // If we have the functions, try direct evaluation
      if (directContext.getVisitorCountByHourRange) {
        try {
          console.log('  Using direct evaluation with computed values')
          const func = new Function(...Object.keys(directContext), code)
          const result = func(...Object.values(directContext))
          console.log('  Direct evaluation result:', result)

          // Check size before returning
          const serialized = JSON.stringify(result)
          if (serialized && serialized.length > 2000) {
            return {
              status: 'error',
              error:
                'Result too large (> 2000 characters). Please refine your query or stringify manually with a prefix.',
            }
          }

          return { status: 'success', value: result }
        } catch (directError) {
          console.error('  Direct evaluation failed:', directError)
          // Fall through to temp node approach
        }
      }

      // Fallback: Create a temporary node with dependencies
      console.log('  Using temp node approach')
      const tempName = `_temp_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Create observer for the temp node
      let tempResult = undefined
      let tempError = null
      const tempObserver = {
        pending() {
          console.log('  Temp node pending')
        },
        fulfilled(value) {
          console.log('  Temp node fulfilled with:', value)
          tempResult = value
        },
        rejected(error) {
          console.error('  Temp node rejected:', error)
          tempError = error
        },
      }

      // Define the temp node that evaluates the code with observer
      // Use the data functions as dependencies
      const tempVariable = mainModule.variable(tempObserver).define(
        tempName,
        ['getVisitorCountByHourRange', 'getProductSalesByCategory', 'getCustomerDemographics', 'getMonthlySalesData'],
        function (getVisitorCountByHourRange, getProductSalesByCategory, getCustomerDemographics, getMonthlySalesData) {
          console.log('  Executing evaluation code in temp node')
          // Create evaluation context with all available items
          const context = {
            Plot,
            aq,
            d3: { csv: () => {} },
            Library,
            getVisitorCountByHourRange,
            getProductSalesByCategory,
            getCustomerDemographics,
            getMonthlySalesData,
          }

          // Execute the code
          const func = new Function(...Object.keys(context), code)
          const result = func(...Object.values(context))
          console.log('  Evaluation result:', result)
          return result
        },
      )

      // Store the temp node
      nodes.set(tempName, {
        type: 'temp',
        variable: tempVariable,
        inputs: [
          'getVisitorCountByHourRange',
          'getProductSalesByCategory',
          'getCustomerDemographics',
          'getMonthlySalesData',
        ],
      })

      // Force computation
      await runtime._compute()

      // Get the computed value - prefer tempResult from observer
      const value = tempResult !== undefined ? tempResult : tempVariable._value
      console.log('  Final value:', value, 'type:', typeof value)

      // Check for errors
      if (tempError) {
        tempVariable.delete()
        nodes.delete(tempName)
        console.error('  Evaluation error:', tempError)
        return { status: 'error', error: tempError.toString() }
      }

      // Delete the temporary node
      tempVariable.delete()
      nodes.delete(tempName)

      // Handle undefined value
      if (value === undefined) {
        console.log('  Value is undefined, might be async computation issue')
        return { status: 'error', error: 'Evaluation returned undefined - the data functions may not be available yet' }
      }

      // Check if result is too large
      try {
        const serialized = JSON.stringify(value)
        if (serialized && serialized.length > 2000) {
          return {
            status: 'error',
            error:
              'Result too large (> 2000 characters). Please refine your query or stringify manually with a prefix.',
          }
        }
      } catch (serializeError) {
        console.error('  Serialization error:', serializeError)
        console.error('  Value that failed to serialize:', value)
        return { status: 'error', error: `Cannot serialize result: ${serializeError.message}` }
      }

      console.log('  Evaluation successful')
      return { status: 'success', value }
    } catch (error) {
      console.error('  Evaluation error:', error)
      return { status: 'error', error: error.toString() }
    }
  }

  // Process messages for tool calls
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    lastMessage.parts?.forEach(async (part) => {
      // Check for all tool types
      const toolMatch = part.type.match(/^tool-(.+)$/)
      if (toolMatch && part.state === 'input-available') {
        const toolName = toolMatch[1]
        console.log(`🎯 Found ${toolName} tool call! Executing...`, part)
        await executeTool(toolName, part.input, part.toolCallId)
        sendMessage() // Continue conversation
      }
    })
  }, [messages])

  // Render artifacts
  useEffect(() => {
    if (!outputContainerRef.current || artifacts.length === 0) return

    const currentArtifact = artifacts[currentArtifactIndex]
    if (!currentArtifact) return

    const container = outputContainerRef.current
    container.innerHTML = ''

    // Add artifact header
    const header = document.createElement('div')
    header.className = 'artifact-header'
    header.innerHTML = `
      <h3>${currentArtifact.title}</h3>
      ${currentArtifact.description ? `<p>${currentArtifact.description}</p>` : ''}
    `
    container.appendChild(header)

    // Render each node
    currentArtifact.nodes.forEach(({ nodeId, displayType }) => {
      const node = nodes.get(nodeId)
      if (!node) {
        console.warn(`Node ${nodeId} not found`)
        return
      }

      const nodeContainer = document.createElement('div')
      nodeContainer.className = 'node-output'

      let value
      try {
        value = node.variable?._value
      } catch (error) {
        console.error(`Error getting value for node ${nodeId}:`, error)
        const errorDiv = document.createElement('div')
        errorDiv.className = 'node-error'
        errorDiv.textContent = `Error loading node ${nodeId}: ${error.message}`
        nodeContainer.appendChild(errorDiv)
        container.appendChild(nodeContainer)
        return
      }

      if (displayType === 'plot' || (displayType === 'auto' && value?.tagName)) {
        // It's a plot (check if it's a DOM element)
        if (value && value.tagName) {
          nodeContainer.appendChild(value.cloneNode(true))
        }
      } else if (displayType === 'table' || (displayType === 'auto' && (Array.isArray(value) || value?._names))) {
        // It's tabular data (array or Arquero table)
        const table = document.createElement('table')
        table.className = 'data-table'

        // Convert Arquero table to array if needed
        let data = value
        if (value?._names && value.objects) {
          // It's an Arquero table, convert to array of objects
          data = value.objects()
        }

        if (Array.isArray(data) && data.length > 0) {
          // Create header
          const thead = document.createElement('thead')
          const headerRow = document.createElement('tr')
          Object.keys(data[0]).forEach((key) => {
            const th = document.createElement('th')
            th.textContent = key
            headerRow.appendChild(th)
          })
          thead.appendChild(headerRow)
          table.appendChild(thead)

          // Create body
          const tbody = document.createElement('tbody')
          data.slice(0, 10).forEach((row) => {
            const tr = document.createElement('tr')
            Object.values(row).forEach((val) => {
              const td = document.createElement('td')
              td.textContent = val
              tr.appendChild(td)
            })
            tbody.appendChild(tr)
          })
          table.appendChild(tbody)
        } else {
          // Show empty table message
          const tr = document.createElement('tr')
          const td = document.createElement('td')
          td.textContent = 'No data available'
          td.style.padding = '20px'
          td.style.textAlign = 'center'
          tr.appendChild(td)
          table.appendChild(tr)
        }

        nodeContainer.appendChild(table)
      } else if (node.type === 'input' || node.type === 'input-view' || node.type === 'input-value') {
        // It's an input control - render the view node
        let elementToRender = null
        let nodeName = nodeId

        if (node.type === 'input-value') {
          // For value nodes, get the corresponding view node
          const viewNode = nodes.get(`viewof ${nodeId}`)
          if (viewNode && viewNode.element) {
            elementToRender = viewNode.element
          }
        } else if (node.type === 'input-view' && node.element) {
          // For view nodes, use the stored element
          elementToRender = node.element
          nodeName = nodeId.replace('viewof ', '')
        } else if (node.element) {
          // For old-style input nodes
          elementToRender = node.element
          nodeName = nodeId.replace('viewof ', '')
        }

        if (elementToRender) {
          const label = document.createElement('label')
          label.textContent = nodeName + ': '

          // Clone the element to avoid React issues, but manually sync changes
          const clonedElement = elementToRender.cloneNode(true)

          // Set up manual synchronization - just update the original element
          const syncValue = (e) => {
            // Update the original element's value
            elementToRender.value = e.target.value

            // Try dispatching both input and change events
            // Observable might be listening to either one
            const inputEvent = new Event('input', { bubbles: true })
            const changeEvent = new Event('change', { bubbles: true })

            elementToRender.dispatchEvent(inputEvent)
            elementToRender.dispatchEvent(changeEvent)

            console.log(`Input ${nodeName} changed to:`, e.target.value)
            console.log(`Dispatched input and change events on original element`)

            // Debug: Check the value after a short delay
            setTimeout(() => {
              const valueNode = nodes.get(nodeName)
              console.log(`New computed value for ${nodeName}:`, valueNode?.variable?._value)
              console.log(`Original element value:`, elementToRender.value)
              console.log(`Variable version:`, valueNode?.variable?._version)
            }, 100)
          }

          // Add event listener to the cloned element
          clonedElement.addEventListener('change', syncValue)
          clonedElement.addEventListener('input', syncValue)

          label.appendChild(clonedElement)
          nodeContainer.appendChild(label)
        }
      } else {
        // Plain JavaScript value
        const pre = document.createElement('pre')
        pre.textContent = JSON.stringify(value, null, 2)
        nodeContainer.appendChild(pre)
      }

      container.appendChild(nodeContainer)
    })
  }, [artifacts, currentArtifactIndex, nodes, nodeUpdateTrigger]) // Added nodeUpdateTrigger

  return (
    <div className='data-analysis-agent'>
      <div className='agent-header'>
        <h1>📊 Data Analysis Agent</h1>
        <p>Interactive data analysis with Observable runtime</p>
      </div>

      <div className='agent-content'>
        <div className='chat-section'>
          <div className='messages-container'>
            {messages.length === 0 && (
              <div className='welcome-message'>
                <p>👋 Hello! I'm your data analysis assistant.</p>
                <p>I have access to various datasets and can help you analyze them interactively.</p>
                <p>Try asking me to explore the website visitor data or product sales!</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className='message-role'>
                  {message.role === 'user' ? '👤 You' : '🤖 Agent'}
                </div>
                <div className='message-content'>
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return <span key={index}>{part.text}</span>
                    }

                    const toolMatch = part.type.match(/^tool-(.+)$/)
                    if (toolMatch) {
                      return (
                        <div key={index} className='tool-status'>
                          <div className='tool-header'>
                            🔧 {toolMatch[1]} - {part.state}
                          </div>
                        </div>
                      )
                    }

                    return null
                  })}
                </div>
              </div>
            ))}

            {status === 'generating' && (
              <div className='message assistant-message'>
                <div className='message-role'>🤖 Agent</div>
                <div className='message-content typing'>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (input.trim()) {
                sendMessage({
                  parts: [{ type: 'text', text: input }],
                })
                setInput('')
              }
            }}
            className='chat-form'
          >
            <input
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask me to analyze data...'
              className='chat-input'
              disabled={status !== 'ready'}
            />
            <button
              type='submit'
              disabled={status !== 'ready' || !input.trim()}
              className='send-button'
            >
              {status === 'generating' ? 'Analyzing...' : 'Send'}
            </button>
          </form>
        </div>

        <div className='output-section'>
          <div className='artifact-navigation'>
            <button
              type='button'
              onClick={() => setCurrentArtifactIndex(Math.max(0, currentArtifactIndex - 1))}
              disabled={currentArtifactIndex === 0}
              className='nav-button'
            >
              ← Previous
            </button>
            <span className='artifact-counter'>
              {artifacts.length > 0 ? `${currentArtifactIndex + 1} / ${artifacts.length}` : 'No artifacts'}
            </span>
            <button
              type='button'
              onClick={() => setCurrentArtifactIndex(Math.min(artifacts.length - 1, currentArtifactIndex + 1))}
              disabled={currentArtifactIndex >= artifacts.length - 1}
              className='nav-button'
            >
              Next →
            </button>
          </div>
          <div ref={outputContainerRef} className='output-container'>
            {/* Artifacts will be rendered here */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataAnalysisAgent
