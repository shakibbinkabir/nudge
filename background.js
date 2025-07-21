// Add an initialization log to verify the background script is running
console.log('Nudge background script initialized');

// Listen for search suggestion requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchSearchSuggestions') {
    const query = request.query;
    
    if (!query) {
      sendResponse({ suggestions: [] });
      return true;
    }
    
    fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      // Google's suggestion API returns an array where index 1 contains the suggestions
      const suggestions = data[1] || [];
      sendResponse({ success: true, suggestions: suggestions });
    })
    .catch(error => {
      console.error('Error fetching search suggestions:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'imageSearch') {
    // Open a new tab with Google Images search
    if (request.file) {
      chrome.tabs.create({ url: 'https://images.google.com/searchbyimage/upload' }, (tab) => {
        sendResponse({ success: true });
      });
    }
    return true;
  }
});

// Create context menu for image search
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "searchImageGoogle",
        title: "Search Google for this image",
        contexts: ["image"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "searchImageGoogle" && info.srcUrl) {
        const imageUrl = encodeURIComponent(info.srcUrl);
        const googleSearchUrl = `https://www.google.com/searchbyimage?image_url=${imageUrl}`;
        chrome.tabs.create({ url: googleSearchUrl });
    }
});

// Listen for installation or update events
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    
    // Initialize all required storage objects
    chrome.storage.local.get(['blacklist', 'snoozes', 'snoozeHistory', 'userProfile'], (result) => {
        const updates = {};
        
        // Initialize blacklist if needed
        if (!result.blacklist) {
            console.log('No existing blacklist found, initializing empty array');
            updates.blacklist = [];
        } else {
            console.log('Existing blacklist found:', result.blacklist);
        }
        
        // Initialize snoozes if needed
        if (!result.snoozes) {
            console.log('No existing snoozes found, initializing empty object');
            updates.snoozes = {};
        }
        
        // Initialize snoozeHistory if needed
        if (!result.snoozeHistory) {
            console.log('No existing snooze history found, initializing empty object');
            updates.snoozeHistory = {};
        }
        
        // Initialize user profile if needed
        if (!result.userProfile) {
            console.log('No existing user profile found, will be initialized when the user first visits the new tab page');
        }
        
        // Only save if we have updates to make
        if (Object.keys(updates).length > 0) {
            chrome.storage.local.set(updates, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error initializing storage:', chrome.runtime.lastError);
                } else {
                    console.log('Storage initialized successfully');
                }
            });
        }
    });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // We only want to act when a URL is being loaded
    if (changeInfo.url) {
        console.log(`Tab ${tabId} navigating to: ${changeInfo.url}`);
        
        // Skip checking chrome-extension:// URLs entirely to avoid potential redirect loops
        if (changeInfo.url.startsWith('chrome-extension://')) {
            console.log(`Skipping chrome-extension URL: ${changeInfo.url}`);
            return;
        }
        
        // Get the blacklist and snoozes from storage
        chrome.storage.local.get(['blacklist', 'snoozes'], (result) => {
            const blacklist = result.blacklist || [];
            const snoozes = result.snoozes || {};
            
            console.log('Current blacklist:', blacklist);
            
            if (blacklist.length === 0) {
                console.log('Blacklist is empty, allowing navigation');
                return;
            }
            
            // Check if the new URL matches any domain in the blacklist
            try {
                // Create a URL object to extract the hostname
                const url = new URL(changeInfo.url);
                const hostname = url.hostname;
                
                console.log(`Checking hostname: ${hostname} against blacklist`);
                
                // Check if any blacklisted domain matches the hostname
                const isBlacklisted = blacklist.some(item => {
                    // Handle both old string format and new object format
                    const domain = typeof item === 'string' ? item : item.domain;
                    const isActive = typeof item === 'string' ? true : item.active;
                    
                    // Only check active domains
                    if (!isActive || !domain || domain.trim() === '') return false;
                    
                    // Clean up domain input (remove https://, www., etc.)
                    const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
                    
                    // Better domain matching - check for exact domain or subdomain
                    const hostnameToCheck = hostname.toLowerCase();
                    
                    // Case 1: Exact domain match (e.g., "facebook.com" matches "facebook.com")
                    const exactMatch = hostnameToCheck === cleanDomain;
                    
                    // Case 2: Domain with subdomain (e.g., "www.facebook.com" or "m.facebook.com" matches "facebook.com")
                    const subdomainMatch = hostnameToCheck.endsWith(`.${cleanDomain}`);
                    
                    // Case 3: Domain with path (special case for exact domains without TLD like "facebook")
                    const domainWithPathMatch = cleanDomain && !cleanDomain.includes('.') && 
                                              (hostnameToCheck === cleanDomain || 
                                               hostnameToCheck.startsWith(`${cleanDomain}.`) || 
                                               hostnameToCheck.includes(`.${cleanDomain}.`));
                    
                    const match = exactMatch || subdomainMatch || domainWithPathMatch;
                    console.log(`Comparing: '${hostnameToCheck}' with '${cleanDomain}' (active: ${isActive}) - Match: ${match} (exact: ${exactMatch}, subdomain: ${subdomainMatch}, domain-path: ${domainWithPathMatch})`);
                    return match;
                });
                
                if (isBlacklisted) {
                    console.log(`BLOCKED: ${changeInfo.url} (hostname: ${hostname})`);
                    
                    // Check for an active snooze on this domain
                    if (snoozes[hostname] && Date.now() < snoozes[hostname]) {
                        console.log(`Snooze is active for ${hostname} until ${new Date(snoozes[hostname]).toLocaleTimeString()}. Allowing access.`);
                        return; // Allow navigation to continue
                    } else {
                        // Clear expired snoozes
                        if (snoozes[hostname]) {
                            console.log(`Snooze for ${hostname} has expired.`);
                            delete snoozes[hostname];
                            chrome.storage.local.set({ snoozes: snoozes });
                        }
                        
                        // Check if all tasks are completed or no tasks exist before showing intervention
                        chrome.storage.local.get(['tasks'], (taskResult) => {
                            const tasks = taskResult.tasks || [];
                            const allTasksCompleted = tasks.length > 0 && tasks.every(task => task.completed);
                            const noTasks = tasks.length === 0;
                            
                            if (allTasksCompleted || noTasks) {
                                console.log(`Skipping intervention: ${allTasksCompleted ? 'All tasks completed' : 'No tasks available'}`);
                                return; // Allow navigation to continue
                            }
                            
                            // Generate the intervention page URL with originalUrl parameter
                            const interventionUrl = chrome.runtime.getURL("intervention.html") + "?originalUrl=" + encodeURIComponent(changeInfo.url);
                            
                            // Redirect the tab to our intervention page
                            console.log(`Redirecting to intervention page: ${interventionUrl}`);
                            chrome.tabs.update(tabId, { url: interventionUrl });
                        });
                    }
                } else {
                    console.log(`ALLOWED: ${changeInfo.url} (hostname: ${hostname})`);
                }
            } catch (error) {
                console.error('Error parsing URL:', error);
            }
        });
    }
});
