import React, { useState } from 'react'
import ObservableDemo from './ObservableDemo'
import ChatPage from './ChatPage'
import AIPlotTeacher from './AIPlotTeacher'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('plot-teacher')

  return (
    <div className="app">
      <nav className="nav">
        <button 
          className={currentPage === 'plot-teacher' ? 'active' : ''}
          onClick={() => setCurrentPage('plot-teacher')}
        >
          📊 AI Plot Teacher
        </button>
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
        {currentPage === 'plot-teacher' && <AIPlotTeacher />}
        {currentPage === 'observable' && <ObservableDemo />}
        {currentPage === 'chat' && <ChatPage />}
      </div>
    </div>
  )
}

export default App