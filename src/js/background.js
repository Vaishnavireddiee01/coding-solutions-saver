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
  if (request.action === 'saveLocal') {
    // For local saving, we'll use the chrome.downloads API
    
    // Sanitize the problem name for filename
    const sanitizedProblemName = request.problemName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Determine file extension
    const fileExtension = getFileExtension(request.language);
    
    // Create the solution file
    const solutionBlob = new Blob([request.code], {type: 'text/plain'});
    const solutionUrl = URL.createObjectURL(solutionBlob);
    
    chrome.downloads.download({
      url: solutionUrl,
      filename: `repository/${request.platform}/${request.category}/${sanitizedProblemName}.${fileExtension}`,
      saveAs: false
    });
    
    // Create the README file with problem statement
    const readmeContent = `# ${request.problemName}\n\n## Problem Statement\n\n${request.problemStatement}\n\n## Solution\n\n\`\`\`${request.language.toLowerCase()}\n${request.code}\n\`\`\``;
    const readmeBlob = new Blob([readmeContent], {type: 'text/markdown'});
    const readmeUrl = URL.createObjectURL(readmeBlob);
    
    chrome.downloads.download({
      url: readmeUrl,
      filename: `repository/${request.platform}/${request.category}/${sanitizedProblemName}_README.md`,
      saveAs: false
    }, function() {
      sendResponse({success: true});
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Helper function to get file extension based on language
function getFileExtension(language) {
  const languageLower = language.toLowerCase();
  const extensionMap = {
    'javascript': 'js',
    'python': 'py',
    'python3': 'py',
    'java': 'java',
    'c++': 'cpp',
    'cpp': 'cpp',
    'c': 'c',
    'c#': 'cs',
    'ruby': 'rb',
    'go': 'go',
    'swift': 'swift',
    'kotlin': 'kt',
    'typescript': 'ts',
    'rust': 'rs',
    'php': 'php'
  };
  
  return extensionMap[languageLower] || 'txt';
}