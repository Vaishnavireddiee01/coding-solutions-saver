// Content script to interact with coding platform pages

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getProblemInfo") {
    const info = detectProblemInfo();
    sendResponse(info);
  } else if (request.action === "getSolutionCode") {
    // Use the improved code extraction methods
    let solution = getSolutionCode();
    
    // Try to get complete code using more robust methods
    const completeCode = getCompleteCode();
    if (completeCode) {
      solution.code = completeCode;
    }
    
    // Also extract the problem statement
    solution.problemStatement = extractProblemStatement();
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
function getSolutionCode() {
  const url = window.location.href;
  let platform, problemName, language, code;
  
  // Set platform, problem name, and language based on the URL
  if (url.includes('leetcode.com/problems/')) {
    platform = 'LeetCode';
    problemName = extractLeetCodeProblemName();
    language = detectLeetCodeLanguage();
    code = extractCompleteEditorCode('leetcode'); // Use specialized extraction
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
  
  return { platform, problemName, language, code };
}

// New function to extract complete code from various editor types
function extractCompleteEditorCode(platform) {
  // Try to access editor directly through global variables first
  try {
    // LeetCode specific extraction
    if (platform === 'leetcode') {
      // Method 1: Try to access Monaco editor directly
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
          return editors[0].getModel().getValue();
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
                return fiber.stateNode.editor.getValue();
              }
              fiber = fiber.return;
            }
          }
        }
      }
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

// When receiving a message to get the solution code
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSolutionCode") {
    const solution = getSolutionCode();
    solution.problemStatement = extractProblemStatement();
    
    // Log the extracted code for debugging
    console.log("Extracted code length:", solution.code ? solution.code.length : 0);
    
    sendResponse(solution);
    return true; // Keep the message channel open for async response
  }
  
  // Handle other message types...
  return true;
});