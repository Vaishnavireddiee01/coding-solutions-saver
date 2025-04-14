// Content script to interact with coding platform pages

// Listen for messages from the popup
// Add retry logic for problem detection
function detectProblemInfoWithRetry(retries = 3) {
  const info = detectProblemInfo();
  
  if (!info || !info.problemName || info.problemName === 'Unknown Problem') {
    if (retries > 0) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(detectProblemInfoWithRetry(retries - 1));
        }, 500);
      });
    }
  }
  
  return info;
}

// Update the message listener
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getProblemInfo") {
    detectProblemInfoWithRetry().then(info => {
      sendResponse(info);
    });
    return true;
  }
  else if (request.action === "getSolutionCode") {
    // Use the improved code extraction methods
    let solution = getSolutionCode();
    
    // For LeetCode, we need to handle the Promise
    if (window.location.href.includes('leetcode.com') && solution.code instanceof Promise) {
      // This is a Promise
      solution.code.then(code => {
        if (code) {
          solution.code = code;
        }
        solution.problemStatement = extractProblemStatement();
        
        // Log the extracted code for debugging
        console.log("Extracted code length:", solution.code ? solution.code.length : 0);
        
        sendResponse(solution);
      }).catch(error => {
        console.error("Error getting LeetCode code:", error);
        solution.code = "// Error extracting code: " + error.message;
        solution.problemStatement = extractProblemStatement();
        sendResponse(solution);
      });
      
      return true; // Keep the message channel open for async response
    }
    
    // For other platforms, continue with synchronous response
    solution.problemStatement = extractProblemStatement();
    
    // Log the extracted code for debugging
    console.log("Extracted code length:", solution.code ? solution.code.length : 0);
    
    sendResponse(solution);
  }
  return true; // Keep the message channel open for async responses
});

// Add this new function to get complete code using multiple methods
function getCompleteCode() {
  // Different platforms have different editor structures
  const url = window.location.href;
  
  // LeetCode
  if (url.includes('leetcode.com')) {
    // Try to get code from Monaco editor if available
    try {
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
          return editors[0].getModel().getValue();
        }
      }
      
      // Try to access editor through global variables
      if (window.codeEditor) {
        return window.codeEditor.getValue();
      }
      
      // Try to find the editor instance
      const editorElement = document.querySelector('.monaco-editor');
      if (editorElement && editorElement.__proto__.editor) {
        return editorElement.__proto__.editor.getModel().getValue();
      }
    } catch (e) {
      console.log("Error accessing LeetCode editor:", e);
    }
  }
  
  // Try CodeMirror (used by many platforms)
  try {
    const codeMirror = document.querySelector('.CodeMirror');
    if (codeMirror && codeMirror.CodeMirror) {
      return codeMirror.CodeMirror.getValue();
    }
  } catch (e) {
    console.log("Error accessing CodeMirror:", e);
  }
  
  // Try Ace Editor (used by many platforms)
  try {
    if (window.ace && window.ace.edit) {
      const aceEditors = document.querySelectorAll('.ace_editor');
      for (const editor of aceEditors) {
        const id = editor.id;
        if (id) {
          const aceEditor = window.ace.edit(id);
          return aceEditor.getValue();
        }
      }
    }
  } catch (e) {
    console.log("Error accessing Ace editor:", e);
  }
  
  // Generic fallback - try to get all text from editor elements
  const editorElements = document.querySelectorAll('.monaco-editor, .CodeMirror, .ace_editor');
  for (const editor of editorElements) {
    const lines = editor.querySelectorAll('.view-line, .CodeMirror-line, .ace_line');
    if (lines.length > 0) {
      return Array.from(lines).map(line => line.textContent).join('\n');
    }
  }
  
  // Return null if we couldn't get the code
  return null;
}

