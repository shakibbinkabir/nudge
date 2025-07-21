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
    
    const disconnectNudgeBtn = document.getElementById('disconnect-nudge-btn');
    const disconnectPexelsBtn = document.getElementById('disconnect-pexels-btn');

    // =================================================================
    //  STATE MANAGEMENT & INITIALIZATION
    // =================================================================
    const initializeApiState = () => {
        Object.values(apiStates).forEach(state => state.classList.add('hidden'));
        chrome.storage.local.get(['nudgeApiKey', 'userPexelsKey', 'connectedEmail', 'nudgeApiUsage'], (result) => {
            console.log("Current storage state:", result); // Debug log
            if (result.nudgeApiKey && result.connectedEmail) {
                apiStates.nudge.classList.remove('hidden');
                document.getElementById('connected-email-display').textContent = result.connectedEmail;
                const usage = result.nudgeApiUsage || { count: 0 };
                const usagePercent = Math.min((usage.count / 16) * 100, 100);
                document.getElementById('usage-bar-fill').style.width = `${usagePercent}%`;
                document.getElementById('usage-text').textContent = `Requests this month: ${usage.count} / 16`;
            } else if (result.userPexelsKey) {
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
                apiStates.disconnected.classList.remove('hidden');
            }
        });
    };
    initializeApiState();

    // =================================================================
    //  NAVIGATION LOGIC
    // =================================================================
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            contentSections.forEach(section => {
                section.id === targetId ? section.classList.add('active') : section.classList.remove('active');
            });
        });
    });
    
    // =================================================================
    //  DISCONNECT LOGIC
    // =================================================================
    disconnectNudgeBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['nudgeApiKey', 'connectedEmail', 'nudgeApiUsage'], () => {
            console.log('Nudge API key disconnected.');
            initializeApiState(); // Refresh the view
        });
    });

    disconnectPexelsBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['userPexelsKey', 'pexelsRateLimit', 'pexelsRateRemaining'], () => {
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
            chrome.storage.local.remove(['userPexelsKey', 'pexelsRateLimit', 'pexelsRateRemaining'], () => {
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
            
            if (!rateLimit || !rateRemaining) {
                console.error('Missing rate limit headers - likely invalid API key');
                throw new Error('Invalid API key format. Pexels API keys should start with "Bearer" or a valid key format.');
            }
            
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
            
            // Parse the response to verify it has the expected structure
            const data = await response.json();
            
            // Do more thorough validation of the response structure
            if (!data.photos || !Array.isArray(data.photos)) {
                throw new Error('Invalid API response structure');
            }
            
            // Verify at least one photo has the expected photo structure with src attributes
            if (data.photos.length === 0 || !data.photos[0].src || !data.photos[0].src.original) {
                throw new Error('Invalid photo data structure returned from API');
            }
            
            // Remove all Nudge API key data first, then save the new Pexels key
            // Make sure all storage keys are properly cleared before setting new values
        chrome.storage.local.remove(['nudgeApiKey', 'connectedEmail', 'nudgeApiUsage'], () => {
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
    
    // Ensure we have references to both checkboxes and their containers
    if (!nudgeToggle || !pexelsToggle) {
        console.error('Could not find toggle switches!');
        return;
    }
    
    const nudgeContainer = nudgeToggle.closest('.api-option');
    const pexelsContainer = pexelsToggle.closest('.api-option');
    
    if (!nudgeContainer || !pexelsContainer) {
        console.error('Could not find api-option containers!');
        return;
    }
    
    const nudgeContent = nudgeContainer.querySelector('.collapsible-content');
    const pexelsContent = pexelsContainer.querySelector('.collapsible-content');
    
    if (!nudgeContent || !pexelsContent) {
        console.error('Could not find collapsible content elements!');
        return;
    }

    // Function to update collapsible content visibility
    const updateCollapsibleVisibility = () => {
        console.log('Toggle state:', { nudge: nudgeToggle.checked, pexels: pexelsToggle.checked });
        
        // Mutual exclusivity - if one is checked, uncheck the other
        if (nudgeToggle.checked && pexelsToggle.checked) {
            // This shouldn't happen with mutual exclusivity, but just in case
            if (e && e.target === nudgeToggle) {
                pexelsToggle.checked = false;
            } else {
                nudgeToggle.checked = false;
            }
        }
        
        // Always update both sections based on their current checked state
        nudgeContent.style.maxHeight = nudgeToggle.checked ? '500px' : '0';
        nudgeContent.style.opacity = nudgeToggle.checked ? '1' : '0';
        nudgeContent.style.marginTop = nudgeToggle.checked ? '1.5rem' : '0';
        
        pexelsContent.style.maxHeight = pexelsToggle.checked ? '500px' : '0';
        pexelsContent.style.opacity = pexelsToggle.checked ? '1' : '0';
        pexelsContent.style.marginTop = pexelsToggle.checked ? '1.5rem' : '0';
    };

    // Initialize the collapsible state
    updateCollapsibleVisibility();

    // Add event listeners to checkboxes
    nudgeToggle.addEventListener('change', (e) => {
        if (nudgeToggle.checked) {
            pexelsToggle.checked = false;
        }
        updateCollapsibleVisibility();
    });
    
    pexelsToggle.addEventListener('change', (e) => {
        if (pexelsToggle.checked) {
            nudgeToggle.checked = false;
        }
        updateCollapsibleVisibility();
    });

    // Also add a click listener to the header to toggle the checkbox
    document.querySelectorAll('.option-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Prevent clicks on the label/switch itself from firing twice
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SPAN') {
                const checkbox = header.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                
                // If this checkbox was just checked, uncheck the other one
                if (checkbox.checked) {
                    if (checkbox === nudgeToggle) {
                        pexelsToggle.checked = false;
                    } else if (checkbox === pexelsToggle) {
                        nudgeToggle.checked = false;
                    }
                }
                
                // Trigger the update
                updateCollapsibleVisibility();
            }
        });
    });
});
