import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-expect-error CSS imports are handled by the bundler at runtime.
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App/>
    </AuthProvider>
  </StrictMode>,
);
