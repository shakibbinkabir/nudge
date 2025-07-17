document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const byokForm = document.getElementById('byok-form');
    const emailInput = document.getElementById('email-input');
    const otpInput = document.getElementById('otp-input');
    const pexelsKeyInput = document.getElementById('pexels-key-input');
    const status1 = document.getElementById('status-message-1');
    const status2 = document.getElementById('status-message-2');
    
    // Connected email view elements
    const connectedEmailView = document.getElementById('connected-email-view');
    const registrationView = document.getElementById('registration-view');
    const connectedEmailDisplay = document.getElementById('connected-email-display');
    const removeEmailBtn = document.getElementById('remove-email-btn');
    const changeEmailBtn = document.getElementById('change-email-btn');
    
    // Connected Pexels view elements
    const connectedPexelsView = document.getElementById('connected-pexels-view');
    const pexelsFormView = document.getElementById('pexels-form-view');
    const removePexelsBtn = document.getElementById('remove-pexels-btn');
    const changePexelsBtn = document.getElementById('change-pexels-btn');
    
    // Get the switch notice element
    const switchNotice = document.getElementById('switch-notice');
    
    // Check if user already has a Nudge API key or Pexels key
    const checkExistingConnection = () => {
        chrome.storage.local.get(['nudgeApiKey', 'connectedEmail', 'userPexelsKey'], (result) => {
            // Check Nudge API connection
            if (result.nudgeApiKey && result.connectedEmail) {
                // User is connected with email, show connected view
                connectedEmailDisplay.textContent = result.connectedEmail;
                connectedEmailView.classList.remove('hidden');
                registrationView.classList.add('hidden');
                
                // Also show the switch notice in the BYOK section
                switchNotice.classList.remove('hidden');
            } else {
                // User is not connected with Nudge API, show registration view
                connectedEmailView.classList.add('hidden');
                registrationView.classList.remove('hidden');
                
                // Hide the switch notice in the BYOK section
                switchNotice.classList.add('hidden');
            }
            
            // Check Pexels key connection
            if (result.userPexelsKey) {
                // User has a Pexels key, show connected view
                connectedPexelsView.classList.remove('hidden');
                pexelsFormView.classList.add('hidden');
            } else {
                // User doesn't have a Pexels key, show form view
                connectedPexelsView.classList.add('hidden');
                pexelsFormView.classList.remove('hidden');
            }
        });
    };
    
    // Run check on page load
    checkExistingConnection();

    // Handle Option 1: Email Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        status1.textContent = 'Sending code...';
        status1.className = '';

        try {
            const response = await fetch('https://lab.shakibbinkabir.me/api/nudge/v2/endpoints/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            status1.textContent = 'Verification code sent to your email!';
            status1.className = 'success';
            verifyForm.classList.remove('hidden');
        } catch (error) {
            status1.textContent = error.message;
            status1.className = 'error';
        }
    });

    // Handle Option 1: OTP Verification
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        status1.textContent = 'Verifying...';
        
        try {
            const response = await fetch('https://lab.shakibbinkabir.me/api/nudge/v2/endpoints/verify.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, otp: otpInput.value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Check if user already had a Pexels key
            chrome.storage.local.get(['userPexelsKey'], (existingData) => {
                const hadPexelsKey = existingData.userPexelsKey;
                
                // Save the Nudge API key, email, and clear the Pexels key
                chrome.storage.local.set({ 
                    nudgeApiKey: result.api_key,
                    connectedEmail: emailInput.value,
                    userPexelsKey: null,
                    // Clear cached background to force new fetch with new API key
                    backgroundImageData: null,
                    backgroundImageBlob: null,
                    lastFetchTimestamp: null
                }, () => {
                    if (hadPexelsKey) {
                        status1.textContent = 'Success! Your Nudge API key is saved. Your Pexels key has been removed.';
                    } else {
                        status1.textContent = 'Success! Your Nudge API key is saved.';
                    }
                    status1.className = 'success';
                    // Update the UI to show connected view
                    checkExistingConnection();
                });
            });
        } catch (error) {
            status1.textContent = error.message;
            status1.className = 'error';
        }
    });

    // Handle Option 2: Bring Your Own Key
    byokForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pexelsKey = pexelsKeyInput.value.trim();
        if (pexelsKey) {
            status2.textContent = 'Validating your Pexels API key...';
            status2.className = '';
            
            // First validate if the key works with the Pexels API
            try {
                // Use search endpoint with specific parameters for testing
                // Create an AbortController with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
                
                const response = await fetch('https://api.pexels.com/v1/search?query=nature&per_page=1', {
                    headers: { 'Authorization': pexelsKey },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId); // Clear the timeout if request completes
                
                if (!response.ok) {
                    throw new Error(`Invalid API key or API error (Status: ${response.status})`);
                }
                
                // Try to parse the response to ensure it's valid
                const data = await response.json();
                if (!data || !data.photos) {
                    throw new Error('Unexpected response format from Pexels API');
                }
                
                // Ensure we have at least one photo to verify the structure
                if (data.photos.length === 0) {
                    throw new Error('No photos returned from Pexels API');
                }
                
                console.log("Pexels API key validation successful");
                
                // Additional check to verify photo structure
                const testPhoto = data.photos[0];
                if (!testPhoto.src || !testPhoto.src.large) {
                    throw new Error('Invalid photo structure in Pexels response');
                }
                
                // Key works, save it
                chrome.storage.local.get(['nudgeApiKey', 'connectedEmail'], (existingData) => {
                    const hadNudgeConnection = existingData.nudgeApiKey && existingData.connectedEmail;
                    
                    // Save the Pexels key and clear Nudge API key
                    chrome.storage.local.set({ 
                        userPexelsKey: pexelsKey,
                        nudgeApiKey: null,
                        connectedEmail: null,  // Also clear the connected email
                        // Clear cached background to force new fetch with new API key
                        backgroundImageData: null,
                        backgroundImageBlob: null,
                        lastFetchTimestamp: null
                    }, () => {
                        if (hadNudgeConnection) {
                            status2.textContent = 'Success! Your Pexels key is verified and saved. Your Nudge API connection has been removed.';
                        } else {
                            status2.textContent = 'Success! Your Pexels key is verified and saved.';
                        }
                        status2.className = 'success';
                        
                        // Update the UI to show connected view for Pexels
                        checkExistingConnection();
                    });
                });
            } catch (error) {
                console.error('Pexels API key validation error:', error);
                status2.textContent = `Error: ${error.message}. Please check your key and try again.`;
                status2.className = 'error';
            }
        }
    });
    
    // Handle Remove Email Connection button
    removeEmailBtn.addEventListener('click', () => {
        chrome.storage.local.set({
            nudgeApiKey: null,
            connectedEmail: null
        }, () => {
            // Switch to registration view
            checkExistingConnection();
            status1.textContent = 'Connection removed successfully.';
            status1.className = 'success';
        });
    });
    
    // Handle Change Email button
    changeEmailBtn.addEventListener('click', () => {
        // Just switch to registration view without removing the key yet
        // (it will be replaced when they verify a new email)
        connectedEmailView.classList.add('hidden');
        registrationView.classList.remove('hidden');
        emailInput.focus();
        status1.textContent = 'Enter your new email address.';
        status1.className = '';
    });
    
    // Handle Remove Pexels Key button
    removePexelsBtn.addEventListener('click', () => {
        chrome.storage.local.set({
            userPexelsKey: null
        }, () => {
            // Switch to form view
            checkExistingConnection();
            status2.textContent = 'Pexels API key removed successfully.';
            status2.className = 'success';
        });
    });
    
    // Handle Change Pexels Key button
    changePexelsBtn.addEventListener('click', () => {
        // Just switch to form view without removing the key yet
        // (it will be replaced when they submit the form)
        connectedPexelsView.classList.add('hidden');
        pexelsFormView.classList.remove('hidden');
        pexelsKeyInput.focus();
        status2.textContent = 'Enter your new Pexels API key.';
        status2.className = '';
    });
        
    // Blacklist management
    const blacklistForm = document.getElementById('blacklist-form');
    const blacklistTextarea = document.getElementById('blacklist-textarea');
    const status3 = document.getElementById('status-message-3');

    // Load existing blacklist on page load
    chrome.storage.local.get(['blacklist'], (result) => {
        if (result.blacklist) {
            blacklistTextarea.value = result.blacklist.join('\n');
        }
    });

    // Save the blacklist
    blacklistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const urls = blacklistTextarea.value.split('\n').map(url => url.trim()).filter(url => url);
        console.log('Saving blacklist:', urls);
        chrome.storage.local.set({ blacklist: urls }, () => {
            status3.textContent = 'Distraction list saved!';
            status3.className = 'success';
            setTimeout(() => { status3.textContent = ''; }, 2000);
            
            // Verify storage
            chrome.storage.local.get(['blacklist'], (result) => {
                console.log('Verified blacklist in storage:', result.blacklist);
            });
        });
    });
});
