// Clic gauche : déclencher la traduction
browser.browserAction.onClicked.addListener(async (tab) => {
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
});

// Clic droit : menu contextuel pour options
browser.contextMenus.create({
  id: "open-options",
  title: "Options",
  contexts: ["browser_action"]
});

browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-options") {
    browser.runtime.openOptionsPage();
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
