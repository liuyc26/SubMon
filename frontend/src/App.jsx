import React, { useEffect, useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TargetList from './components/Targets'
import TargetDetails from './components/TargetDetails'

function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className='dashboard-shell'>
      <BrowserRouter>
        <header className='dashboard-header'>
          <div>
            <h1>SubMon Dashboard</h1>
            <p>Track targets and monitor discovered subdomains.</p>
          </div>
          <button
            className='btn btn-theme-icon'
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            type='button'
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
                <path
                  d='M12 4V2m0 20v-2m8-8h2M2 12h2m12.95 4.95 1.41 1.41M5.64 5.64 7.05 7.05m9.9-1.41 1.41-1.41M5.64 18.36l1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            ) : (
              <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
                <path
                  d='M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            )}
          </button>
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
