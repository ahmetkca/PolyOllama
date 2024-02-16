import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from './components/ui/sonner.tsx'
import { WebSocketProvider } from './WebSocketContext.tsx'
import { ThemeProvider } from "@/components/theme-provider";

import polyllamaIco from "./assets/polyllama_1.svg";

// change favicon
// add link rel="icon" href="favicon.ico" to index.html
// we don't know if there is a link with rel="icon" in index.html

const favicon = document.querySelector('link[rel="icon"]');
if (favicon) {
  (favicon as HTMLLinkElement).href = polyllamaIco;
} else {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = polyllamaIco;
  document.head.appendChild(link)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <WebSocketProvider host="127.0.0.1" port={3333}>

        <App />

      </WebSocketProvider>
    </ThemeProvider>
    <Toaster />
  </React.StrictMode>,
)
