import React, { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import * as Plot from '@observablehq/plot'
import * as aq from 'arquero'
import { csv } from 'd3-fetch'
import './AIPlotTeacher.css'

function AIPlotTeacher() {
  const [input, setInput] = useState('')
  const plotContainerRef = useRef(null)
  const [plotResults, setPlotResults] = useState({})

  const { messages, sendMessage, status, error, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/plot-teacher',
    }),
    sendAutomaticallyWhen: () => false, // We'll manually control when to send
  })

  // Execute plot code in sandboxed environment
  const executePlotCode = async (code, toolCallId) => {
    console.log('Executing plot code for tool call:', toolCallId)
    console.log('Code:', code)

    const plotContainer = document.createElement('div')
    plotContainer.className = 'plot-output'
    plotContainer.id = `plot-${toolCallId}`

    try {
      // Create sandboxed environment with allowed globals
      const sandboxedEval = (code) => {
        // Create iframe for isolation
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        document.body.appendChild(iframe)

        // Inject allowed libraries into iframe
        iframe.contentWindow.Plot = Plot
        iframe.contentWindow.aq = aq
        iframe.contentWindow.d3 = { csv }
        iframe.contentWindow.console = {
          log: (...args) => console.log('[Plot Sandbox]:', ...args),
          error: (...args) => console.error('[Plot Sandbox]:', ...args),
        }

        // Create a container in iframe for the plot
        const iframeContainer = iframe.contentDocument.createElement('div')
        iframe.contentDocument.body.appendChild(iframeContainer)

        try {
          // Execute code in iframe context
          const result = iframe.contentWindow.eval(`
            (function() {
              const container = document.body.firstChild;
              ${code}
            })()
          `)

          // If a plot was created, move it to our container
          if (iframeContainer.firstChild) {
            plotContainer.appendChild(iframeContainer.firstChild)
          }

          // Clean up iframe
          document.body.removeChild(iframe)

          return { success: true, result }
        } catch (error) {
          // Clean up iframe on error
          document.body.removeChild(iframe)
          throw error
        }
      }

      const result = sandboxedEval(code)

      // Append plot to the display area
      if (plotContainerRef.current) {
        plotContainerRef.current.appendChild(plotContainer)
      }

      // Store result
      setPlotResults((prev) => ({
        ...prev,
        [toolCallId]: { success: true, message: 'Plot rendered successfully!' },
      }))

      // Add tool result
      await addToolResult({
        toolCallId,
        tool: 'draw_plot',
        output: 'Plot rendered successfully! The visualization is now displayed on the screen.',
      })

      console.log('Plot executed successfully for:', toolCallId)
    } catch (error) {
      console.error('Error executing plot code:', error)

      // Store error
      setPlotResults((prev) => ({
        ...prev,
        [toolCallId]: { success: false, error: error.toString() },
      }))

      // Add error as tool result
      await addToolResult({
        toolCallId,
        tool: 'draw_plot',
        output: `Error executing plot: ${error.message}. Please check the code and try again.`,
      })
    }
  }

  // Process messages for tool calls
  useEffect(() => {
    console.log('Messages updated, total messages:', messages.length)
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') {
      console.log('No assistant message to process')
      return
    }

    console.log('Last message:', {
      id: lastMessage.id,
      role: lastMessage.role,
      partsCount: lastMessage.parts?.length,
      parts: lastMessage.parts,
    })

    lastMessage.parts?.forEach(async (part, index) => {
      console.log(`Part ${index}:`, {
        type: part.type,
        state: part.state,
        fullPart: part,
      })

      // In v5, tool parts have typed names like 'tool-draw_plot'
      if (part.type === 'tool-draw_plot' && part.state === 'input-available') {
        console.log('🎯 Found draw_plot tool call! Executing...', part)
        const code = part.input?.code
        const toolCallId = part.toolCallId

        if (code) {
          console.log('Code to execute:', code)
          await executePlotCode(code, toolCallId)
          // Send message to continue conversation after tool execution
          console.log('Sending message to continue after tool execution')
          sendMessage()
        } else {
          console.error('No code found in tool call:', part)
        }
      }
    })
  }, [messages])

  // Log status changes
  useEffect(() => {
    console.log('Status changed:', status)
    if (status === 'ready') {
      console.log('✅ Ready to receive messages')
    } else if (status === 'generating') {
      console.log('⏳ Generating response...')
    }
  }, [status])

  return (
    <div className='ai-plot-teacher'>
      <div className='teacher-header'>
        <h1>📊 AI Plot Teacher</h1>
        <p>Ask me to create any visualization using Observable Plot and Arquero!</p>
        <p className='hint'>Try: "Show me a bar chart", "Create a scatter plot", or "Demonstrate a time series"</p>
      </div>

      <div className='teacher-content'>
        <div className='chat-section'>
          <div className='messages-container'>
            {messages.length === 0 && (
              <div className='welcome-message'>
                <p>👋 Hello! I'm your data visualization teacher.</p>
                <p>I can create various plots and charts to help you learn data visualization.</p>
                <p>Just ask me to show you any type of chart!</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className='message-role'>
                  {message.role === 'user' ? '👤 You' : '🤖 Teacher'}
                </div>
                <div className='message-content'>
                  {message.parts.map((part, index) => {
                    console.log('Rendering part:', part.type, part)

                    switch (part.type) {
                      case 'text':
                        return <span key={index}>{part.text}</span>

                      case 'tool-draw_plot': {
                        const result = plotResults[part.toolCallId]
                        return (
                          <div key={index} className='tool-status'>
                            <div className='tool-header'>
                              📊 {part.state === 'input-streaming'
                                ? 'Preparing plot...'
                                : part.state === 'input-available'
                                ? 'Drawing plot...'
                                : part.state === 'output-available'
                                ? 'Plot complete'
                                : 'Processing...'}
                            </div>
                            {part.state === 'input-available' && part.input?.code && (
                              <details className='code-preview'>
                                <summary>View code</summary>
                                <pre>{part.input.code.substring(0, 200)}...</pre>
                              </details>
                            )}
                            {part.state === 'output-available' && (
                              <div className={`tool-result ${result?.success ? 'success' : 'error'}`}>
                                {part.output ||
                                  (result?.success ? '✅ ' + result.message : '❌ ' + (result?.error || 'Error'))}
                              </div>
                            )}
                          </div>
                        )
                      }

                      default:
                        return null
                    }
                  })}
                </div>
              </div>
            ))}

            {status === 'generating' && (
              <div className='message assistant-message'>
                <div className='message-role'>🤖 Teacher</div>
                <div className='message-content typing'>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            {error && (
              <div className='error-message'>
                Error: {error.message}
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
              placeholder='Ask me to create a visualization...'
              className='chat-input'
              disabled={status !== 'ready'}
            />
            <button
              type='submit'
              disabled={status !== 'ready' || !input.trim()}
              className='send-button'
            >
              {status === 'generating' ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </div>

        <div className='plot-section'>
          <h2>📈 Visualization Output</h2>
          <div ref={plotContainerRef} className='plot-container'>
            {/* Plots will be dynamically inserted here */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIPlotTeacher
