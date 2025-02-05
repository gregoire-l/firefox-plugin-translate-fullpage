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
      targetLanguage: navigator.language,
      isDev: false // Nouveau paramètre
    });
    
    this.isDev = this.config.isDev;

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

      if (this.isDev) {
        // Mode dev: Appliquer le style rouge directement
        this.applyDevStyle();
        console.log('Mode dev - Texte marqué en rouge');
        return;
      }

      // Mode production: Appel webhook normal
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: this.config.targetLanguage,
          content: this.collectTranslationContent()
        })
      });

      // 4. Get translated content and apply it
      const responseData = await response.json();
      console.log('Webhook response:', JSON.stringify(responseData, null, 2));
      if (!responseData.body) {
        const errMsg = `Invalid response format from webhook: ${JSON.stringify(responseData)}`;
        console.error(errMsg);
        throw new Error(errMsg);
      }
      console.log('Applying translation...');
      this.applyTranslation(responseData);
      console.log('DOM après application traduction:\n', document.documentElement.outerHTML);
      console.log('Translation completed successfully');

    } catch (error) {
      console.error('Translation error:', error.message, '\nStack:', error.stack);
    } finally {
      this.translationInProgress = false;
    }
  }

  applyDevStyle() {
    // Appliquer le style rouge à tous les éléments marqués
    const markedElements = document.querySelectorAll('[data-translate-id]');
    markedElements.forEach(el => {
      el.style.color = 'red';
      el.style.backgroundColor = '#fff0f0';
      el.style.border = '1px solid #ffcccc';
    });
  }

  markTextNodes(element) {
    const nodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    // First collect all text nodes
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length > 0 && 
          node.parentElement.tagName !== 'SCRIPT' && 
          node.parentElement.tagName !== 'STYLE') {
        nodes.push(node);
      }
    }

    // Then process them after collection
    let counter = 0;
    for (const node of nodes) {
      const wrapper = document.createElement('span');
      wrapper.setAttribute('data-translate-id', `t${counter}`);
      wrapper.textContent = node.textContent;
      node.parentNode.replaceChild(wrapper, node);
      counter++;
    }
    console.log('Nombre de text nodes marqués:', counter);
  }

  collectTranslationContent() {
    const content = {};
    const elements = document.querySelectorAll('[data-translate-id]');
    elements.forEach(el => {
      content[el.getAttribute('data-translate-id')] = el.textContent;
    });
    return content;
  }

  applyTranslation(responseData) {
    // Vérifier la structure de la réponse
    if (!responseData.body) {
      throw new Error('Invalid response format: missing body property');
    }

    // Appliquer les traductions
    Object.entries(responseData.body).forEach(([id, translatedText]) => {
      const element = document.querySelector(`[data-translate-id="${id}"]`);
      if (element) {
        element.textContent = translatedText;
        console.log('Texte traduit appliqué pour', id, ':', translatedText);
        
        // Remplacer le span par le texte directement
        const textNode = document.createTextNode(translatedText);
        element.parentNode.replaceChild(textNode, element);
      } else {
        console.warn('Élément non trouvé pour ID:', id);
      }
    });

    // Nettoyer les IDs après traduction
    document.querySelectorAll('[data-translate-id]').forEach(el => {
      el.removeAttribute('data-translate-id');
    });
  }
}

// Initialize translator
const translator = new PageTranslator();

// Add listener for runtime messages
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'translate') {
    translator.translatePage();
  }
});
