class PageTranslator {
  constructor() {
    this.translationInProgress = false;
    this.config = null;
    // Add DOM marker for testing
    document.documentElement.setAttribute('data-translator-loaded', 'true');
    
    // Setup message bridge between page and extension
    window.addEventListener('message', (event) => {
      if (event.data.action === 'getConfig') {
        browser.runtime.sendMessage({ action: "getConfig" })
          .then(response => {
            window.postMessage({
              type: 'configResponse',
              config: response
            }, '*');
          });
      } else if (event.data.action === 'translate') {
        translator.translatePage();
      } else if (event.data.action === 'setConfig') {
        // Sauvegarder dans le storage et mettre à jour la config
        browser.storage.local.set(event.data.config).then(() => {
          translator.config = { ...translator.config, ...event.data.config };
          console.log('Nouvelle configuration:', JSON.stringify(translator.config, null, 2));
        });
      }
    });
    
    this.init();
  }

  async init() {
    // Load configuration from storage
    this.config = await browser.storage.local.get({
      webhookUrl: '',
      autoTranslate: false,
      targetLanguage: navigator.language
    });

    if (this.config.autoTranslate) {
      this.translatePage();
    }
  }

  async translatePage() {
    if (this.translationInProgress) return;
    this.translationInProgress = true;
    
    console.log('DOM original:\n', document.documentElement.outerHTML);
    console.log('Starting translation with config:', JSON.stringify(this.config, null, 2));

    try {
      // 1. Mark text nodes directly in the live DOM
      console.log('DOM before marking:\n', document.documentElement.outerHTML);
      this.markTextNodes(document.body);
      console.log('DOM after marking:\n', document.documentElement.outerHTML);

      // 2. Send marked HTML to webhook
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: this.config.targetLanguage,
          content: document.body.innerHTML
        })
      });

      // 4. Get translated content and apply it
      const responseData = await response.json();
      console.log('Webhook response:', JSON.stringify(responseData, null, 2));
      if (!responseData.text) {
        const errMsg = `Invalid response format from webhook: ${JSON.stringify(responseData)}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
      console.log('Applying translation to', responseData.text.length, 'characters...');
      console.log('Réponse webhook reçue:\n', responseData.text);
      this.applyTranslation(responseData.text);
      console.log('DOM après application traduction:\n', document.documentElement.outerHTML);
      console.log('Translation completed successfully');

    } catch (error) {
      console.error('Translation error:', error.message, '\nStack:', error.stack);
    } finally {
      this.translationInProgress = false;
    }
  }

  markTextNodes(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    let counter = 0;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length > 0) {
        // Skip if parent is script or style
        if (node.parentElement.tagName === 'SCRIPT' || 
            node.parentElement.tagName === 'STYLE') {
          continue;
        }

        // Create a span wrapper with a unique ID
        const wrapper = document.createElement('span');
        wrapper.setAttribute('data-translate-id', `t${counter}`);
        wrapper.textContent = node.textContent;
        node.parentNode.replaceChild(wrapper, node);
        counter++;
      }
    }
  }

  applyTranslation(translatedHtml) {
    // Create a temporary container
    const temp = document.createElement('div');
    temp.innerHTML = translatedHtml;

    // Find all translated spans and apply translations
    const translatedSpans = temp.querySelectorAll('[data-translate-id]');
    translatedSpans.forEach(span => {
      const originalSpan = document.querySelector(`[data-translate-id="${span.getAttribute('data-translate-id')}"]`);
      if (originalSpan) {
        console.log('Remplacement élément:', {
          original: originalSpan.outerHTML,
          translated: span.outerHTML
        });
        
        // Remplacer le contenu tout en conservant la balise originale
        originalSpan.innerHTML = span.innerHTML;
        originalSpan.textContent = span.textContent;
        
        // Remove translation marker after applying translation
        originalSpan.removeAttribute('data-translate-id');
      }
    });
  }
}

// Initialize translator
const translator = new PageTranslator(); 
