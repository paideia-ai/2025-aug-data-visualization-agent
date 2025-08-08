import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import * as Plot from '@observablehq/plot'
import * as aq from 'arquero'
import { Runtime } from '@observablehq/runtime'
import { Library } from '@observablehq/stdlib'
import './DataAnalysisAgent.css'

function DataAnalysisAgent() {
  const [input, setInput] = useState('show me website visitor data in a table format')
  const [runtime, setRuntime] = useState(null)
  const [mainModule, setMainModule] = useState(null)
  const [nodes, setNodes] = useState(new Map())
  const [artifacts, setArtifacts] = useState([])
  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(0)
  const outputContainerRef = useRef(null)
  
  const { messages, sendMessage, status, error, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/data-analysis-agent',
    }),
    sendAutomaticallyWhen: () => false,
  })

  // Update debug object when state changes
  useEffect(() => {
    if (window.observableDebug) {
      window.observableDebug.nodes = nodes
      window.observableDebug.runtime = runtime
      window.observableDebug.module = mainModule
      window.observableDebug.getArtifacts = () => artifacts
      window.observableDebug.getCurrentArtifact = () => artifacts[currentArtifactIndex]
      
      // Update the debug utilities to use current state
      window.observableDebug.getNode = (name) => {
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
          inputs: node.inputs || []
        }
      }
      
      window.observableDebug.listNodes = () => {
        const result = []
        for (const [name, node] of nodes) {
          result.push({
            name,
            type: node.type,
            hasValue: '_value' in node.variable,
            valueType: typeof node.variable._value,
            inputs: node.inputs || []
          })
        }
        return result
      }
      
      window.observableDebug.getValue = (name) => {
        return nodes.get(name)?.variable?._value
      }
    }
  }, [nodes, runtime, mainModule, artifacts, currentArtifactIndex])
  
  // Initialize Observable runtime
  useEffect(() => {
    console.log('🚀 Initializing Observable runtime')
    const rt = new Runtime(new Library())
    const mod = rt.module()
    
    // Create a simple observer to trigger computation
    const dataObserver = {
      pending() {},
      fulfilled(value) { console.log('Data function computed:', typeof value) },
      rejected(error) { console.error('Data function error:', error) }
    }
    
    // Define initial data query methods WITH observers
    const initialNodes = {
      // Website analytics data
      getVisitorCountByHourRange: mod.variable(dataObserver).define('getVisitorCountByHourRange', [], () => {
        return (hourStart, hourEnd) => {
          const data = []
          for (let hour = hourStart; hour <= Math.min(hourEnd, 23); hour++) {
            // Simulate realistic traffic patterns with peaks at 10am and 3pm
            const baseCount = 100
            const peakMultiplier = hour === 10 || hour === 15 ? 2.5 : 
                                 hour >= 9 && hour <= 17 ? 1.8 : 0.6
            const randomVariation = Math.random() * 30 - 15
            data.push({
              hour,
              visitors: Math.round(baseCount * peakMultiplier + randomVariation),
              uniqueVisitors: Math.round((baseCount * peakMultiplier + randomVariation) * 0.7),
              pageViews: Math.round((baseCount * peakMultiplier + randomVariation) * 3.5)
            })
          }
          return data
        }
      }),
      
      // Product sales data
      getProductSalesByCategory: mod.variable(dataObserver).define('getProductSalesByCategory', [], () => {
        return (category = null) => {
          const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports']
          const products = {
            'Electronics': ['Laptop', 'Phone', 'Tablet', 'Headphones', 'Camera'],
            'Clothing': ['T-Shirt', 'Jeans', 'Dress', 'Jacket', 'Shoes'],
            'Books': ['Fiction', 'Non-Fiction', 'Science', 'History', 'Art'],
            'Home & Garden': ['Furniture', 'Decor', 'Tools', 'Plants', 'Kitchen'],
            'Sports': ['Running Shoes', 'Yoga Mat', 'Weights', 'Bike', 'Tennis Racket']
          }
          
          const data = []
          const categoriesToProcess = category ? [category] : categories
          
          for (const cat of categoriesToProcess) {
            if (products[cat]) {
              for (const product of products[cat]) {
                data.push({
                  category: cat,
                  product,
                  unitsSold: Math.floor(Math.random() * 500) + 50,
                  revenue: Math.floor(Math.random() * 50000) + 5000,
                  profit: Math.floor(Math.random() * 10000) + 1000,
                  rating: (Math.random() * 2 + 3).toFixed(1)
                })
              }
            }
          }
          return data
        }
      }),
      
      // Customer demographics data
      getCustomerDemographics: mod.variable(dataObserver).define('getCustomerDemographics', [], () => {
        return (ageMin = 18, ageMax = 65) => {
          const data = []
          const segments = ['Budget', 'Standard', 'Premium']
          const regions = ['North', 'South', 'East', 'West', 'Central']
          
          for (let age = ageMin; age <= ageMax; age += 5) {
            for (const segment of segments) {
              for (const region of regions) {
                const count = Math.floor(Math.random() * 100) + 20
                data.push({
                  ageGroup: `${age}-${age + 4}`,
                  segment,
                  region,
                  customerCount: count,
                  avgSpending: Math.floor(Math.random() * 500) + 100,
                  retentionRate: (Math.random() * 40 + 60).toFixed(1)
                })
              }
            }
          }
          return data
        }
      }),
      
      // Time series sales data
      getMonthlySalesData: mod.variable(dataObserver).define('getMonthlySalesData', [], () => {
        return (startMonth = 1, endMonth = 12, year = 2024) => {
          const data = []
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          
          for (let month = startMonth; month <= endMonth; month++) {
            const baseSales = 100000
            const seasonalMultiplier = month === 12 || month === 11 ? 1.5 : 
                                     month >= 6 && month <= 8 ? 0.8 : 1.0
            const trend = month * 2000 // Growing trend
            const randomVariation = Math.random() * 20000 - 10000
            
            data.push({
              month: months[month - 1],
              monthNumber: month,
              year,
              sales: Math.round(baseSales * seasonalMultiplier + trend + randomVariation),
              orders: Math.floor(Math.random() * 2000) + 1000,
              averageOrderValue: Math.floor(Math.random() * 100) + 50,
              newCustomers: Math.floor(Math.random() * 500) + 200
            })
          }
          return data
        }
      })
    }
    
    // Store node references
    const nodeMap = new Map()
    for (const [name, variable] of Object.entries(initialNodes)) {
      nodeMap.set(name, {
        type: 'data',
        variable,
        inputs: []
      })
    }
    
    setRuntime(rt)
    setMainModule(mod)
    setNodes(nodeMap)
    
    // Force initial computation of data functions
    rt._compute().then(() => {
      console.log('✅ Runtime initialized and computed with', nodeMap.size, 'initial nodes')
    })
    
    // Add debugging utilities to window
    if (!window.observableDebug) {
      window.observableDebug = {
        runtime: rt,
        module: mod,
        nodes: nodeMap,
        // List all variables in the module scope
        listScope: () => {
          if (!mod._scope) return []
          return Array.from(mod._scope).map(([name, variable]) => ({
            name,
            hasValue: '_value' in variable,
            valueType: typeof variable._value
          }))
        },
        // Force recomputation
        compute: async () => {
          await rt._compute()
          console.log('Computation complete')
        }
      }
      console.log('🔧 Debug utilities added to window.observableDebug')
      console.log('Available commands: getNode(name), listNodes(), getValue(name), listScope(), compute(), getArtifacts()')
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
          inputs: node.inputs || []
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
      
      // Delete existing node if it exists
      if (nodes.has(name)) {
        nodes.get(name).variable.delete()
      }
      
      // Create observer for the node
      const nodeObserver = {
        pending() {},
        fulfilled(value) { console.log(`Node ${name} computed:`, typeof value) },
        rejected(error) { console.error(`Node ${name} error:`, error) }
      }
      
      // Create the node definition function with observer
      const variable = mainModule.variable(nodeObserver).define(name, inputs, function(...inputValues) {
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
          ...queryMethods
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
        inputs
      })
      
      // Force computation of the new node
      await runtime._compute()
      
      console.log(`  Node ${name} defined successfully`)
      return { nodeId: name, status: 'success' }
    } catch (error) {
      console.error('Error defining node:', error)
      return { nodeId: name, status: 'error', error: error.toString() }
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
          initialValue = config.min || 0
          inputElement = document.createElement('input')
          inputElement.type = 'range'
          inputElement.min = config.min || 0
          inputElement.max = config.max || 100
          inputElement.step = config.step || 1
          inputElement.value = initialValue
          break
          
        case 'select':
          initialValue = config.options?.[0] || ''
          inputElement = document.createElement('select')
          for (const option of (config.options || [])) {
            const opt = document.createElement('option')
            opt.value = option
            opt.text = option
            inputElement.appendChild(opt)
          }
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
      
      // Create the input node with Observable
      const variable = mainModule.define(name, [], () => {
        const generator = mainModule.Generators.input(inputElement)
        return generator.next().value
      })
      
      nodes.set(name, {
        type: 'input',
        variable,
        element: inputElement,
        inputs: []
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
      nodes: []
    }
    setArtifacts(prev => [...prev, artifact])
    setCurrentArtifactIndex(artifacts.length)
    return { artifactId: id }
  }
  
  const addToArtifact = (artifactId, nodeId, displayType = 'auto') => {
    setArtifacts(prev => prev.map(artifact => {
      if (artifact.id === artifactId) {
        return {
          ...artifact,
          nodes: [...artifact.nodes, { nodeId, displayType }]
        }
      }
      return artifact
    }))
    return { status: 'success' }
  }
  
  const removeFromArtifact = (artifactId, nodeId) => {
    setArtifacts(prev => prev.map(artifact => {
      if (artifact.id === artifactId) {
        return {
          ...artifact,
          nodes: artifact.nodes.filter(n => n.nodeId !== nodeId)
        }
      }
      return artifact
    }))
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
              error: 'Result too large (> 2000 characters). Please refine your query or stringify manually with a prefix.'
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
        pending() { console.log('  Temp node pending') },
        fulfilled(value) { 
          console.log('  Temp node fulfilled with:', value)
          tempResult = value 
        },
        rejected(error) { 
          console.error('  Temp node rejected:', error)
          tempError = error 
        }
      }
      
      // Define the temp node that evaluates the code with observer
      // Use the data functions as dependencies
      const tempVariable = mainModule.variable(tempObserver).define(
        tempName, 
        ['getVisitorCountByHourRange', 'getProductSalesByCategory', 'getCustomerDemographics', 'getMonthlySalesData'],
        function(getVisitorCountByHourRange, getProductSalesByCategory, getCustomerDemographics, getMonthlySalesData) {
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
            getMonthlySalesData
          }
          
          // Execute the code
          const func = new Function(...Object.keys(context), code)
          const result = func(...Object.values(context))
          console.log('  Evaluation result:', result)
          return result
        }
      )
      
      // Store the temp node
      nodes.set(tempName, {
        type: 'temp',
        variable: tempVariable,
        inputs: ['getVisitorCountByHourRange', 'getProductSalesByCategory', 'getCustomerDemographics', 'getMonthlySalesData']
      })
      
      // Force computation
      await runtime._compute()
      
      // Get the computed value - prefer tempResult from observer
      let value = tempResult !== undefined ? tempResult : tempVariable._value
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
            error: 'Result too large (> 2000 characters). Please refine your query or stringify manually with a prefix.'
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
          Object.keys(data[0]).forEach(key => {
            const th = document.createElement('th')
            th.textContent = key
            headerRow.appendChild(th)
          })
          thead.appendChild(headerRow)
          table.appendChild(thead)
          
          // Create body
          const tbody = document.createElement('tbody')
          data.slice(0, 10).forEach(row => {
            const tr = document.createElement('tr')
            Object.values(row).forEach(val => {
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
      } else if (node.type === 'input') {
        // It's an input control
        const label = document.createElement('label')
        label.textContent = nodeId + ': '
        label.appendChild(node.element)
        nodeContainer.appendChild(label)
      } else {
        // Plain JavaScript value
        const pre = document.createElement('pre')
        pre.textContent = JSON.stringify(value, null, 2)
        nodeContainer.appendChild(pre)
      }
      
      container.appendChild(nodeContainer)
    })
  }, [artifacts, currentArtifactIndex, nodes])
  
  return (
    <div className="data-analysis-agent">
      <div className="agent-header">
        <h1>📊 Data Analysis Agent</h1>
        <p>Interactive data analysis with Observable runtime</p>
      </div>
      
      <div className="agent-content">
        <div className="chat-section">
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
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
                <div className="message-role">
                  {message.role === 'user' ? '👤 You' : '🤖 Agent'}
                </div>
                <div className="message-content">
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return <span key={index}>{part.text}</span>
                    }
                    
                    const toolMatch = part.type.match(/^tool-(.+)$/)
                    if (toolMatch) {
                      return (
                        <div key={index} className="tool-status">
                          <div className="tool-header">
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
              <div className="message assistant-message">
                <div className="message-role">🤖 Agent</div>
                <div className="message-content typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) {
              sendMessage({
                parts: [{ type: 'text', text: input }],
              })
              setInput('')
            }
          }} className="chat-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to analyze data..."
              className="chat-input"
              disabled={status !== 'ready'}
            />
            <button
              type="submit"
              disabled={status !== 'ready' || !input.trim()}
              className="send-button"
            >
              {status === 'generating' ? 'Analyzing...' : 'Send'}
            </button>
          </form>
        </div>
        
        <div className="output-section">
          <div className="artifact-navigation">
            <button 
              onClick={() => setCurrentArtifactIndex(Math.max(0, currentArtifactIndex - 1))}
              disabled={currentArtifactIndex === 0}
              className="nav-button"
            >
              ← Previous
            </button>
            <span className="artifact-counter">
              {artifacts.length > 0 ? `${currentArtifactIndex + 1} / ${artifacts.length}` : 'No artifacts'}
            </span>
            <button 
              onClick={() => setCurrentArtifactIndex(Math.min(artifacts.length - 1, currentArtifactIndex + 1))}
              disabled={currentArtifactIndex >= artifacts.length - 1}
              className="nav-button"
            >
              Next →
            </button>
          </div>
          <div ref={outputContainerRef} className="output-container">
            {/* Artifacts will be rendered here */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataAnalysisAgent