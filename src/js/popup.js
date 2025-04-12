document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const githubLoginBtn = document.getElementById('github-login');
  const githubLogoutBtn = document.getElementById('github-logout');
  const saveRepoSettingsBtn = document.getElementById('save-repo-settings');
  const saveSolutionBtn = document.getElementById('save-solution');
  const statusMessage = document.getElementById('status-message');
  const notLoggedInSection = document.getElementById('not-logged-in');
  const loggedInSection = document.getElementById('logged-in');
  const repoSection = document.getElementById('repo-section');
  const solutionSection = document.getElementById('solution-section');
  const githubUsername = document.getElementById('github-username');
  const repoNameInput = document.getElementById('repo-name');
  const branchNameInput = document.getElementById('branch-name');
  const platformSpan = document.getElementById('platform');
  const problemNameSpan = document.getElementById('problem-name');
  const languageSpan = document.getElementById('language');
  const categorySelect = document.getElementById('category');

  // Check authentication status and load settings
  function init() {
    chrome.storage.local.get(['githubToken', 'username', 'repoName', 'branchName'], function(data) {
      if (data.githubToken) {
        // User is authenticated
        notLoggedInSection.style.display = 'none';
        loggedInSection.style.display = 'block';
        repoSection.style.display = 'block';
        githubUsername.textContent = data.username || 'User';
        
        if (data.repoName) {
          repoNameInput.value = data.repoName;
        }
        
        if (data.branchName) {
          branchNameInput.value = data.branchName || 'main';
        }
        
        // Check if we're on a coding platform page
        checkCurrentTab();
      } else {
        // User is not authenticated
        notLoggedInSection.style.display = 'block';
        loggedInSection.style.display = 'none';
        repoSection.style.display = 'none';
        solutionSection.style.display = 'none';
      }
    });
  }

  // Check if current tab is a coding platform
  function checkCurrentTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      // Send message to content script to check if we're on a coding platform
      chrome.tabs.sendMessage(currentTab.id, {action: "getProblemInfo"}, function(response) {
        if (response && response.platform) {
          // We're on a coding platform
          solutionSection.style.display = 'block';
          platformSpan.textContent = response.platform;
          problemNameSpan.textContent = response.problemName;
          languageSpan.textContent = response.language;
        } else {
          // Not on a coding platform
          solutionSection.style.display = 'none';
        }
      });
    });
  }

  // GitHub OAuth flow
  githubLoginBtn.addEventListener('click', function() {
    // We'll use GitHub's Personal Access Token approach instead of full OAuth
    // as it's simpler for a Chrome extension
    const tokenInput = prompt("Please enter your GitHub Personal Access Token. You can create one at https://github.com/settings/tokens with 'repo' scope.");
    
    if (!tokenInput) {
      showStatus('Authentication cancelled', 'error');
      return;
    }
    
    // Verify the token by making a test API call
    fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenInput}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Invalid token or API error');
      }
      return response.json();
    })
    .then(data => {
      // Save the token and username
      chrome.storage.local.set({
        githubToken: tokenInput,
        username: data.login
      }, function() {
        init();
        showStatus('Successfully connected to GitHub', 'success');
      });
    })
    .catch(error => {
      console.error('GitHub authentication error:', error);
      showStatus('GitHub authentication failed: ' + error.message, 'error');
    });
  });

  // This function would call your backend service to exchange the code for a token
  function exchangeCodeForToken(code) {
    // In a real implementation, you would call your backend service
    // For demo purposes, we'll simulate a successful authentication
    
    // Normally, you would make an API call like:
    /*
    fetch('https://your-backend.com/github/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    })
    .then(response => response.json())
    .then(data => {
      // Save the token and username
      chrome.storage.local.set({
        githubToken: data.access_token,
        username: data.username
      }, function() {
        init();
      });
    });
    */
    
    // For demo, we'll simulate a successful authentication
    simulateSuccessfulAuth();
  }

  // For demo purposes only - remove in real implementation
  function simulateSuccessfulAuth() {
    chrome.storage.local.set({
      githubToken: 'simulated_token',
      username: 'DemoUser'
    }, function() {
      init();
      showStatus('Successfully connected to GitHub', 'success');
    });
  }

  // Logout
  githubLogoutBtn.addEventListener('click', function() {
    chrome.storage.local.remove(['githubToken', 'username'], function() {
      init();
      showStatus('Disconnected from GitHub', 'success');
    });
  });

  // Save repository settings
  saveRepoSettingsBtn.addEventListener('click', function() {
    const repoName = repoNameInput.value.trim();
    const branchName = branchNameInput.value.trim() || 'main';
    
    if (!repoName) {
      showStatus('Please enter a repository name', 'error');
      return;
    }
    
    chrome.storage.local.set({
      repoName: repoName,
      branchName: branchName
    }, function() {
      showStatus('Repository settings saved', 'success');
      
      // Check if we're on a coding platform page to enable the solution section
      checkCurrentTab();
    });
  });

  // Save solution to GitHub
  saveSolutionBtn.addEventListener('click', function() {
    chrome.storage.local.get(['githubToken', 'repoName', 'branchName'], function(data) {
      if (!data.githubToken || !data.repoName) {
        showStatus('Please connect to GitHub and set repository settings', 'error');
        return;
      }
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "getSolutionCode"
        }, function(response) {
          if (response && response.code) {
            saveSolutionToGitHub(
              data.githubToken,
              data.repoName,
              data.branchName || 'main',
              response.platform,
              response.problemName,
              response.language,
              categorySelect.value,
              response.code,
              response.problemStatement // Added problem statement
            );
          } else {
            showStatus('Could not retrieve solution code', 'error');
          }
        });
      });
    });
  });

  // Function to save solution to GitHub
  function saveSolutionToGitHub(token, repo, branch, platform, problemName, language, category, code, problemStatement) {
    // Log the parameters for debugging
    console.log('Saving to GitHub with params:', { repo, branch, platform, category });
    
    // Determine file extension based on language
    const fileExtension = getFileExtension(language);
    
    // Create a sanitized filename
    const sanitizedProblemName = problemName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedProblemName}.${fileExtension}`;
    
    // First, try to directly save the file without creating directories
    const path = `${platform}/${category}/${fileName}`;
    const commitMessage = `Add solution for ${problemName} from ${platform}`;
    
    // GitHub API endpoint for creating or updating a file
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    
    console.log('Attempting to save file at:', apiUrl);
    
    // Try to save the file directly
    fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,  // Changed from 'token' to 'Bearer'
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(code))),
        branch: branch
      })
    })
    .then(response => {
      console.log('GitHub API response status:', response.status);
      
      // Get the response text for more detailed error info
      return response.text().then(text => {
        if (!response.ok) {
          console.error('GitHub API error response:', text);
          throw new Error(`GitHub API error: ${response.status} - ${text}`);
        }
        return text;
      });
    })
    .then(data => {
      console.log('File saved successfully');
      showStatus('Solution saved to GitHub successfully!', 'success');
    })
    .catch(error => {
      console.error('Detailed error:', error);
      
      // Try a different authorization header format
      console.log('Retrying with different auth format...');
      
      fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,  // Original format
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: commitMessage,
          content: btoa(unescape(encodeURIComponent(code))),
          branch: branch
        })
      })
      .then(response => {
        console.log('Second attempt status:', response.status);
        return response.text().then(text => {
          if (!response.ok) {
            console.error('Second attempt error:', text);
            throw new Error(`GitHub API error: ${response.status} - ${text}`);
          }
          return text;
        });
      })
      .then(data => {
        console.log('File saved successfully on second attempt');
        showStatus('Solution saved to GitHub successfully!', 'success');
      })
      .catch(secondError => {
        console.error('Both attempts failed:', secondError);
        showStatus(`Error saving to GitHub: ${secondError.message}`, 'error');
      });
    });
  }

  // Function to create a directory in the repository
  function createDirectoryInRepo(token, repo, branch, path) {
    return new Promise((resolve, reject) => {
      // Check if directory already exists
      fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      .then(response => {
        if (response.ok) {
          // Directory exists, resolve
          resolve();
        } else if (response.status === 404) {
          // Directory doesn't exist, create it with a .gitkeep file
          return fetch(`https://api.github.com/repos/${repo}/contents/${path}/.gitkeep`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              message: `Create ${path} directory`,
              content: btoa(''), // Empty file content
              branch: branch
            })
          });
        } else {
          reject(new Error(`GitHub API error: ${response.status}`));
        }
      })
      .then(response => {
        if (response && !response.ok) {
          reject(new Error(`GitHub API error: ${response.status}`));
        } else if (response) {
          resolve();
        }
      })
      .catch(error => {
        reject(error);
      });
    });
  }

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

  // Helper function to show status messages
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    statusMessage.style.display = 'block';
    
    // Hide the message after 3 seconds
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }

  // Initialize the popup
  init();
});

// Add a new button to the popup.html
// Add this after the "Save to GitHub" button in the solution-section div:
/*
<button id="save-local">Save Locally</button>
*/

// Add this to your popup.js initialization code:
const saveLocalBtn = document.getElementById('save-local');

// Add event listener for the new button
saveLocalBtn.addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "getSolutionCode"
    }, function(response) {
      if (response && response.code) {
        saveLocalSolution(
          response.platform,
          response.problemName,
          response.language,
          categorySelect.value,
          response.code,
          response.problemStatement
        );
      } else {
        showStatus('Could not retrieve solution code', 'error');
      }
    });
  });
});

// Function to save solution locally
function saveLocalSolution(platform, problemName, language, category, code, problemStatement) {
  // This function will communicate with the background script to save files locally
  chrome.runtime.sendMessage({
    action: "saveLocal",
    platform: platform,
    problemName: problemName,
    language: language,
    category: category,
    code: code,
    problemStatement: problemStatement
  }, function(response) {
    if (response && response.success) {
      showStatus('Solution saved locally!', 'success');
    } else {
      showStatus('Error saving locally: ' + (response ? response.error : 'Unknown error'), 'error');
    }
  });
}