// Detect which coding platform we're on and extract problem info
// Add this function before detectProblemInfo()
function extractLeetCodeProblemName() {
  try {
    // Try multiple selectors for different LeetCode UI versions
    const titleElement = document.querySelector('[data-cy="question-title"], .css-v3d350, .css-1ponsav, .text-title-large');
    if (titleElement) {
      return titleElement.textContent.trim();
    }
    
    // Try to get from page title as fallback
    const titleText = document.title;
    const match = titleText.match(/(.*?)\s*-\s*LeetCode/);
    if (match) {
      return match[1].trim();
    }
    
    // Fallback to URL extraction
    const pathParts = window.location.pathname.split('/');
    const problemSlug = pathParts[pathParts.indexOf('problems') + 1];
    if (problemSlug) {
      return problemSlug.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  } catch (e) {
    console.error("Error extracting problem name:", e);
  }
  
  return 'Unknown Problem';
}

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
// Improve the getSolutionCode function to better access editor instances
// Update the getSolutionCode function to ensure proper file extensions
function getSolutionCode() {
  try {
    const url = window.location.href;
    let platform, problemName, language, code, fileExtension = 'txt';
    
    if (url.includes('leetcode.com/problems/')) {
      platform = 'LeetCode';
      problemName = extractLeetCodeProblemName();
      language = detectLeetCodeLanguage();
      code = extractLeetCodeSolution();
      
      // Get proper file extension based on language
      fileExtension = getLanguageExtension(language) || 'txt';
      
      if (code && !code.startsWith("// Could not extract")) {
        // Format filename and add extension comment at top
        const formattedName = problemName.replace(/[^a-zA-Z0-9]/g, '_');
        code = `// ${formattedName}.${fileExtension}\n\n${code}`;
      }
    }
    else if (url.includes('practice.geeksforgeeks.org/problems/')) {
      platform = 'GeeksForGeeks';
      problemName = extractGFGProblemName();
      language = detectGFGLanguage();
      code = extractCompleteEditorCode('gfg');
    }
    else if (url.includes('codeforces.com/problemset/problem/')) {
      platform = 'CodeForces';
      problemName = extractCodeForcesProblemName();
      language = detectCodeForcesLanguage();
      code = extractCompleteEditorCode('codeforces');
    }
    else if (url.includes('codechef.com/problems/')) {
      platform = 'CodeChef';
      problemName = extractCodeChefProblemName();
      language = detectCodeChefLanguage();
      code = extractCompleteEditorCode('codechef');
    }
    
    // Final validation before returning
    if (!problemName || problemName === 'Unknown Problem') {
      throw new Error('Problem name could not be detected');
    }
    
    // Ensure fileExtension is properly set based on language
    if (!fileExtension || fileExtension === 'txt') {
      // Try to determine extension from language if not already set
      fileExtension = getLanguageExtension(language) || 'txt';
      console.log("Using file extension:", fileExtension, "for language:", language);
    }
    
    return { 
      platform, 
      problemName, 
      language,
      fileExtension, // Make sure this is passed to background.js
      code: code || "// No code detected",
      problemStatement: extractProblemStatement() 
    };
  } catch (error) {
    console.error('Error getting solution:', error);
    return {
      platform: 'Unknown',
      problemName: 'Unknown Problem',
      language: 'Unknown',
      fileExtension: 'txt',
      code: "// Error detecting problem: " + error.message,
      problemStatement: "Problem detection failed"
    };
  }
}

// Update the message listener to use fileExtension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSolutionCode") {
    const solution = getSolutionCode();
    // Pass fileExtension to the background script
    sendResponse({
      ...solution,
      fileExtension: solution.fileExtension || 'txt'
    });
    return true;
  }
  else if (request.action === "getProblemInfo") {
    detectProblemInfoWithRetry().then(info => {
      sendResponse(info);
    });
    return true;
  }
  return true; // Keep the message channel open for async responses
});

// Add new helper function for language extensions
function getLanguageExtension(language) {
  if (!language) return 'txt';
  
  // Normalize language name to handle variations
  const normalizedLang = language.toLowerCase().trim();
  
  // Map of language names to file extensions
  const extensions = {
    'python': 'py',
    'python3': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'java': 'java',
    'c++': 'cpp',
    'cpp': 'cpp',
    'c': 'c',
    'c#': 'cs',
    'csharp': 'cs',
    'ruby': 'rb',
    'swift': 'swift',
    'go': 'go',
    'golang': 'go',
    'kotlin': 'kt',
    'rust': 'rs',
    'scala': 'scala',
    'php': 'php',
    'html': 'html',
    'css': 'css'
  };
  
  // Try to find a match in our map
  for (const [key, value] of Object.entries(extensions)) {
    if (normalizedLang.includes(key)) {
      console.log(`Matched language "${language}" to extension "${value}"`);
      return value;
    }
  }
  
  // Default fallback
  return 'txt';
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
    // Try new selectors for LeetCode's updated UI
    const problemContent = document.querySelector('.description__24sA') || 
                         document.querySelector('.question-content') ||
                         document.querySelector('[data-cy="question-title"]');
    
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

// When receiving a message to get the solution code
// Update the message listener to ensure complete code and proper extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSolutionCode") {
    // Immediately indicate we'll respond asynchronously
    setTimeout(() => {
      try {
        const solution = getSolutionCode();
        
        // Ensure fileExtension is properly set
        if (!solution.fileExtension || solution.fileExtension === 'txt') {
          solution.fileExtension = getLanguageExtension(solution.language);
          console.log("Using file extension:", solution.fileExtension);
        }
        
        // Log the code length to verify we're sending the complete code
        console.log("Sending solution with code length:", solution.code ? solution.code.length : 0);
        
        sendResponse(solution);
      } catch (error) {
        console.error("Error in getSolutionCode:", error);
        sendResponse({
          platform: 'Unknown',
          problemName: 'Unknown Problem',
          language: 'Unknown',
          fileExtension: 'txt',
          code: "// Error: " + error.message,
          problemStatement: "Detection failed"
        });
      }
    }, 0);
    
    return true; // Keep port open for async response
  }
});


