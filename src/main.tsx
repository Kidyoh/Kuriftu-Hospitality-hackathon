import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { YouTubeProvider } from './components/youtube/YouTubeProvider'

createRoot(document.getElementById("root")!).render(
  <YouTubeProvider>
    <App />
  </YouTubeProvider>
);
