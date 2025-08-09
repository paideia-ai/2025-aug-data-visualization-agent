import React, { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import './ChatPage.css'

function ChatPage() {
  const [input, setInput] = useState('')

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  return (
    <div className='chat-container'>
      <h1>AI Chat with Claude Sonnet</h1>

      <div className='messages-container'>
        {messages.length === 0 && (
          <div className='welcome-message'>
            <p>Welcome! Start a conversation with Claude Sonnet.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className='message-role'>
              {message.role === 'user' ? 'You' : 'Claude'}
            </div>
            <div className='message-content'>
              {message.parts.map((part, index) => part.type === 'text' ? <span key={index}>{part.text}</span> : null)}
            </div>
          </div>
        ))}

        {status === 'generating' && (
          <div className='message assistant-message'>
            <div className='message-role'>Claude</div>
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
          placeholder='Type your message...'
          className='chat-input'
          disabled={status !== 'ready'}
        />
        <button
          type='submit'
          disabled={status !== 'ready' || !input.trim()}
          className='send-button'
        >
          {status === 'generating' ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default ChatPage
