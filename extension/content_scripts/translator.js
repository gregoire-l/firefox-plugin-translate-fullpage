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
          console.log('Nouvelle configuration:', translator.config);
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
    console.log('Starting translation with config:', this.config);

    try {
      // 1. Clone the body to avoid modifying the original during preparation
      const bodyClone = document.body.cloneNode(true);
      
      // 2. Add translation markers to text nodes
      this.markTextNodes(bodyClone);

      // 3. Send to webhook
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: this.config.targetLanguage,
          content: bodyClone.innerHTML
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
      this.applyTranslation(responseData.text);
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
        originalSpan.textContent = span.textContent;
        // Remove the marker after translation
        originalSpan.removeAttribute('data-translate-id');
      }
    });
  }
}

// Initialize translator
const translator = new PageTranslator(); 
