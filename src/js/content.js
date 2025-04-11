// Content script to interact with coding platform pages

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getProblemInfo") {
    const info = detectProblemInfo();
    sendResponse(info);
  } else if (request.action === "getSolutionCode") {
    const solution = getSolutionCode();
    // Also extract the problem statement
    solution.problemStatement = extractProblemStatement();
    sendResponse(solution);
  }
  return true; // Keep the message channel open for async responses
});

// Detect which coding platform we're on and extract problem info
function detectProblemInfo() {
  const url = window.location.href;
  
  // LeetCode
  if (url.includes('leetcode.com/problems/')) {
    return {
      platform: 'LeetCode',
      problemName: extractLeetCodeProblemName(),
      language: detectLeetCodeLanguage()
    };
  }
  
  // GeeksForGeeks
  else if (url.includes('practice.geeksforgeeks.org/problems/')) {
    return {
      platform: 'GeeksForGeeks',
      problemName: extractGFGProblemName(),
      language: detectGFGLanguage()
    };
  }
  
  // CodeForces
  else if (url.includes('codeforces.com/problemset/problem/')) {
    return {
      platform: 'CodeForces',
      problemName: extractCodeForcesProblemName(),
      language: detectCodeForcesLanguage()
    };
  }
  
  // CodeChef
  else if (url.includes('codechef.com/problems/')) {
    return {
      platform: 'CodeChef',
      problemName: extractCodeChefProblemName(),
      language: detectCodeChefLanguage()
    };
  }
  
  // Not on a supported coding platform
  return null;
}

// Extract solution code based on the platform
function getSolutionCode() {
  const url = window.location.href;
  let platform, problemName, language, code;
  
  // LeetCode
  if (url.includes('leetcode.com/problems/')) {
    platform = 'LeetCode';
    problemName = extractLeetCodeProblemName();
    language = detectLeetCodeLanguage();
    code = extractLeetCodeSolution();
  }
  
  // GeeksForGeeks
  else if (url.includes('practice.geeksforgeeks.org/problems/')) {
    platform = 'GeeksForGeeks';
    problemName = extractGFGProblemName();
    language = detectGFGLanguage();
    code = extractGFGSolution();
  }
  
  // CodeForces
  else if (url.includes('codeforces.com/problemset/problem/')) {
    platform = 'CodeForces';
    problemName = extractCodeForcesProblemName();
    language = detectCodeForcesLanguage();
    code = extractCodeForcesSolution();
  }
  
  // CodeChef
  else if (url.includes('codechef.com/problems/')) {
    platform = 'CodeChef';
    problemName = extractCodeChefProblemName();
    language = detectCodeChefLanguage();
    code = extractCodeChefSolution();
  }
  
  return { platform, problemName, language, code };
}

