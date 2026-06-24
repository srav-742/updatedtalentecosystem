import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import apiClient, { CLIENT_ID, CLIENT_SECRET } from './utils/apiClient'

window.apiClient = apiClient;
window.CLIENT_ID = CLIENT_ID;
window.CLIENT_SECRET = CLIENT_SECRET;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
