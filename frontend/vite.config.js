import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Umożliwia hostowanie na ścieżkach np. w Github Pages
  server: {
    host: true, // Słuchaj na wszystkich adresach lokalnych (umożliwia test ze smartfona pzez wi-fi)
    port: 3000
  }
});
