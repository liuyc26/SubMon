import React from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TargetList from './components/Targets'
import TargetDetails from './components/TargetDetails'

function App() {
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<TargetList />}/>
          <Route path='/:targetName' element={<TargetDetails />}/>
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
