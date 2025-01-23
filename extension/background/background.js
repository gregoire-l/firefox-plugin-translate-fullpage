// Listen for toolbar button clicks
browser.browserAction.onClicked.addListener(async (tab) => {
  try {
    console.log('Browser action clicked for tab:', tab.id);
    
    // Send directly the translation command
    await browser.tabs.sendMessage(tab.id, { action: "translate" });
    console.log('Translation message sent successfully');
    
  } catch (error) {
    console.error("Error in browser action handler:", error);
    // Attempt to reload script if needed
    await browser.tabs.reload(tab.id);
    await browser.tabs.sendMessage(tab.id, { action: "translate" });
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
