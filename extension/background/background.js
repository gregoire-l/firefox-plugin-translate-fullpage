// Listen for toolbar button clicks
browser.browserAction.onClicked.addListener(async (tab) => {
  // Inject the content script if not already injected
  try {
    await browser.tabs.executeScript(tab.id, {
      file: "/content_scripts/translator.js"
    });
    
    // Send message to trigger translation
    await browser.tabs.sendMessage(tab.id, {
      action: "translate"
    });
  } catch (error) {
    console.error("Error injecting script:", error);
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