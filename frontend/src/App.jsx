import React from 'react'
import './App.css'
import TargetList from './components/Targets'


function App() {
  return (
    <div className='App'>
      <header className='App-header'>
        <h1>Subdomain Monitor</h1>
      </header>
      <main>
        <TargetList />
      </main>
    </div>
  )
}

export default App
