import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Assuming you are using @tailwindcss/vite for Tailwind CSS v4

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Include all plugins within a single array
  ],
});