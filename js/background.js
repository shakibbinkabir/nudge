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
            // console.log('Existing blacklist found:', result.blacklist);
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
            // console.log('No existing user profile found, will be initialized when the user first visits the new tab page');
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
    // Only act when the page has completed loading
    if (changeInfo.status === 'complete') {
        const url = tab.url;
        if (!url) {
            return;
        }
        // Skip chrome-extension URLs to prevent redirect loops
        if (url.startsWith('chrome-extension://')) {
            return;
        }
        // Get the blacklist and snoozes from storage
        chrome.storage.local.get(['blacklist', 'snoozes'], (result) => {
            const blacklist = result.blacklist || [];
            const snoozes = result.snoozes || {};
            if (blacklist.length === 0) {
                return;
            }
            try {
                // Create a URL object to extract the hostname
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                // Check if any blacklisted domain matches the hostname
                const isBlacklisted = blacklist.some(item => {
                    const domain = typeof item === 'string' ? item : item.domain;
                    const isActive = typeof item === 'string' ? true : item.active;
                    if (!isActive || !domain || domain.trim() === '') return false;
                    const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
                    const hostnameToCheck = hostname.toLowerCase();
                    const exactMatch = hostnameToCheck === cleanDomain;
                    const subdomainMatch = hostnameToCheck.endsWith(`.${cleanDomain}`);
                    const domainWithPathMatch = cleanDomain && !cleanDomain.includes('.') && 
                                              (hostnameToCheck === cleanDomain || 
                                               hostnameToCheck.startsWith(`${cleanDomain}.`) || 
                                               hostnameToCheck.includes(`.${cleanDomain}.`));
                    const match = exactMatch || subdomainMatch || domainWithPathMatch;
                    return match;
                });
                if (isBlacklisted) {
                    if (snoozes[hostname] && Date.now() < snoozes[hostname]) {
                        return; // Allow navigation to continue
                    } else {
                        if (snoozes[hostname]) {
                            delete snoozes[hostname];
                            chrome.storage.local.set({ snoozes: snoozes });
                        }
                        chrome.storage.local.get(['tasks'], (taskResult) => {
                            const tasks = taskResult.tasks || [];
                            const allTasksCompleted = tasks.length > 0 && tasks.every(task => task.completed);
                            const noTasks = tasks.length === 0;
                            if (allTasksCompleted || noTasks) {
                                return; // Allow navigation to continue
                            }
                            const interventionUrl = chrome.runtime.getURL("pages/intervention.html") + "?originalUrl=" + encodeURIComponent(url);
                            chrome.tabs.update(tabId, { url: interventionUrl });
                        });
                    }
                }
            } catch (error) {
                // Ignore URL parse errors
            }
        });
    }
});
