import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dni-otwarte-QRCode/', // Umożliwia hostowanie na ścieżkach wymuszanych przez Github Pages

  server: {
    host: true, // Słuchaj na wszystkich adresach lokalnych (umożliwia test ze smartfona pzez wi-fi)
    port: 3000
  }
});
