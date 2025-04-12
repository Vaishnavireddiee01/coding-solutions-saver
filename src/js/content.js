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
// Update the getSolutionCode function
function getSolutionCode() {
  try {
    const url = window.location.href;
    let platform, problemName, language, code;
    
    // Set platform, problem name, and language based on the URL
    if (url.includes('leetcode.com/problems/')) {
      platform = 'LeetCode';
      problemName = extractLeetCodeProblemName();
      language = detectLeetCodeLanguage();
      code = extractLeetCodeSolution();
      
      // Additional validation for LeetCode
      if (!problemName || problemName === 'Unknown Problem') {
        // Try alternative detection methods
        const titleElement = document.querySelector('title');
        if (titleElement) {
          const titleText = titleElement.textContent;
          const match = titleText.match(/^(.*?)\s*-\s*LeetCode/);
          if (match) problemName = match[1].trim();
        }
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
    
    return { 
      platform, 
      problemName, 
      language, 
      code: code || "// No code detected",
      problemStatement: extractProblemStatement() 
    };
  } catch (error) {
    console.error('Error getting solution:', error);
    return {
      platform: 'Unknown',
      problemName: 'Unknown Problem',
      language: 'Unknown',
      code: "// Error detecting problem: " + error.message,
      problemStatement: "Problem detection failed"
    };
  }
}

// New function to extract complete code from various editor types
function extractCompleteEditorCode(platform) {
  // Try to access editor directly through global variables first
  try {
    // LeetCode specific extraction
    if (platform === 'leetcode') {
      // First try to inject a script to get the editor content directly
      return new Promise(async (resolve) => {
        const injectedContent = await injectScriptToGetLeetCodeEditorContent();
        if (injectedContent) {
          resolve(injectedContent);
          return;
        }
        
        // If injection failed, try the other methods
        // Method 1: Try to access Monaco editor directly
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors();
          if (editors && editors.length > 0) {
            resolve(editors[0].getModel().getValue());
            return;
          }
        }
        
        // Method 2: Try to access editor through React components
        const editorElements = document.querySelectorAll('[data-cy="code-editor"]');
        for (const element of editorElements) {
          // Access React instance
          for (const key in element) {
            if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
              let fiber = element[key];
              while (fiber) {
                if (fiber.stateNode && fiber.stateNode.editor) {
                  resolve(fiber.stateNode.editor.getValue());
                  return;
                }
                fiber = fiber.return;
              }
            }
          }
        }
        
        // If all methods fail, resolve with a fallback message
        resolve("// Could not extract complete code from LeetCode editor. Please try refreshing the page.");
      });
    }
    
    // GeeksForGeeks specific extraction
    if (platform === 'gfg') {
      // Try to access Ace editor
      if (window.ace && window.ace.edit) {
        const aceEditors = document.querySelectorAll('.ace_editor');
        for (const editor of aceEditors) {
          if (editor.id) {
            try {
              const aceEditor = window.ace.edit(editor.id);
              return aceEditor.getValue();
            } catch (e) {
              console.log("Error accessing GFG ace editor:", e);
            }
          }
        }
      }
    }
    
    // CodeForces specific extraction
    if (platform === 'codeforces') {
      // Try to access CodeMirror editor
      const codeMirrorElements = document.querySelectorAll('.CodeMirror');
      for (const element of codeMirrorElements) {
        if (element.CodeMirror) {
          return element.CodeMirror.getValue();
        }
      }
    }
    
    // CodeChef specific extraction
    if (platform === 'codechef') {
      // Try to access Monaco editor
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
          return editors[0].getModel().getValue();
        }
      }
      
      // Try to access Ace editor
      if (window.ace && window.ace.edit) {
        const aceEditors = document.querySelectorAll('.ace_editor');
        for (const editor of aceEditors) {
          if (editor.id) {
            try {
              const aceEditor = window.ace.edit(editor.id);
              return aceEditor.getValue();
            } catch (e) {
              console.log("Error accessing CodeChef ace editor:", e);
            }
          }
        }
      }
    }
    
    // Generic editor access methods (try all common editor types)
    
    // Try Monaco editor (used by LeetCode, VS Code web)
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        return editors[0].getModel().getValue();
      }
    }
    
    // Try CodeMirror (used by many platforms)
    const codeMirrorElements = document.querySelectorAll('.CodeMirror');
    for (const element of codeMirrorElements) {
      if (element.CodeMirror) {
        return element.CodeMirror.getValue();
      }
    }
    
    // Try Ace Editor (used by many platforms)
    if (window.ace && window.ace.edit) {
      const aceEditors = document.querySelectorAll('.ace_editor');
      for (const editor of aceEditors) {
        if (editor.id) {
          try {
            const aceEditor = window.ace.edit(editor.id);
            return aceEditor.getValue();
          } catch (e) {
            console.log("Error accessing ace editor:", e);
          }
        }
      }
    }
    
    // Try to find editor in global variables
    if (window.editor) {
      return window.editor.getValue();
    }
    
    // Last resort: Try to extract from DOM elements
    // This is less reliable but might work in some cases
    const editorElements = document.querySelectorAll('.monaco-editor, .CodeMirror, .ace_editor');
    for (const editor of editorElements) {
      // For Monaco editor
      const monacoLines = editor.querySelectorAll('.view-line');
      if (monacoLines.length > 0) {
        return Array.from(monacoLines).map(line => line.textContent).join('\n');
      }
      
      // For CodeMirror
      const cmLines = editor.querySelectorAll('.CodeMirror-line');
      if (cmLines.length > 0) {
        return Array.from(cmLines).map(line => line.textContent).join('\n');
      }
      
      // For Ace editor
      const aceLines = editor.querySelectorAll('.ace_line');
      if (aceLines.length > 0) {
        return Array.from(aceLines).map(line => line.textContent).join('\n');
      }
    }
    
  } catch (e) {
    console.error("Error extracting code:", e);
  }
  
  // If all else fails, return a message
  return "// Could not extract complete code. Please try refreshing the page.";
}

