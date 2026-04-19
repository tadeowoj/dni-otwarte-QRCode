const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";

async function applyPublicUiConfig() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_public_settings", payload: {} })
    });
    const res = await response.json();
    
    if (res.status === "success" && res.data) {
      applyConfigToDom(res.data);
    }
  } catch (err) {
    console.error("Nie udalo sie pobrac konfiguracji UI:", err);
  }
}

function applyConfigToDom(config) {
  // 1. Zastosowanie stylów (kolory)
  const styleEl = document.createElement("style");
  let cssRules = ":root {\n";
  
  if (config.ui_color_primary) {
    cssRules += `  --clr-purple-dark: ${config.ui_color_primary};\n`;
    // Dla wariantu light można lekko wyliczać rgba lub zostawić bazujący na zaufaniu (tutaj po prostu ustawimy purpurowy jasny na głowny w lekkiej modyfikacji, ale prościej nadpisać tylko dark)
    // Zastąpmy główny kolor, a button-hover polegające na var() same załapią
    cssRules += `  --clr-purple-light: ${config.ui_color_primary};\n`;
  }
  if (config.ui_color_secondary) {
    cssRules += `  --clr-neon-green: ${config.ui_color_secondary};\n`;
  }
  
  cssRules += "}";
  styleEl.textContent = cssRules;
  document.head.appendChild(styleEl);

  // 2. Podmiana logo
  if (config.ui_logo_url) {
    const videoLogos = document.querySelectorAll('.hero-logo-video, .lottery-logo-video');
    const url = config.ui_logo_url.toLowerCase();
    const isVideo = url.endsWith('.webm') || url.endsWith('.mp4');
    
    videoLogos.forEach(logoElement => {
      if (isVideo) {
        if (logoElement.tagName.toLowerCase() === 'video') {
          const source = logoElement.querySelector('source');
          if (source) {
            source.src = config.ui_logo_url;
            logoElement.load();
          }
        }
      } else {
        // Jeśli podano obraz, upewnijmy się że wyświetla się obraz zamiast wideo
        if (logoElement.tagName.toLowerCase() === 'video') {
          const img = document.createElement('img');
          img.src = config.ui_logo_url;
          img.className = logoElement.className;
          // Przenosiny alt, jeżeli jest konieczny, ale z reguły czysta podmiana.
          logoElement.replaceWith(img);
        } else if (logoElement.tagName.toLowerCase() === 'img') {
          logoElement.src = config.ui_logo_url;
        }
      }
    });
  }
}

// Uruchamiamy od razu
applyPublicUiConfig();
