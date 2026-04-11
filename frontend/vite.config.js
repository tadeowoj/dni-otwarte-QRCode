import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // Główna domena qr.zsoiz-czyzew.pl

  server: {
    host: true, // Słuchaj na wszystkich adresach lokalnych (umożliwia test ze smartfona pzez wi-fi)
    port: 3000
  }
});
