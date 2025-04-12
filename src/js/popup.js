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
    
    // Make sure we're using a valid branch name (default to 'main' if there's an issue)
    const safeBranch = branch === 'array' ? 'main' : branch;
    
    // Determine file extension based on language
    const fileExtension = getFileExtension(language);
    
    // Create a sanitized filename that preserves the original problem name format
    // Just replace characters that are invalid in filenames
    const sanitizedProblemName = problemName.replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${sanitizedProblemName}.${fileExtension}`;
    
    // Handle "Others" category by prompting for a custom folder name
    let folderCategory = category;
    if (category === 'Others') {
      const customCategory = prompt('Please enter a custom category folder name:');
      if (customCategory && customCategory.trim()) {
        folderCategory = customCategory.trim();
      }
    }
    
    // Create the folder path using the selected or custom category
    const folderPath = `${platform}/${folderCategory}`;
    
    // Path in the repository
    const path = `${folderPath}/${fileName}`;
    const commitMessage = `Add solution for ${problemName} from ${platform}`;
    
    // GitHub API endpoint for creating or updating a file
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${safeBranch}`;
    
    console.log('Attempting to save file at:', apiUrl);
    
    // First, check if the file already exists to get its SHA
    fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    .then(response => {
      if (response.status === 404) {
        // File doesn't exist, create it
        return { exists: false };
      } else if (response.ok) {
        // File exists, get its SHA
        return response.json().then(data => {
          return { exists: true, sha: data.sha };
        });
      } else {
        // Other error
        return response.text().then(text => {
          throw new Error(`GitHub API error: ${response.status} - ${text}`);
        });
      }
    })
    .then(fileData => {
      // Prepare the request body
      const requestBody = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(code))),
        branch: safeBranch
      };
      
      // If file exists, add the SHA
      if (fileData.exists) {
        requestBody.sha = fileData.sha;
      }
      
      // Now save/update the file
      return fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(requestBody)
      });
    })
    .then(response => {
      console.log('GitHub API response status:', response.status);
      
      return response.text().then(text => {
        if (!response.ok) {
          console.error('GitHub API error response:', text);
          throw new Error(`GitHub API error: ${response.status} - ${text}`);
        }
        return JSON.parse(text);
      });
    })
    .then(data => {
      console.log('File saved successfully');
      
      // Now save the README with problem statement
      const readmePath = `${folderPath}/${sanitizedProblemName}_README.md`;
      const readmeApiUrl = `https://api.github.com/repos/${repo}/contents/${readmePath}?ref=${safeBranch}`;
      const readmeContent = `# ${problemName}\n\n## Problem Statement\n\n${problemStatement || 'No problem statement available.'}\n\n## Solution\n\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``;
      
      // Check if README already exists
      return fetch(readmeApiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }).then(response => {
        if (response.status === 404) {
          // README doesn't exist, create it
          return { exists: false };
        } else if (response.ok) {
          // README exists, get its SHA
          return response.json().then(data => {
            return { exists: true, sha: data.sha };
          });
        } else {
          // Other error
          return response.text().then(text => {
            throw new Error(`GitHub API error: ${response.status} - ${text}`);
          });
        }
      }).then(readmeData => {
        // Prepare the request body
        const readmeRequestBody = {
          message: `Add problem statement for ${problemName}`,
          content: btoa(unescape(encodeURIComponent(readmeContent))),
          branch: safeBranch
        };
        
        // If README exists, add the SHA
        if (readmeData.exists) {
          readmeRequestBody.sha = readmeData.sha;
        }
        
        // Now save/update the README
        return fetch(readmeApiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(readmeRequestBody)
        });
      });
    })
    .then(response => {
      return response.text().then(text => {
        if (!response.ok) {
          console.error('README save error:', text);
          throw new Error(`GitHub API error: ${response.status} - ${text}`);
        }
        return JSON.parse(text);
      });
    })
    .then(data => {
      showStatus('Solution and problem statement saved to GitHub successfully!', 'success');
    })
    .catch(error => {
      console.error('Error saving to GitHub:', error);
      showStatus(`Error saving to GitHub: ${error.message}`, 'error');
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