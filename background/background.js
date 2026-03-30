// Background service worker
// Listens for messages from popup and relay to content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getTabInfo") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ tabId: tabs[0].id, url: tabs[0].url });
      }
    });
    return true; // Keep channel open for async response
  }
});