// Platform-specific extraction functions
// LeetCode
function extractLeetCodeProblemName() {
  // Extract from title or URL
  const titleElement = document.querySelector('title');
  if (titleElement) {
    const titleText = titleElement.textContent;
    const match = titleText.match(/^(.*?)\s*-\s*LeetCode/);
    if (match) return match[1].trim();
  }
  
  // Fallback to URL extraction
  const pathParts = window.location.pathname.split('/');
  const problemSlug = pathParts[pathParts.indexOf('problems') + 1];
  return problemSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function detectLeetCodeLanguage() {
  // Try to find the language selector
  const languageButton = document.querySelector('[data-cy="lang-select"]');
  if (languageButton) {
    return languageButton.textContent.trim();
  }
  
  // Fallback
  return 'Unknown';
}

function extractLeetCodeSolution() {
  // Try to get the code from the editor
  const editorElement = document.querySelector('.monaco-editor');
  if (editorElement) {
    // This is a simplified approach - in a real extension, you'd need to use
    // more robust methods to extract code from Monaco editor
    const codeLines = Array.from(editorElement.querySelectorAll('.view-line'));
    return codeLines.map(line => line.textContent).join('\n');
  }
  
  // Fallback
  return "// Could not extract code from LeetCode editor";
}

// GeeksForGeeks
function extractGFGProblemName() {
  const titleElement = document.querySelector('.problem-tab h1');
  if (titleElement) {
    return titleElement.textContent.trim();
  }
  
  // Fallback to URL extraction
  const pathParts = window.location.pathname.split('/');
  return pathParts[pathParts.length - 1].replace(/-/g, ' ');
}

function detectGFGLanguage() {
  const languageSelector = document.querySelector('.language-chosen');
  if (languageSelector) {
    return languageSelector.textContent.trim();
  }
  return 'Unknown';
}

function extractGFGSolution() {
  // Try to get the code from the editor
  const editorElement = document.querySelector('.ace_content');
  if (editorElement) {
    const codeLines = Array.from(editorElement.querySelectorAll('.ace_line'));
    return codeLines.map(line => line.textContent).join('\n');
  }
  
  return "// Could not extract code from GeeksForGeeks editor";
}

// CodeForces
function extractCodeForcesProblemName() {
  const titleElement = document.querySelector('.title');
  if (titleElement) {
    return titleElement.textContent.trim();
  }
  
  // Fallback
  const pathParts = window.location.pathname.split('/');
  return `Problem ${pathParts[pathParts.length - 2]}${pathParts[pathParts.length - 1]}`;
}

function detectCodeForcesLanguage() {
  const languageSelector = document.querySelector('select[name="programTypeId"]');
  if (languageSelector) {
    const selectedOption = languageSelector.options[languageSelector.selectedIndex];
    return selectedOption.textContent.trim();
  }
  return 'Unknown';
}

function extractCodeForcesSolution() {
  const editorElement = document.querySelector('.ace_content');
  if (editorElement) {
    const codeLines = Array.from(editorElement.querySelectorAll('.ace_line'));
    return codeLines.map(line => line.textContent).join('\n');
  }
  
  return "// Could not extract code from CodeForces editor";
}

// CodeChef
function extractCodeChefProblemName() {
  const titleElement = document.querySelector('.problem-name');
  if (titleElement) {
    return titleElement.textContent.trim();
  }
  
  // Fallback
  const pathParts = window.location.pathname.split('/');
  return pathParts[pathParts.length - 1];
}

function detectCodeChefLanguage() {
  const languageSelector = document.querySelector('#edit-language');
  if (languageSelector) {
    const selectedOption = languageSelector.options[languageSelector.selectedIndex];
    return selectedOption.textContent.trim();
  }
  return 'Unknown';
}

function extractCodeChefSolution() {
  const editorElement = document.querySelector('.ace_content');
  if (editorElement) {
    const codeLines = Array.from(editorElement.querySelectorAll('.ace_line'));
    return codeLines.map(line => line.textContent).join('\n');
  }
  
  return "// Could not extract code from CodeChef editor";
}

// Add new function to extract problem statements
function extractProblemStatement() {
  const url = window.location.href;
  
  // LeetCode
  if (url.includes('leetcode.com/problems/')) {
    const problemContent = document.querySelector('.question-content');
    if (problemContent) {
      return problemContent.innerText;
    }
  }
  
  // GeeksForGeeks
  else if (url.includes('practice.geeksforgeeks.org/problems/')) {
    const problemContent = document.querySelector('.problem-statement');
    if (problemContent) {
      return problemContent.innerText;
    }
  }
  
  // CodeForces
  else if (url.includes('codeforces.com/problemset/problem/')) {
    const problemContent = document.querySelector('.problem-statement');
    if (problemContent) {
      return problemContent.innerText;
    }
  }
  
  // CodeChef
  else if (url.includes('codechef.com/problems/')) {
    const problemContent = document.querySelector('.problem-statement');
    if (problemContent) {
      return problemContent.innerText;
    }
  }
  
  return "Problem statement could not be extracted.";
}