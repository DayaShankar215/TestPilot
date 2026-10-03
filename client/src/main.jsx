import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/global.css'
import './styles/layout.css'
import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'

createRoot(document.getElementById('root')).render(
  <AppProviders>
    <AppRouter />
  </AppProviders>,
)