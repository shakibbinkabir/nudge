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
            console.log("Current storage state:", result); // Debug log
            
            if (result.nudgeApiKey && result.connectedEmail) {
                // User has Nudge API key
                apiStates.nudge.classList.remove('hidden');
                document.getElementById('connected-email-display').textContent = result.connectedEmail;
                
                // Display usage info if available
                const usage = result.nudgeApiUsage || { count: 0 };
                const usagePercent = Math.min((usage.count / 16) * 100, 100);
                document.getElementById('usage-bar-fill').style.width = `${usagePercent}%`;
                document.getElementById('usage-text').textContent = `Requests this month: ${usage.count} / 16`;
            } 
            else if (result.userPexelsKey) {
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
            } 
            else {
                // User has no API key configured
                apiStates.disconnected.classList.remove('hidden');
                
                // Reset toggle state
                const nudgeToggle = document.getElementById('nudge-toggle');
                const pexelsToggle = document.getElementById('pexels-toggle');
                if (nudgeToggle) nudgeToggle.checked = false;
                if (pexelsToggle) pexelsToggle.checked = false;
                
                // Reset form visibility
                updateCollapsibleVisibility();
            }
        });
    };

    // Initialize blacklist table
    const loadBlacklist = () => {
        chrome.storage.local.get(['blacklist'], (result) => {
            const blacklist = result.blacklist || [];
            
            // Clear the table
            blacklistTableBody.innerHTML = '';
            
            if (blacklist.length === 0) {
                // Show empty state
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `<td colspan="2" style="text-align: center; color: var(--text-secondary);">
                    No domains added yet. Add your first site below.
                </td>`;
                blacklistTableBody.appendChild(emptyRow);
            } else {
                // Add each domain to the table
                blacklist.forEach(domain => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${domain}</td>
                        <td>
                            <button class="btn btn-danger remove-domain" data-domain="${domain}">
                                Remove
                            </button>
                        </td>
                    `;
                    blacklistTableBody.appendChild(row);
                });
                
                // Add event listeners to remove buttons
                document.querySelectorAll('.remove-domain').forEach(button => {
                    button.addEventListener('click', function() {
                        removeDomain(this.dataset.domain);
                    });
                });
            }
        });
    };

    // Run initializations
    initializeApiState();
    loadBlacklist();

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
                loadBlacklist();
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
        status1.textContent = 'Sending code...';
        status1.className = 'status-message';

        try {
            const response = await fetch('https://lab.shakibbinkabir.me/api/nudge/v2/endpoints/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
           
            status1.textContent = 'Verification code sent to your email!';
            status1.classList.add('success');
            verifyForm.classList.remove('hidden');
            registerForm.style.display = 'none'; // Hide the register form
            otpInput.focus(); // Focus on the OTP input field
        } catch (error) {
            status1.textContent = error.message;
            status1.classList.add('error');
        }
    });

    // --- Nudge API: Step 2 - Verify OTP & Save Key ---
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        status1.textContent = 'Verifying code...';
        status1.className = 'status-message';

        try {
            const response = await fetch('https://lab.shakibbinkabir.me/api/nudge/v2/endpoints/verify.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, otp: otpInput.value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');

            // Save the new Nudge key and remove all Pexels key data
            chrome.storage.local.remove(['userPexelsKey', 'pexelsRateLimit', 'pexelsRateRemaining', 'backgroundImageData', 'backgroundImageBlob', 'lastFetchTimestamp'], () => {
                chrome.storage.local.set({
                    nudgeApiKey: result.api_key,
                    connectedEmail: emailInput.value,
                    nudgeApiUsage: { count: 0 } // Initialize usage counter
                }, () => {
                    console.log("Nudge API key saved successfully");
                    status1.textContent = 'Verification successful!';
                    status1.classList.add('success');
                    setTimeout(() => {
                        initializeApiState(); // Refresh the UI to show the connected state
                    }, 1000);
                });
            });
        } catch (error) {
            status1.textContent = error.message;
            status1.classList.add('error');
        }
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
            // Validate the key by making a simple request to the Pexels API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
           
            const response = await fetch('https://api.pexels.com/v1/search?query=nature&per_page=1', {
                method: 'GET',
                headers: {
                    'Authorization': pexelsKey
                },
                signal: controller.signal
            });
           
            clearTimeout(timeoutId);
           
            // Check if we received valid rate limit headers - real Pexels API keys will have these
            const rateLimit = response.headers.get('X-Ratelimit-Limit');
            const rateRemaining = response.headers.get('X-Ratelimit-Remaining');
           
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
           
            // Parse the response to verify it has the expected structure
            const data = await response.json();
           
            // Do more thorough validation of the response structure
            if (!data.photos || !Array.isArray(data.photos)) {
                throw new Error('Invalid API response structure');
            }
           
            // Remove all Nudge API key data first, then save the new Pexels key
            chrome.storage.local.remove(['nudgeApiKey', 'connectedEmail', 'nudgeApiUsage', 'backgroundImageData', 'backgroundImageBlob', 'lastFetchTimestamp'], () => {
                // Ensure we're setting a completely fresh state
                chrome.storage.local.set({
                    userPexelsKey: pexelsKey,
                    pexelsRateLimit: rateLimit || '20000',
                    pexelsRateRemaining: rateRemaining || '20000'
                }, () => {
                    console.log("Pexels API key saved successfully");
                    status2.textContent = `Key validated successfully! Monthly limit: ${rateLimit || '20000'}`;
                    status2.classList.add('success');
                    setTimeout(() => {
                        initializeApiState(); // Refresh the UI to show the connected state
                    }, 1500);
                });
            });
        } catch (error) {
            status2.textContent = 'Invalid API key. Please check and try again.';
            status2.classList.add('error');
            console.error('Pexels API validation error:', error);
           
            // Clear any previously stored key on validation failure
            chrome.storage.local.remove(['userPexelsKey', 'pexelsRateLimit', 'pexelsRateRemaining']);
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
        if (nudgeToggle.checked) {
            nudgeContent.style.maxHeight = '500px';
            nudgeContent.style.opacity = '1';
            nudgeContent.style.marginTop = '1.5rem';
            pexelsToggle.checked = false;
        } else {
            nudgeContent.style.maxHeight = '0';
            nudgeContent.style.opacity = '0';
            nudgeContent.style.marginTop = '0';
        }
        
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
        if (nudgeToggle.checked) {
            pexelsToggle.checked = false;
        }
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
    //  BLACKLIST MANAGEMENT
    // =================================================================
    
    // Add a new domain to the blacklist
    blacklistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const domain = blacklistInput.value.trim();
        if (!domain) {
            status3.textContent = 'Please enter a valid domain';
            status3.className = 'status-message error';
            return;
        }
        
        // Get current blacklist and add the new domain
        chrome.storage.local.get(['blacklist'], (result) => {
            const blacklist = result.blacklist || [];
            
            // Check if domain already exists
            if (blacklist.includes(domain)) {
                status3.textContent = 'This domain is already in your list';
                status3.className = 'status-message error';
                return;
            }
            
            // Add the new domain and save
            blacklist.push(domain);
            chrome.storage.local.set({ blacklist }, () => {
                status3.textContent = 'Domain added successfully';
                status3.className = 'status-message success';
                blacklistInput.value = ''; // Clear input
                loadBlacklist(); // Refresh the list
                
                // Clear the success message after a delay
                setTimeout(() => {
                    status3.textContent = '';
                    status3.className = 'status-message';
                }, 3000);
            });
        });
    });
    
    // Remove a domain from the blacklist
    const removeDomain = (domain) => {
        chrome.storage.local.get(['blacklist'], (result) => {
            const blacklist = result.blacklist || [];
            const newBlacklist = blacklist.filter(d => d !== domain);
            
            chrome.storage.local.set({ blacklist: newBlacklist }, () => {
                status3.textContent = 'Domain removed successfully';
                status3.className = 'status-message success';
                loadBlacklist(); // Refresh the list
                
                // Clear the success message after a delay
                setTimeout(() => {
                    status3.textContent = '';
                    status3.className = 'status-message';
                }, 3000);
            });
        });
    };

    // =================================================================
    //  ABOUT SECTION LOGIC
    // =================================================================
    const GITHUB_REPO = 'shakibbinkabir/nudge';

    const initializeAboutSection = () => {
        const installedVersionEl = document.getElementById('installed-version');
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
                latestVersionEl.textContent = 'Error';
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