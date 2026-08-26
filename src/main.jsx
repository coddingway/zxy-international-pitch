import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppV2 from './v2/App.jsx'
import './index.css'

// Two independent variants of the presentation from one deploy. Picked by path
// rather than a router — there are exactly two, and adding react-router for a
// single branch would be more moving parts than the decision needs.
const isV2 = window.location.pathname.replace(/\/+$/, '').endsWith('/v2')

ReactDOM.createRoot(document.getElementById('root')).render(isV2 ? <AppV2 /> : <App />)
