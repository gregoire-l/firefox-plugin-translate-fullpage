class PageTranslator {
  constructor() {
    this.translationInProgress = false;
    this.config = null;
    // Add DOM marker for testing
    document.documentElement.setAttribute('data-translator-loaded', 'true');
    
    // Setup message bridge for testing
    window.addEventListener('message', async (event) => {
      if (event.data.action === 'getConfig') {
        const response = await browser.runtime.sendMessage({ action: "getConfig" });
        window.postMessage({ 
          type: 'configResponse', 
          config: response 
        }, '*');
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
      if (!responseData.text) {
        throw new Error('Invalid response format from webhook');
      }
      this.applyTranslation(responseData.text);

    } catch (error) {
      console.error('Translation error:', error);
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