// Platform-specific extraction functions
// LeetCode
function extractLeetCodeProblemName() {
  try {
    // Try to get from title element
    const titleElement = document.querySelector('[data-cy="question-title"]');
    if (titleElement) {
      return titleElement.textContent.trim();
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

function detectLeetCodeLanguage() {
  try {
    // Try to find the language selector button
    const languageButton = document.querySelector('[data-cy="lang-select"]');
    if (languageButton) {
      return languageButton.textContent.trim();
    }
    
    // Try to find language in editor settings
    const editorSettings = document.querySelector('.monaco-editor');
    if (editorSettings) {
      const languageMatch = editorSettings.className.match(/language-(\w+)/);
      if (languageMatch) {
        return languageMatch[1];
      }
    }
    
    // Try to detect from code content
    const code = extractLeetCodeSolution();
    if (code.includes('class ') && code.includes('{') && code.includes('}')) {
      return 'Java';
    } else if (code.includes('def ')) {
      return 'Python';
    } else if (code.includes('function ') || code.includes('=>')) {
      return 'JavaScript';
    }
  } catch (e) {
    console.error("Error detecting language:", e);
  }
  
  return 'Unknown';
}

// LeetCode specific extraction
// Improved LeetCode solution extraction
function extractLeetCodeSolution() {
  try {
    // Method 1: Access Monaco editor model directly
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        const model = editors[0].getModel();
        const lineCount = model.getLineCount();
        let fullCode = '';
        
        // Get all lines including the last one
        for (let i = 1; i <= lineCount; i++) {
          const lineContent = model.getLineContent(i);
          fullCode += lineContent + (i < lineCount ? '\n' : ''); // Don't add newline after last line
        }
        return fullCode;
      }
    }

    // Method 2: Access through React component state
    const editorElements = document.querySelectorAll('[data-cy="code-editor"]');
    for (const element of editorElements) {
      for (const key in element) {
        if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
          let fiber = element[key];
          while (fiber) {
            if (fiber.stateNode && fiber.stateNode.editor) {
              const model = fiber.stateNode.editor.getModel();
              const lineCount = model.getLineCount();
              let fullCode = '';
              
              for (let i = 1; i <= lineCount; i++) {
                fullCode += model.getLineContent(i) + (i < lineCount ? '\n' : '');
              }
              return fullCode;
            }
            fiber = fiber.return;
          }
        }
      }
    }

    // Method 3: Try to get from hidden textarea (includes all code)
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
      if (textarea.value && textarea.value.trim().length > 0) {
        return textarea.value;
      }
    }

  } catch (e) {
    console.error("Error extracting LeetCode solution:", e);
  }
  
  return "// Could not extract code from LeetCode editor";
}

// Add the missing function
function injectScriptToGetLeetCodeEditorContent() {
  return new Promise((resolve) => {
    try {
      // Try to access editor through direct JavaScript injection
      const script = document.createElement('script');
      script.text = `
        (function() {
          try {
            if (window.monaco && window.monaco.editor) {
              const editors = window.monaco.editor.getEditors();
              if (editors && editors.length > 0) {
                return editors[0].getModel().getValue();
              }
            }
            return null;
          } catch(e) {
            return null;
          }
        })();
      `;
      document.documentElement.appendChild(script);
      const result = script.textContent;
      document.documentElement.removeChild(script);
      resolve(result);
    } catch (e) {
      resolve(null);
    }
  });
}

// Update the getSolutionCode function
function getSolutionCode() {
  try {
    const url = window.location.href;
    let platform, problemName, language, code;
    
    // Set platform, problem name, and language based on the URL
    if (url.includes('leetcode.com/problems/')) {
      platform = 'LeetCode';
      problemName = extractLeetCodeProblemName();
      language = detectLeetCodeLanguage();
      code = extractLeetCodeSolution();
      
      // Additional validation for LeetCode
      if (!problemName || problemName === 'Unknown Problem') {
        // Try alternative detection methods
        const titleElement = document.querySelector('title');
        if (titleElement) {
          const titleText = titleElement.textContent;
          const match = titleText.match(/^(.*?)\s*-\s*LeetCode/);
          if (match) problemName = match[1].trim();
        }
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
    
    return { 
      platform, 
      problemName, 
      language, 
      code: code || "// No code detected",
      problemStatement: extractProblemStatement() 
    };
  } catch (error) {
    console.error('Error getting solution:', error);
    return {
      platform: 'Unknown',
      problemName: 'Unknown Problem',
      language: 'Unknown',
      code: "// Error detecting problem: " + error.message,
      problemStatement: "Problem detection failed"
    };
  }
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
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSolutionCode") {
    // Immediately indicate we'll respond asynchronously
    setTimeout(() => {
      try {
        const solution = getSolutionCode();
        sendResponse(solution);
      } catch (error) {
        sendResponse({
          platform: 'Unknown',
          problemName: 'Unknown Problem',
          language: 'Unknown',
          code: "// Error: " + error.message,
          problemStatement: "Detection failed"
        });
      }
    }, 0);
    
    return true; // Keep port open for async response
  }
});