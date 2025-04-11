// Background script for the extension

// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('Code Solutions GitHub Saver extension installed');
});

// Set up context menu items
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'saveSolution',
    title: 'Save solution to GitHub',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://leetcode.com/problems/*',
      'https://practice.geeksforgeeks.org/problems/*',
      'https://codeforces.com/problemset/problem/*',
      'https://www.codechef.com/problems/*'
    ]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'saveSolution') {
    chrome.tabs.sendMessage(tab.id, { action: 'openPopup' });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle any background tasks here
  return true;
});