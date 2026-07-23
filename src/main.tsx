import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { PortalDataProvider } from './context/PortalDataContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { initObservability, ErrorBoundary } from './lib/observability'
import './styles/globals.css'

initObservability()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<div style={{ padding: 24, textAlign: 'center', color: '#e5e7eb' }}>Something went wrong. Please refresh the page.</div>}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <MotionConfig reducedMotion="user">
          <LanguageProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <PortalDataProvider>
                  <App />
                </PortalDataProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
          </LanguageProvider>
        </MotionConfig>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
