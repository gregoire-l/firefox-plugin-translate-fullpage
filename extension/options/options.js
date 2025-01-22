// Save options to browser.storage
function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    webhookUrl: document.querySelector("#webhook-url").value,
    targetLanguage: document.querySelector("#target-language").value,
    autoTranslate: document.querySelector("#auto-translate").checked
  });
}

// Restore options from browser.storage
async function restoreOptions() {
  const result = await browser.storage.local.get({
    webhookUrl: '',
    targetLanguage: navigator.language,
    autoTranslate: false
  });

  document.querySelector("#webhook-url").value = result.webhookUrl;
  document.querySelector("#target-language").value = result.targetLanguage;
  document.querySelector("#auto-translate").checked = result.autoTranslate;
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("change", saveOptions); 