function detectLeetCodeLanguage() {
  try {
    // Try multiple selectors for language button
    const languageButton = document.querySelector('[data-cy="lang-select"], .ant-select-selection-item, .relative .flex.items-center');
    if (languageButton) {
      const languageText = languageButton.textContent.trim();
      // Extract just the language name (remove version numbers if present)
      return languageText.split(' ')[0].split('(')[0];
    }
    
    // Try to find language in editor settings
    const editorSettings = document.querySelector('.monaco-editor');
    if (editorSettings) {
      const languageMatch = editorSettings.className.match(/language-(\w+)/);
      if (languageMatch) {
        return languageMatch[1];
      }
    }
    
    // Try to detect from code content (more robust detection)
    const code = extractLeetCodeSolution();
    if (!code) return 'Unknown';
    
    if (code.includes('class ') && code.includes('{') && code.includes('}')) {
      return 'Java';
    } else if (code.includes('def ') || code.includes('lambda:')) {
      return 'Python';
    } else if (code.includes('function ') || code.includes('=>') || code.includes('console.log')) {
      return 'JavaScript';
    } else if (code.includes('#include') || code.includes('using namespace')) {
      return 'C++';
    } else if (code.includes('package ') || code.includes('import ')) {
      return 'Java';
    }
  } catch (e) {
    console.error("Error detecting language:", e);
  }
  
  return 'Unknown';
}

// Add this function before getSolutionCode()
// Improve the extractLeetCodeSolution function to better handle hidden code
function extractLeetCodeSolution() {
  try {
    // Method 1: Try to access Monaco editor model directly (most reliable)
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        // This gets the ENTIRE code regardless of what's visible
        const model = editors[0].getModel();
        const fullValue = model.getValue();
        if (fullValue && fullValue.trim().length > 0) {
          console.log("Extracted complete code using Monaco model:", fullValue.length, "characters");
          return fullValue;
        }
      }
    }

    // Method 2: Try to access editor through global variables (works in some LeetCode versions)
    if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && 
        window.__NEXT_DATA__.props.pageProps && 
        window.__NEXT_DATA__.props.pageProps.question) {
      const codeSnippets = window.__NEXT_DATA__.props.pageProps.question.codeSnippets;
      const language = detectLeetCodeLanguage();
      
      if (codeSnippets && language) {
        const normalizedLang = language.toLowerCase();
        const snippet = codeSnippets.find(s => 
          s.langSlug.toLowerCase().includes(normalizedLang) || 
          normalizedLang.includes(s.langSlug.toLowerCase())
        );
        
        if (snippet && snippet.code) {
          console.log("Extracted code from __NEXT_DATA__:", snippet.code.length, "characters");
          return snippet.code;
        }
      }
    }

    // Method 3: Try to find the hidden textarea that contains all code
    const hiddenTextareas = document.querySelectorAll('textarea[class*="inputarea"]');
    for (const textarea of hiddenTextareas) {
      if (textarea.value && textarea.value.trim().length > 0) {
        console.log("Extracted complete code using hidden textarea:", textarea.value.length, "characters");
        return textarea.value;
      }
    }

    // Method 4: Try to access through React component state
    const editorElements = document.querySelectorAll('[data-cy="code-editor"], .monaco-editor');
    for (const element of editorElements) {
      // Try to find React fiber
      for (const key in element) {
        if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
          let fiber = element[key];
          while (fiber) {
            if (fiber.stateNode && fiber.stateNode.editor) {
              const model = fiber.stateNode.editor.getModel();
              if (model && typeof model.getValue === 'function') {
                const code = model.getValue();
                console.log("Extracted complete code using React fiber:", code.length, "characters");
                return code;
              }
            }
            fiber = fiber.return;
          }
        }
      }
    }

    // Method 5: Fall back to getCompleteCode function
    const completeCode = getCompleteCode();
    if (completeCode) {
      console.log("Extracted complete code using getCompleteCode:", completeCode.length, "characters");
      return completeCode;
    }

  } catch (e) {
    console.error("Error extracting LeetCode solution:", e);
  }
  
  return "// Could not extract code from LeetCode editor";
}

// Fix the message listener to ensure proper file extension handling
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSolutionCode") {
    // Immediately indicate we'll respond asynchronously
    setTimeout(() => {
      try {
        const solution = getSolutionCode();
        
        // Ensure fileExtension is properly set based on language
        if (solution.language) {
          solution.fileExtension = getLanguageExtension(solution.language);
          console.log("Using file extension:", solution.fileExtension, "for language:", solution.language);
        }
        
        // Log the code length to verify we're sending the complete code
        console.log("Sending solution with code length:", solution.code ? solution.code.length : 0);
        
        sendResponse(solution);
      } catch (error) {
        console.error("Error in getSolutionCode:", error);
        sendResponse({
          platform: 'Unknown',
          problemName: 'Unknown Problem',
          language: 'Unknown',
          fileExtension: 'txt',
          code: "// Error: " + error.message,
          problemStatement: "Detection failed"
        });
      }
    }, 0);
    
    return true; // Keep port open for async response
  }
});