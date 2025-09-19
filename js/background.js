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

// Import domain utilities for migration
// Note: In manifest v3, we can't use import(), so we'll implement inline for now

// Storage schema version
const CURRENT_SCHEMA_VERSION = 2;

/**
 * Normalize a domain for migration (inline implementation)
 */
function normalizeDomainInline(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }

    let domain = input.trim();
    if (!domain) return null;

    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');
    // Remove paths, query parameters, fragments
    domain = domain.split('/')[0].split('?')[0].split('#')[0];
    // Convert to lowercase
    domain = domain.toLowerCase();
    // Remove trailing dots
    domain = domain.replace(/\.+$/, '');
    // Remove www prefix
    domain = domain.replace(/^www\./, '');
    
    // Basic validation
    if (!domain.includes('.') && domain !== 'localhost') {
        return null;
    }
    if (!/^[a-z0-9.-]+$/.test(domain)) {
        return null;
    }
    if (/^[.-]|[.-]$/.test(domain)) {
        return null;
    }
    if (/\.\./.test(domain)) {
        return null;
    }
    
    return domain;
}

/**
 * Migrate domains to new format
 */
function migrateDomains(oldDomains) {
    if (!Array.isArray(oldDomains)) {
        return [];
    }
    
    const migratedDomains = [];
    const seenDomains = new Set();
    
    oldDomains.forEach(item => {
        let domain, active, addedAt;
        
        if (typeof item === 'string') {
            domain = item;
            active = true;
            addedAt = Date.now();
        } else if (item && typeof item === 'object') {
            domain = item.domain;
            active = item.active !== undefined ? item.active : true;
            addedAt = item.addedAt || Date.now();
        } else {
            return;
        }
        
        const normalizedDomain = normalizeDomainInline(domain);
        
        if (normalizedDomain && !seenDomains.has(normalizedDomain)) {
            seenDomains.add(normalizedDomain);
            migratedDomains.push({
                domain: normalizedDomain,
                active: active,
                addedAt: addedAt
            });
        }
    });
    
    return migratedDomains;
}

/**
 * Perform storage migration if needed
 */
function performMigration(currentVersion, targetVersion, callback) {
    chrome.storage.local.get(null, (result) => {
        const updates = {};
        
        if (currentVersion < 2) {
            console.log('Migrating to schema version 2...');
            
            // Migrate blacklist to distractions with normalization
            if (result.blacklist) {
                const migratedDomains = migrateDomains(result.blacklist);
                updates.distractions = migratedDomains;
                console.log(`Migrated ${result.blacklist.length} domains to ${migratedDomains.length} normalized entries`);
            } else {
                updates.distractions = [];
            }
            
            // Initialize new storage structures
            if (!result.backgroundCache) {
                updates.backgroundCache = null;
            }
            
            if (!result.connectionStatus) {
                // Determine initial connection status
                if (result.userPexelsKey) {
                    updates.connectionStatus = 'byok';
                } else if (result.nudgeApiKey) {
                    updates.connectionStatus = 'nudge';
                } else {
                    updates.connectionStatus = 'disconnected';
                }
            }
            
            if (!result.dismissedBanners) {
                updates.dismissedBanners = {};
            }
        }
        
        // Update schema version
        updates.schemaVersion = targetVersion;
        
        // Apply updates
        chrome.storage.local.set(updates, () => {
            if (chrome.runtime.lastError) {
                console.error('Migration failed:', chrome.runtime.lastError);
            } else {
                console.log(`Migration completed successfully to version ${targetVersion}`);
            }
            callback();
        });
    });
}

// Listen for installation or update events
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
    
    // Check for schema version and perform migration if needed
    chrome.storage.local.get(['schemaVersion', 'blacklist', 'snoozes', 'snoozeHistory', 'userProfile'], (result) => {
        const currentVersion = result.schemaVersion || 1;
        
        if (currentVersion < CURRENT_SCHEMA_VERSION) {
            // Perform migration
            performMigration(currentVersion, CURRENT_SCHEMA_VERSION, () => {
                initializeBaseStorage(result);
                
                // Show update banner for updates from v1.0.1
                if (details.reason === 'update') {
                    console.log('Extension updated, user should see update banner');
                }
            });
        } else {
            // No migration needed, just initialize
            initializeBaseStorage(result);
        }
    });
});

/**
 * Initialize base storage objects
 */
function initializeBaseStorage(result) {
    const updates = {};
    
    // Initialize legacy fields if they don't exist (for compatibility)
    if (!result.snoozes) {
        console.log('No existing snoozes found, initializing empty object');
        updates.snoozes = {};
    }
    
    if (!result.snoozeHistory) {
        console.log('No existing snooze history found, initializing empty object');
        updates.snoozeHistory = {};
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
}

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
        // Get the distractions (new format) and snoozes from storage
        chrome.storage.local.get(['distractions', 'blacklist', 'snoozes'], (result) => {
            // Use new distractions format, fallback to blacklist for compatibility
            const distractions = result.distractions || result.blacklist || [];
            const snoozes = result.snoozes || {};
            if (distractions.length === 0) {
                return;
            }
            try {
                // Create a URL object to extract the hostname
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                // Check if any blacklisted domain matches the hostname
                const isBlacklisted = distractions.some(item => {
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
                            const interventionUrl = chrome.runtime.getURL("../pages/intervention.html") + "?originalUrl=" + encodeURIComponent(url);
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
