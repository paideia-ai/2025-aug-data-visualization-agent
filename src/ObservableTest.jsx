import React, { useState, useEffect } from 'react'
import { Runtime } from '@observablehq/runtime'
import { Library } from '@observablehq/stdlib'
import * as Plot from '@observablehq/plot'
import * as aq from 'arquero'

function ObservableTest() {
  const [testResults, setTestResults] = useState([])
  const [runtime, setRuntime] = useState(null)
  const [mainModule, setMainModule] = useState(null)
  const [nodes, setNodes] = useState(new Map())
  
  const addResult = (test, result, details = null) => {
    setTestResults(prev => [...prev, { test, result, details, timestamp: new Date().toISOString() }])
  }
  
  // Initialize runtime
  useEffect(() => {
    addResult('Initialize Runtime', 'Starting...')
    
    try {
      const rt = new Runtime(new Library())
      const mod = rt.module()
      
      addResult('Runtime Creation', 'SUCCESS', { runtime: !!rt, module: !!mod })
      
      // Create a simple inspector for debugging
      const inspector = {
        pending() {
          console.log('Variable is pending computation')
        },
        fulfilled(value) {
          console.log('Variable fulfilled with value:', value)
        },
        rejected(error) {
          console.log('Variable rejected with error:', error)
        }
      }
      
      // Define variables with observers to trigger computation
      const testFunc = mod.variable(inspector).define('testFunction', [], () => {
        console.log('Computing testFunction')
        return (x) => x * 2
      })
      
      const visitorFunc = mod.variable(inspector).define('getVisitorCountByHourRange', [], () => {
        console.log('Computing getVisitorCountByHourRange')
        return (hourStart, hourEnd) => {
          const data = []
          for (let hour = hourStart; hour <= Math.min(hourEnd, 23); hour++) {
            data.push({
              hour,
              visitors: Math.floor(Math.random() * 200) + 50,
              uniqueVisitors: Math.floor(Math.random() * 150) + 30,
              pageViews: Math.floor(Math.random() * 500) + 100
            })
          }
          return data
        }
      })
      
      const nodeMap = new Map()
      nodeMap.set('testFunction', { variable: testFunc, type: 'test' })
      nodeMap.set('getVisitorCountByHourRange', { variable: visitorFunc, type: 'data' })
      
      setRuntime(rt)
      setMainModule(mod)
      setNodes(nodeMap)
      
      addResult('Node Creation', 'SUCCESS', { nodeCount: nodeMap.size })
      
      // Force computation and wait for values
      rt._compute().then(() => {
        addResult('Computation Complete', 'INFO', {
          testFunction: typeof testFunc._value,
          getVisitorCountByHourRange: typeof visitorFunc._value
        })
      })
      
    } catch (error) {
      addResult('Runtime Setup', 'ERROR', error.toString())
    }
  }, [])
  
  // Test 1: Check if nodes have _value property
  const testNodeValues = async () => {
    addResult('Test Node Values', 'Running...')
    
    try {
      // Force computation
      await runtime._compute()
      
      const results = {}
      for (const [name, node] of nodes) {
        const hasVariable = !!node.variable
        const hasValue = node.variable && '_value' in node.variable
        const valueType = typeof node.variable?._value
        const value = node.variable?._value
        
        results[name] = {
          hasVariable,
          hasValue,
          valueType,
          isFunction: typeof value === 'function',
          functionString: typeof value === 'function' ? value.toString().substring(0, 50) + '...' : null
        }
        
        // Try to call the function if it exists
        if (typeof value === 'function' && name === 'testFunction') {
          try {
            const testResult = value(5)
            results[name].testCall = { input: 5, output: testResult, success: true }
          } catch (e) {
            results[name].testCall = { error: e.toString() }
          }
        }
        
        if (typeof value === 'function' && name === 'getVisitorCountByHourRange') {
          try {
            const testResult = value(9, 11)
            results[name].testCall = { 
              input: '(9, 11)', 
              outputLength: testResult?.length,
              firstItem: testResult?.[0],
              success: true 
            }
          } catch (e) {
            results[name].testCall = { error: e.toString() }
          }
        }
      }
      
      addResult('Node Values Test', 'SUCCESS', results)
    } catch (error) {
      addResult('Node Values Test', 'ERROR', error.toString())
    }
  }
  
  // Test 2: Create temp node with dependencies
  const testTempNode = () => {
    addResult('Test Temp Node', 'Running...')
    
    try {
      const tempName = `temp_${Date.now()}`
      
      // Create temp node that depends on getVisitorCountByHourRange
      const tempVar = mainModule.define(
        tempName,
        ['getVisitorCountByHourRange'],
        function(getVisitorCountByHourRange) {
          console.log('Temp node execution, getVisitorCountByHourRange type:', typeof getVisitorCountByHourRange)
          
          if (typeof getVisitorCountByHourRange !== 'function') {
            return { error: 'getVisitorCountByHourRange is not a function', type: typeof getVisitorCountByHourRange }
          }
          
          try {
            const result = getVisitorCountByHourRange(10, 12)
            return { success: true, dataLength: result.length, firstItem: result[0] }
          } catch (e) {
            return { error: e.toString() }
          }
        }
      )
      
      // Check the value
      const value = tempVar._value
      
      addResult('Temp Node Test', 'SUCCESS', {
        tempNodeCreated: true,
        valueType: typeof value,
        value: value
      })
      
      // Clean up
      tempVar.delete()
      
    } catch (error) {
      addResult('Temp Node Test', 'ERROR', error.toString())
    }
  }
  
  // Test 3: Evaluate code using Function constructor
  const testEvaluate = () => {
    addResult('Test Evaluate', 'Running...')
    
    try {
      const code = 'getVisitorCountByHourRange(0, 5)'
      
      // Method 1: Direct evaluation with node values
      const getVisitorCountByHourRange = nodes.get('getVisitorCountByHourRange')?.variable?._value
      
      if (!getVisitorCountByHourRange) {
        addResult('Evaluate Test Method 1', 'ERROR', 'Function not found in nodes')
      } else {
        try {
          const func = new Function('getVisitorCountByHourRange', `return ${code}`)
          const result = func(getVisitorCountByHourRange)
          addResult('Evaluate Test Method 1', 'SUCCESS', {
            code,
            resultLength: result?.length,
            firstItem: result?.[0]
          })
        } catch (e) {
          addResult('Evaluate Test Method 1', 'ERROR', e.toString())
        }
      }
      
      // Method 2: Using temp node
      const tempName = `evalTemp_${Date.now()}`
      const tempVar = mainModule.define(
        tempName,
        ['getVisitorCountByHourRange'],
        new Function('getVisitorCountByHourRange', `return ${code}`)
      )
      
      const tempValue = tempVar._value
      addResult('Evaluate Test Method 2', 'SUCCESS', {
        code,
        valueType: typeof tempValue,
        resultLength: tempValue?.length,
        firstItem: tempValue?.[0]
      })
      
      tempVar.delete()
      
    } catch (error) {
      addResult('Evaluate Test', 'ERROR', error.toString())
    }
  }
  
  // Test 4: Define a plot node
  const testPlotNode = async () => {
    addResult('Test Plot Node', 'Running...')
    
    try {
      // Create an observer to trigger computation
      const plotObserver = {
        pending() { console.log('Plot pending') },
        fulfilled(value) { 
          console.log('Plot fulfilled:', value)
          // Append to container when ready
          const container = document.getElementById('test-plot-container')
          if (container && value?.tagName) {
            container.innerHTML = ''
            container.appendChild(value)
            addResult('Plot Render', 'SUCCESS', 'Plot rendered to container')
          }
        },
        rejected(error) { console.log('Plot rejected:', error) }
      }
      
      const plotNode = mainModule.variable(plotObserver).define(
        'testPlot',
        ['getVisitorCountByHourRange'],
        function(getVisitorCountByHourRange) {
          const data = getVisitorCountByHourRange(0, 23)
          return Plot.plot({
            title: "Visitor Traffic Test",
            width: 600,
            height: 300,
            marks: [
              Plot.line(data, {x: "hour", y: "visitors", stroke: "steelblue"}),
              Plot.dot(data, {x: "hour", y: "visitors", fill: "steelblue"})
            ]
          })
        }
      )
      
      // Force computation
      await runtime._compute()
      
      const plotValue = plotNode._value
      
      addResult('Plot Node Test', 'SUCCESS', {
        created: true,
        valueType: typeof plotValue,
        isDOMElement: plotValue?.tagName !== undefined,
        tagName: plotValue?.tagName
      })
      
    } catch (error) {
      addResult('Plot Node Test', 'ERROR', error.toString())
    }
  }
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Observable Runtime Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testNodeValues} style={{ margin: '5px' }}>Test Node Values</button>
        <button onClick={testTempNode} style={{ margin: '5px' }}>Test Temp Node</button>
        <button onClick={testEvaluate} style={{ margin: '5px' }}>Test Evaluate</button>
        <button onClick={testPlotNode} style={{ margin: '5px' }}>Test Plot Node</button>
        <button onClick={() => setTestResults([])} style={{ margin: '5px' }}>Clear Results</button>
      </div>
      
      <div id="test-plot-container" style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        marginBottom: '20px',
        minHeight: '100px',
        backgroundColor: '#f9f9f9'
      }}>
        <em>Plot will appear here...</em>
      </div>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
        <h2>Test Results:</h2>
        {testResults.map((result, idx) => (
          <div key={idx} style={{ 
            marginBottom: '10px', 
            padding: '10px', 
            backgroundColor: result.result === 'ERROR' ? '#fee' : 
                           result.result === 'SUCCESS' ? '#efe' : '#fff',
            border: '1px solid #ddd',
            borderRadius: '3px'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              [{result.timestamp}] {result.test}: {result.result}
            </div>
            {result.details && (
              <pre style={{ 
                margin: '5px 0 0 0', 
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ObservableTest