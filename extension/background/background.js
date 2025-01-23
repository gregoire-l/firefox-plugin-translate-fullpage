// Listen for toolbar button clicks
browser.browserAction.onClicked.addListener( (tab) => {
  console.log('Browser action clicked for tab:', tab.id);
  
  // Inject the content script if not already injected
  try {
    console.log('Attempting to inject content script...');
     browser.tabs.executeScript(tab.id, {
      file: "/content_scripts/translator.js"
    });
    console.log('Content script injected successfully');
    
    // Send message to trigger translation
    console.log('Sending translate message to content script...');
     browser.tabs.sendMessage(tab.id, {
      action: "translate"
    });
    console.log('Translation message sent successfully');
  } catch (error) {
    console.error("Error in browser action handler:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });
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
