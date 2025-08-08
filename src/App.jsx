import React, { useState } from 'react'
import ObservableDemo from './ObservableDemo'
import ChatPage from './ChatPage'
import AIPlotTeacher from './AIPlotTeacher'
import DataAnalysisAgent from './DataAnalysisAgent'
import ObservableTest from './ObservableTest'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('data-agent')

  return (
    <div className="app">
      <nav className="nav">
        <button 
          className={currentPage === 'test' ? 'active' : ''}
          onClick={() => setCurrentPage('test')}
          style={{ backgroundColor: '#ff6b6b', color: 'white' }}
        >
          🧪 TEST PAGE
        </button>
        <button 
          className={currentPage === 'data-agent' ? 'active' : ''}
          onClick={() => setCurrentPage('data-agent')}
        >
          📈 Data Analysis Agent
        </button>
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
        {currentPage === 'test' && <ObservableTest />}
        {currentPage === 'data-agent' && <DataAnalysisAgent />}
        {currentPage === 'plot-teacher' && <AIPlotTeacher />}
        {currentPage === 'observable' && <ObservableDemo />}
        {currentPage === 'chat' && <ChatPage />}
      </div>
    </div>
  )
}

export default App