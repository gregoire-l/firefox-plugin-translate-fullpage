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
    
    // Vérifier que l'extension est chargée en vérifiant la présence du bouton dans la barre d'outils
    // On peut le faire en vérifiant si le script de l'extension a été injecté
    const hasTranslator = await page.evaluate(() => {
      return typeof window.PageTranslator !== 'undefined';
    });
    expect(hasTranslator).toBeTruthy();
    
    extensionLoaded = true;
  });

  test('should have configurable settings', async () => {
    test.skip(!extensionLoaded, 'Extension not loaded, skipping remaining tests');
    
    // Vérifier les paramètres via l'API storage de l'extension
    const settings = await page.evaluate(() => {
      return browser.storage.local.get({
        webhookUrl: '',
        targetLanguage: '',
        autoTranslate: false
      });
    });
    
    expect(settings).toHaveProperty('webhookUrl');
    expect(settings).toHaveProperty('targetLanguage');
    expect(settings).toHaveProperty('autoTranslate');
  });

  test('should translate page content', async () => {
    test.skip(!extensionLoaded, 'Extension not loaded, skipping remaining tests');
    
    await page.goto(`http://localhost:${TEST_PORT}/test.html`);
    const originalTitle = await page.textContent('#main-title');
    const originalSimpleText = await page.textContent('#simple-text');
    
    // Déclencher la traduction via l'API de l'extension
    await page.evaluate(() => {
      const translator = new window.PageTranslator();
      return translator.translatePage();
    });
    
    await page.waitForTimeout(2000);
    
    const translatedTitle = await page.textContent('#main-title');
    const translatedSimpleText = await page.textContent('#simple-text');
    
    expect(translatedTitle).not.toBe(originalTitle);
    expect(translatedSimpleText).not.toBe(originalSimpleText);
  });

  test('should translate dynamic content', async () => {
    test.skip(!extensionLoaded, 'Extension not loaded, skipping remaining tests');
    
    const originalText = await page.textContent('#dynamic-text');
    
    await page.click('text=Change Text');
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