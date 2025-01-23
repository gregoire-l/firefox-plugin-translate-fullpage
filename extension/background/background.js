// Create context menu item
browser.contextMenus.create({
  id: "translate-page",
  title: "Translate Page",
  contexts: ["browser_action"]
});

// Listen for context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-page") {
    try {
      await browser.tabs.executeScript(tab.id, {
        file: "/content_scripts/translator.js"
      });
      
      await browser.tabs.sendMessage(tab.id, {
        action: "translate"
      });
    } catch (error) {
      console.error("Error injecting script:", error);
    }
  }
});

// Listen for messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getConfig") {
    browser.storage.local.get({
      webhookUrl: '',
      targetLanguage: navigator.language,
      autoTranslate: false
    }).then(sendResponse);
    return true; // Will respond asynchronously
  }
}); 
