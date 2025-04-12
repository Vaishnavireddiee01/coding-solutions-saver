// Basic background service worker for Manifest v3
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Add any other background listeners you need here
// For example:
chrome.action.onClicked.addListener((tab) => {
  // Handle browser action click if needed
});