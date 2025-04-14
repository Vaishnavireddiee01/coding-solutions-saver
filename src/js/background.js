// Basic background service worker for Manifest v3
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Add any other background listeners you need here
// For example:
chrome.action.onClicked.addListener((tab) => {
  // Handle browser action click if needed
});

// In your background script's message handler:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveSolution") {
    // Make sure we're using the fileExtension from the request
    const fileExtension = request.fileExtension || 'txt';
    console.log("Saving with extension:", fileExtension);
    
    const fileName = `${request.problemName}.${fileExtension}`;
    
    // Log the code length to verify we're receiving the complete code
    console.log("Received code length:", request.code ? request.code.length : 0);
    
    // Create a blob with the complete code - ensure we're using the full text
    const blob = new Blob([request.code], {type: 'text/plain'});
    
    // Create a download link and trigger it
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    }, (downloadId) => {
      console.log("Download started with ID:", downloadId);
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    
    sendResponse({success: true, message: `Solution saved as ${fileName}`});
    return true;
  }
});