import React from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TargetList from './components/Targets'
import TargetDetails from './components/TargetDetails'

function App() {
  return (
    <div className='dashboard-shell'>
      <BrowserRouter>
        <header className='dashboard-header'>
          <div>
            <h1>SubMon Dashboard</h1>
            <p>Track targets and monitor discovered subdomains.</p>
          </div>
        </header>
        <main className='dashboard-content'>
          <Routes>
            <Route path='/' element={<TargetList />}/>
            <Route path='/:targetName' element={<TargetDetails />}/>
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  )
}

export default App
