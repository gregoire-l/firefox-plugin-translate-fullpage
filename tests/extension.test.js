const { test, expect } = require('@playwright/test');
const { firefox } = require('playwright');
const { withExtension } = require('playwright-webextext');
const path = require('path');
const fs = require('fs');
const http = require('http');

let server;
let browser;
let context;
let page;
let extensionLoaded = false;

const TEST_PORT = 3333;
const PROFILE_DIR = path.join(process.cwd(), 'firefox-profile');
const EXTENSION_PATH = path.join(process.cwd(), 'extension');

// Start a local server to serve test pages
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === '/test.html') {
        fs.readFile(path.join(__dirname, 'pages', 'test.html'), (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end('Error loading test.html');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        });
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(TEST_PORT, () => {
      console.log(`Test server running on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });
}

test.describe('Extension Tests', () => {
  test.beforeAll(async () => {
    // Ensure profile directory exists
    if (!fs.existsSync(PROFILE_DIR)) {
      fs.mkdirSync(PROFILE_DIR);
    }
    await startServer();

    // Setup browser with extension
    const browserTypeWithExtension = withExtension(firefox, EXTENSION_PATH);
    browser = await browserTypeWithExtension.launch({ headless: false });
    context = await browser.newContext();
    
    // Afficher les logs de la console du navigateur
    context.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      console.log(`[Browser ${type.toUpperCase()}] ${text}`);
    });
    
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
    await browser?.close();
    if (server) {
      server.close();
    }
  });

  test('should load extension properly', async () => {
    await page.goto(`http://localhost:${TEST_PORT}/test.html`);
    
    // Verify extension is loaded by checking for DOM marker
    await page.waitForSelector('[data-translator-loaded="true"]');
    const isLoaded = await page.evaluate(() => {
      return document.documentElement.hasAttribute('data-translator-loaded');
    });
    expect(isLoaded).toBeTruthy();
    
    extensionLoaded = true;
  });

  test('should have configurable settings', async () => {
    test.skip(!extensionLoaded, 'Extension not loaded, skipping remaining tests');
    
    // Récupérer les paramètres via le système de messages
    const settings = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Envoyer la requête
        window.postMessage({ action: 'getConfig' }, '*');
        
        // Écouter la réponse
        const messageHandler = (event) => {
          if (event.data.type === 'configResponse') {
            window.removeEventListener('message', messageHandler);
            resolve(event.data.config);
          }
        };
        window.addEventListener('message', messageHandler);
      });
    });
    
    expect(settings).toHaveProperty('webhookUrl');
    expect(settings).toHaveProperty('targetLanguage');
    expect(settings).toHaveProperty('autoTranslate');
  });

  test('should translate page content', async () => {
    test.skip(!extensionLoaded, 'Extension not loaded, skipping remaining tests');
    
    // Configurer le webhook via le système de messages avec structure JSON complète
    await page.evaluate((url) => {
      window.postMessage({
        action: 'setConfig',
        config: {
          webhookUrl: url,
          targetLanguage: 'fr', 
          autoTranslate: false,
          _timestamp: Date.now() // Force le rechargement
        }
      }, '*');
    }, process.env.WEBHOOK_URL);

    // Attendre la confirmation de la configuration
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute('data-translator-loaded') === 'true';
    }, { timeout: 5000 });

    await page.goto(`http://localhost:${TEST_PORT}/test.html`);
    const originalTitle = await page.textContent('#main-title');
    const originalSimpleText = await page.textContent('#simple-text');
    
    // Déclencher la traduction et vérifier le processus complet
    await page.evaluate(() => {
      window.postMessage({ action: 'translate' }, '*');
    });
    
    // Attendre directement la disparition des marqueurs avec un timeout étendu
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-translate-id]').length === 0;
    }, { timeout: 15000 });
    
    // Vérifier directement le résultat traduit
    await expect(page.locator('#main-title')).toContainText('Bienvenue', { timeout: 15000 });
    await expect(page.locator('#simple-text')).toContainText('paragraphe simple');
    
    // Vérifier la conservation des structures
    await expect(page.locator('#complex-html strong')).toBeVisible();
    await expect(page.locator('#test-list li')).toHaveCount(3);
    
    // Ajouter des vérifications intermédiaires
    const remainingMarkers = await page.evaluate(() => {
      return document.querySelectorAll('[data-translate-id]').length;
    });
    console.log(`Marqueurs restants: ${remainingMarkers}`);
    
    const translatedContent = await page.evaluate(() => {
      return {
        title: document.querySelector('#main-title').innerHTML,
        text: document.querySelector('#simple-text').innerHTML
      };
    });
    console.log('Contenu après traduction:', JSON.stringify(translatedContent, null, 2));
    
    await page.waitForTimeout(2000);
    
    const translatedTitle = await page.textContent('#main-title');
    const translatedSimpleText = await page.textContent('#simple-text');
    
    expect(translatedTitle).not.toBe(originalTitle);
    expect(translatedSimpleText).not.toBe(originalSimpleText);
  });

  test('should translate dynamic content', async () => {
    test.skip(!extensionLoaded, 'Extension not loaded, skipping remaining tests');
    
    const originalText = await page.textContent('#dynamic-text');
    
    // Cliquer sur le bouton avec le texte traduit ou original
    await page.click('button:has-text("Change Text"), button:has-text("Changer le texte")');
    await page.waitForTimeout(1000);
    
    const newText = await page.textContent('#dynamic-text');
    expect(newText).not.toBe(originalText);
    
    // Déclencher la traduction via l'API de l'extension
    await page.evaluate(() => {
      const translator = new window.PageTranslator();
      return translator.translatePage();
    });
    
    await page.waitForTimeout(2000);
    
    const translatedText = await page.textContent('#dynamic-text');
    expect(translatedText).not.toBe(newText);
  });
}); 
