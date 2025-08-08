import React, { useState } from 'react'
import ObservableDemo from './ObservableDemo'
import ChatPage from './ChatPage'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('observable')

  return (
    <div className="app">
      <nav className="nav">
        <button 
          className={currentPage === 'observable' ? 'active' : ''}
          onClick={() => setCurrentPage('observable')}
        >
          Observable Plot Demo
        </button>
        <button 
          className={currentPage === 'chat' ? 'active' : ''}
          onClick={() => setCurrentPage('chat')}
        >
          AI Chat
        </button>
      </nav>
      
      <div className="content">
        {currentPage === 'observable' && <ObservableDemo />}
        {currentPage === 'chat' && <ChatPage />}
      </div>
    </div>
  )
}

export default App