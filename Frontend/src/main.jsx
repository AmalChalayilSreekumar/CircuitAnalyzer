import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.jsx'
import './index.css'

function Auth0ProviderWithNavigate({ children }) {
  const navigate = useNavigate()
  return (
    <Auth0Provider
      domain="dev-dppbhr3symbhip0o.us.auth0.com"
      clientId="xsCXBXWGWszulwp3dOl9kpl4RqQoJAjs"
      authorizationParams={{ redirect_uri: window.location.origin }}
      onRedirectCallback={(appState) => navigate(appState?.returnTo ?? '/')}
    >
      {children}
    </Auth0Provider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <App />
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  </StrictMode>,
)
