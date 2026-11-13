import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose these (and only these) .env variables to the client bundle.
  envPrefix: ['VITE_', 'MARKET_DATA_', 'ALPHA_VANTAGE_'],
})
