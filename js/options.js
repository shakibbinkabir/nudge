document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    //  ELEMENT REFERENCES
    // =================================================================
    const navLinks = document.querySelectorAll('.sidebar-nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const apiStates = {
        nudge: document.getElementById('state-connected-nudge'),
        pexels: document.getElementById('state-connected-pexels'),
        disconnected: document.getElementById('state-disconnected')
    };

    // Form Elements
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const byokForm = document.getElementById('byok-form');
    const emailInput = document.getElementById('email-input');
    const otpInput = document.getElementById('otp-input');
    const pexelsKeyInput = document.getElementById('pexels-key-input');
    const status1 = document.getElementById('status-message-1');
    const status2 = document.getElementById('status-message-2');
    const status3 = document.getElementById('status-message-3');
   
    const disconnectNudgeBtn = document.getElementById('disconnect-nudge-btn');
    const disconnectPexelsBtn = document.getElementById('disconnect-pexels-btn');
    
    // Blacklist management
    const blacklistForm = document.getElementById('blacklist-form');
    const blacklistInput = document.getElementById('blacklist-input');
    const blacklistTableBody = document.getElementById('blacklist-table-body');

    // =================================================================
    //  STATE MANAGEMENT & INITIALIZATION
    // =================================================================
    const initializeApiState = () => {
        Object.values(apiStates).forEach(state => state.classList.add('hidden'));
        
        chrome.storage.local.get(['nudgeApiKey', 'userPexelsKey', 'connectedEmail', 'nudgeApiUsage'], (result) => {
            // TEMPORARY: Nudge API disabled -> Always prefer Pexels state
            if (result.userPexelsKey) {
                // User has Pexels key
                apiStates.pexels.classList.remove('hidden');
                const maskedKey = `••••••••••••${result.userPexelsKey.slice(-4)}`;
                document.getElementById('masked-pexels-key-display').textContent = maskedKey;
                
                // If we have rate limit information, display it
                if (result.pexelsRateLimit && result.pexelsRateRemaining) {
                    const usageElement = document.createElement('div');
                    usageElement.className = 'status-display';
                    usageElement.innerHTML = `<span>API Requests:</span><strong>${result.pexelsRateRemaining} / ${result.pexelsRateLimit} remaining</strong>`;
                    
                    // Insert after the key display
                    const keyDisplay = document.getElementById('masked-pexels-key-display').closest('.status-display');
                    keyDisplay.parentNode.insertBefore(usageElement, keyDisplay.nextSibling);
                }
            } else {
                // User has no API key configured
                apiStates.disconnected.classList.remove('hidden');
                
                // Reset toggle state
                const nudgeToggle = document.getElementById('nudge-toggle');
                const pexelsToggle = document.getElementById('pexels-toggle');
                if (nudgeToggle) nudgeToggle.checked = false;
                if (pexelsToggle) pexelsToggle.checked = false;
                
                // Reset form visibility
                updateCollapsibleVisibility();
                // Show a banner about Nudge API unavailability
                const notice = document.getElementById('nudge-disabled-notice');
                if (notice) notice.classList.remove('hidden');
            }
        });
    };

    // Initialize blacklist table
    // This is now handled by initializeBlacklist() in the BLACKLIST LOGIC section

    // Run initializations
    initializeApiState();

    // =================================================================
    //  NAVIGATION LOGIC
    // =================================================================
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            
            // Update active navigation
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            
            // Show target content section
            contentSections.forEach(section => {
                section.id === targetId ? section.classList.add('active') : section.classList.remove('active');
            });
            
            // Reload blacklist when viewing that section
            if (targetId === 'distractions') {
                renderBlacklist();
            }
        });
    });
   
    // =================================================================
    //  DISCONNECT LOGIC
    // =================================================================
    disconnectNudgeBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['nudgeApiKey', 'connectedEmail', 'nudgeApiUsage', 'backgroundImageData', 'backgroundImageBlob', 'lastFetchTimestamp'], () => {
            console.log('Nudge API key disconnected.');
            initializeApiState(); // Refresh the view
        });
    });

    disconnectPexelsBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['userPexelsKey', 'pexelsRateLimit', 'pexelsRateRemaining', 'backgroundImageData', 'backgroundImageBlob', 'lastFetchTimestamp'], () => {
            console.log('Pexels API key disconnected.');
            initializeApiState(); // Refresh the view
        });
    });

    // =================================================================
    //  API FORM SUBMISSION LOGIC
    // =================================================================

    // --- Nudge API: Step 1 - Register Email & Get OTP ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // TEMPORARY: Disable Nudge registration
        status1.textContent = 'Nudge API is temporarily unavailable. Please use a Pexels API key below.';
        status1.className = 'status-message error';
        return;
    });

    // --- Nudge API: Step 2 - Verify OTP & Save Key ---
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // TEMPORARY: Disable Nudge verification
        status1.textContent = 'Nudge API is temporarily unavailable. Please use a Pexels API key below.';
        status1.className = 'status-message error';
        return;
    });

    // --- Bring Your Own Key (BYOK) Logic ---
    byokForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pexelsKey = pexelsKeyInput.value.trim();
        status2.textContent = 'Validating key...';
        status2.className = 'status-message';

        if (!pexelsKey) {
            status2.textContent = 'Please enter a valid Pexels API key.';
            status2.classList.add('error');
            return;
        }

        try {
            // Step 1: Make a test request to Pexels to validate the key
            const response = await fetch('https://api.pexels.com/v1/curated?per_page=1', {
                headers: {
                    'Authorization': pexelsKey
                }
            });

            if (!response.ok) {
                // If response is not 200 OK (e.g., 401 Unauthorized), the key is invalid
                throw new Error(`Invalid API Key. Please check the key and try again. (Status: ${response.status})`);
            }

            // Step 2: If validation is successful, save the key
            chrome.storage.local.set({ 
                userPexelsKey: pexelsKey,
                nudgeApiKey: null, // Clear the other key type to ensure exclusivity
                connectedEmail: null
            }, () => {
                status2.textContent = 'Success! Your Pexels key is verified and saved.';
                status2.className = 'status-message success';
                // Refresh the UI to show the "Connected" state
                setTimeout(initializeApiState, 1000); 
            });

        } catch (error) {
            // Step 3: If validation fails, show an error message
            status2.textContent = error.message;
            status2.className = 'status-message error';
            console.error('Pexels API validation error:', error);
        }
    });
   
    // =================================================================
    //  API OPTION TOGGLE LOGIC
    // =================================================================
    const nudgeToggle = document.getElementById('nudge-toggle');
    const pexelsToggle = document.getElementById('pexels-toggle');
   
    const nudgeContainer = nudgeToggle.closest('.api-option');
    const pexelsContainer = pexelsToggle.closest('.api-option');
    const nudgeContent = nudgeContainer.querySelector('.collapsible-content');
    const pexelsContent = pexelsContainer.querySelector('.collapsible-content');
   
    // Function to update collapsible content visibility
    const updateCollapsibleVisibility = () => {
        // Update visibility based on toggle state
    // TEMPORARY: Force-hide Nudge content
    nudgeToggle.checked = false;
    nudgeContent.style.maxHeight = '0';
    nudgeContent.style.opacity = '0';
    nudgeContent.style.marginTop = '0';
        
        if (pexelsToggle.checked) {
            pexelsContent.style.maxHeight = '500px';
            pexelsContent.style.opacity = '1';
            pexelsContent.style.marginTop = '1.5rem';
            nudgeToggle.checked = false;
        } else {
            pexelsContent.style.maxHeight = '0';
            pexelsContent.style.opacity = '0';
            pexelsContent.style.marginTop = '0';
        }
    };

    // Add event listeners to checkboxes
    nudgeToggle.addEventListener('change', () => {
        // TEMPORARY: prevent enabling Nudge
        nudgeToggle.checked = false;
        updateCollapsibleVisibility();
    });
   
    pexelsToggle.addEventListener('change', () => {
        if (pexelsToggle.checked) {
            nudgeToggle.checked = false;
        }
        updateCollapsibleVisibility();
    });

    // Handle clicks on the option headers
    document.querySelectorAll('.option-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't handle clicks on the toggle switch itself
            if (!e.target.matches('input[type="checkbox"]') && 
                !e.target.matches('.toggle-switch') && 
                !e.target.matches('.slider')) {
                
                // Get the checkbox and toggle it
                const checkbox = header.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                
                // Ensure mutual exclusivity
                if (checkbox === nudgeToggle && checkbox.checked) {
                    pexelsToggle.checked = false;
                } else if (checkbox === pexelsToggle && checkbox.checked) {
                    nudgeToggle.checked = false;
                }
                
                updateCollapsibleVisibility();
            }
        });
    });

    // Initialize the toggle state
    updateCollapsibleVisibility();
    
    // =================================================================
    //  BLACKLIST LOGIC (REFACTORED for Smart Toggles)
    // =================================================================
    let blacklist = []; // Will be an array of objects: { domain: '..', active: true }

    // Helper function to get favicon URL
    const getFaviconUrl = (domain) => `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;

    // Debounce helper function
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const renderBlacklist = () => {
        blacklistTableBody.innerHTML = '';
        if (blacklist.length === 0) {
            blacklistTableBody.innerHTML = '<tr><td colspan="3" class="empty-table-cell">Your distraction list is empty.</td></tr>';
        } else {
            blacklist.forEach(item => {
                const row = document.createElement('tr');
                const blockBtnDisabled = item.active ? 'disabled' : '';
                const unblockBtnDisabled = !item.active ? 'disabled' : '';
                
                row.innerHTML = `
                    <td><img src="${getFaviconUrl(item.domain)}" class="favicon" alt=""></td>
                    <td>${item.domain}</td>
                    <td class="action-cell">
                        <button class="btn btn-secondary btn-sm toggle-block-btn" data-domain="${item.domain}" ${blockBtnDisabled}>Block</button>
                        <button class="btn btn-secondary btn-sm toggle-block-btn" data-domain="${item.domain}" ${unblockBtnDisabled}>Unblock</button>
                        <button class="btn btn-danger btn-sm delete-domain-btn" data-domain="${item.domain}">Delete</button>
                    </td>
                `;
                blacklistTableBody.appendChild(row);
            });
        }
    };

    const saveBlacklist = () => {
        chrome.storage.local.set({ blacklist: blacklist }, () => {
            console.log('Blacklist saved to local storage.');
            renderBlacklist(); // Re-render to reflect any changes
        });
    };

    const initializeBlacklist = () => {
        chrome.storage.local.get(['blacklist'], (result) => {
            // Migration: Check if the stored list is the old string format
            if (result.blacklist && result.blacklist.length > 0 && typeof result.blacklist[0] === 'string') {
                console.log('Migrating old blacklist format...');
                blacklist = result.blacklist.map(domain => ({ domain: domain, active: true }));
                saveBlacklist(); // Save the new format immediately
            } else {
                blacklist = result.blacklist || [];
            }
            renderBlacklist();
        });
    };

    // --- Event Handlers ---
    blacklistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newDomain = blacklistInput.value.trim();
        if (newDomain && !blacklist.some(item => item.domain === newDomain)) {
            blacklist.push({ domain: newDomain, active: true });
            saveBlacklist();
            blacklistInput.value = '';
            document.getElementById('favicon-preview').classList.add('hidden'); // Hide favicon preview
        }
    });

    blacklistTableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target && target.matches('button')) {
            const domain = target.dataset.domain;
            
            if (target.classList.contains('delete-domain-btn')) {
                blacklist = blacklist.filter(item => item.domain !== domain);
            }
            if (target.classList.contains('toggle-block-btn')) {
                blacklist = blacklist.map(item => 
                    item.domain === domain ? { ...item, active: !item.active } : item
                );
            }
            saveBlacklist();
        }
    });

    // Favicon preview functionality
    const updateFaviconPreview = debounce((domain) => {
        const faviconPreview = document.getElementById('favicon-preview');
        if (domain && domain.includes('.')) {
            faviconPreview.src = getFaviconUrl(domain);
            faviconPreview.classList.remove('hidden');
        } else {
            faviconPreview.classList.add('hidden');
        }
    }, 500);

    blacklistInput.addEventListener('input', (e) => {
        updateFaviconPreview(e.target.value.trim());
    });

    // Replace the previous initializeBlacklist() call in your main initializeApp function
    initializeBlacklist();

    // =================================================================
    //  ABOUT SECTION LOGIC 
    // =================================================================
    const GITHUB_REPO = 'shakibbinkabir/nudge';

    const initializeAboutSection = () => {
        const installedVersionEl = document.getElementById('installed-version');
        const aboutInstalledVersionEl = document.getElementById('about-installed-version');
        const latestVersionEl = document.getElementById('latest-version');
        const updateBtn = document.getElementById('update-btn');
        const changelogPrompt = document.getElementById('changelog-prompt');
        const changelogModal = document.getElementById('changelog-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const changelogBody = document.getElementById('changelog-body');

        // 1. Set installed version
        const manifest = chrome.runtime.getManifest();
        const installedVersion = manifest.version;
        installedVersionEl.textContent = `v${installedVersion}`;
        aboutInstalledVersionEl.textContent = `v${installedVersion}`;

        // 2. Fetch latest version from GitHub
        fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
            .then(response => response.json())
            .then(data => {
                const latestVersion = data.tag_name.replace('v', '');
                latestVersionEl.textContent = `v${latestVersion}`;

                // 3. Compare versions and update UI
                if (latestVersion > installedVersion) {
                    updateBtn.textContent = 'Update Now';
                    updateBtn.href = data.html_url; // Link to the release page
                    updateBtn.classList.remove('hidden', 'up-to-date');
                    changelogPrompt.classList.remove('hidden');
                } else {
                    updateBtn.textContent = 'Up to Date';
                    updateBtn.classList.remove('hidden');
                    updateBtn.classList.add('up-to-date');
                    updateBtn.href = '#';
                    updateBtn.target = '';
                }

                // 4. Set up changelog modal
                changelogPrompt.addEventListener('click', (e) => {
                    e.preventDefault();
                    // 1. Create a new Showdown converter instance
                    const converter = new showdown.Converter();
                    
                    // 2. Set options for GitHub Flavored Markdown (for tables, strikethrough, etc.)
                    converter.setFlavor('github');
                    
                    // 3. Convert the markdown from the API response and set the HTML
                    changelogBody.innerHTML = converter.makeHtml(data.body);
                    
                    changelogModal.classList.remove('hidden');
                });
            })
            .catch(error => {
                console.error("Could not fetch latest version:", error);
                latestVersionEl.textContent = `v${installedVersion}`;
                updateBtn.textContent = 'Up to Date';
                    updateBtn.classList.remove('hidden');
                    updateBtn.classList.add('up-to-date');
                    updateBtn.href = '#';
                    updateBtn.target = '';
            });

        // 5. Modal close logic
        closeModalBtn.addEventListener('click', () => changelogModal.classList.add('hidden'));
        changelogModal.addEventListener('click', (e) => {
            if (e.target === changelogModal) {
                changelogModal.classList.add('hidden');
            }
        });
    };

    // Initialize the About section
    initializeAboutSection();
});