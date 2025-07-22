document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    //  DOM ELEMENT REFERENCES
    // =================================================================
    const clockContainer = document.getElementById('clock-container');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoDeadline = document.getElementById('todo-deadline');
    const todoPriority = document.getElementById('todo-priority');
    const todoList = document.getElementById('todo-list');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const attributionContainer = document.getElementById('attribution-container');
    
    // New task UI elements
    const addTaskButton = document.querySelector('.add-task-btn');
    const datePickerBtn = document.getElementById('date-picker-btn');
    const importanceBtn = document.getElementById('importance-btn');
    const datePickerDropdown = document.getElementById('date-picker-dropdown');
    const importanceDropdown = document.getElementById('importance-dropdown');
    const dateOptions = document.querySelectorAll('.date-option');
    const importanceOptions = document.querySelectorAll('.importance-option');
    const selectedDateElement = document.getElementById('selected-date');
    const selectedPriorityElement = document.getElementById('selected-priority');
    const selectedOptionsElement = document.querySelector('.selected-options');
    
    // Initialize date values
    updateDateValues();
    
    // --- Add event listener for the settings link ---
    document.getElementById('settings-link').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // --- Add task input focus handler with smooth transition ---
    const taskOptions = document.querySelector('.task-options');
    
    todoInput.addEventListener('focus', () => {
        // Fade out current placeholder
        todoInput.style.opacity = '0';
        
        // After a short delay, change the placeholder and fade it back in
        setTimeout(() => {
            todoInput.setAttribute('placeholder', 'Try typing Reply to Australian Client\'s Email by Friday 6pm');
            todoInput.style.opacity = '1';
        }, 200);
    });
    
    todoInput.addEventListener('blur', () => {
        if (!todoInput.value) {
            // Fade out current placeholder
            todoInput.style.opacity = '0';
            
            // After a short delay, change the placeholder and fade it back in
            setTimeout(() => {
                todoInput.setAttribute('placeholder', 'Add a task');
                todoInput.style.opacity = '1';
            }, 200);
            
            // Hide task options when input is empty and loses focus
            taskOptions.classList.remove('visible');
        }
    });
    
    // Show task options when user starts typing
    todoInput.addEventListener('input', () => {
        if (todoInput.value.length > 0) {
            taskOptions.classList.add('visible');
        } else {
            taskOptions.classList.remove('visible');
        }
    });
    
    // --- Date picker functionality ---
    datePickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        importanceDropdown.style.display = 'none'; // Hide importance dropdown
        datePickerDropdown.style.display = datePickerDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    // Function to format date in a user-friendly way
    const formatDateForDisplay = (date) => {
        const options = { day: 'numeric', month: 'short' };
        return date.toLocaleDateString('en-US', options);
    };
    
    // Function to update selected date display
    const updateSelectedDateDisplay = (date) => {
        if (date) {
            selectedDateElement.textContent = `📅 ${formatDateForDisplay(date)}`;
            selectedDateElement.classList.add('visible');
            selectedOptionsElement.style.display = 'block';
        } else {
            selectedDateElement.textContent = '';
            selectedDateElement.classList.remove('visible');
            selectedOptionsElement.style.display = 'none';
        }
    };
    
    // Function to update selected priority display
    const updateSelectedPriorityDisplay = (priority) => {
        let priorityText = '';
        let priorityIcon = '⭐';
        
        switch(priority) {
            case '1':
                priorityText = 'High';
                break;
            case '2':
                priorityText = 'Medium';
                break;
            case '3':
                priorityText = 'Low';
                break;
            default:
                priorityText = '';
        }
        
        if (priorityText) {
            selectedPriorityElement.textContent = `${priorityIcon} ${priorityText}`;
            selectedPriorityElement.classList.add('visible');
            selectedOptionsElement.style.display = 'block';
        } else {
            selectedPriorityElement.textContent = '';
            selectedPriorityElement.classList.remove('visible');
            selectedOptionsElement.style.display = 'none';
        }
    };
    
    dateOptions.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            
            if (value === 'today') {
                const today = new Date();
                todoDeadline.valueAsDate = today;
                updateSelectedDateDisplay(today);
            } else if (value === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                todoDeadline.valueAsDate = tomorrow;
                updateSelectedDateDisplay(tomorrow);
            } else if (value === 'next-week') {
                const nextSunday = new Date();
                nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
                todoDeadline.valueAsDate = nextSunday;
                updateSelectedDateDisplay(nextSunday);
            } else if (value === 'pick-date') {
                // Show native date picker with proper positioning
                todoDeadline.classList.add('show-picker');
                
                // Small delay to ensure positioning is applied before showing picker
                setTimeout(() => {
                    todoDeadline.showPicker();
                }, 50);
                
                // Hide the native picker when focus is lost or date is selected
                const hidePicker = () => {
                    todoDeadline.classList.remove('show-picker');
                    todoDeadline.removeEventListener('blur', hidePicker);
                    todoDeadline.removeEventListener('change', hidePicker);
                };
                
                todoDeadline.addEventListener('blur', hidePicker);
                todoDeadline.addEventListener('change', hidePicker);
            }
            
            datePickerDropdown.style.display = 'none';
        });
    });
    
    // --- Importance picker functionality ---
    importanceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        datePickerDropdown.style.display = 'none'; // Hide date picker dropdown
        importanceDropdown.style.display = importanceDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    importanceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const priorityValue = option.dataset.value;
            todoPriority.value = priorityValue;
            updateSelectedPriorityDisplay(priorityValue);
            importanceDropdown.style.display = 'none';
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!datePickerBtn.contains(e.target) && !datePickerDropdown.contains(e.target)) {
            datePickerDropdown.style.display = 'none';
        }
        
        if (!importanceBtn.contains(e.target) && !importanceDropdown.contains(e.target)) {
            importanceDropdown.style.display = 'none';
        }
        
        // Hide native date picker if clicking outside
        if (!todoDeadline.contains(e.target) && !datePickerBtn.contains(e.target) && !datePickerDropdown.contains(e.target)) {
            todoDeadline.classList.remove('show-picker');
        }
    });
    
    // Enable shift+enter for description (placeholder for future implementation)
    todoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            // Future implementation: Toggle description field
            console.log('Description field requested');
        }
    });
    
    // Listen for date picker changes (native date picker)
    todoDeadline.addEventListener('change', () => {
        if (todoDeadline.value) {
            const selectedDate = new Date(todoDeadline.value);
            updateSelectedDateDisplay(selectedDate);
        } else {
            selectedDateElement.classList.remove('visible');
        }
        
        // Hide the native picker after selection
        todoDeadline.classList.remove('show-picker');
    });
    
    // Function to update date values displayed in the dropdown
    function updateDateValues() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextSunday = new Date();
        nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
        
        document.getElementById('today-value').textContent = days[today.getDay()];
        document.getElementById('tomorrow-value').textContent = days[tomorrow.getDay()];
        document.getElementById('next-week-value').textContent = days[nextSunday.getDay()];
    }

    // =================================================================
    //  BACKGROUND IMAGE FUNCTIONALITY (REFACTORED for v2 WITH CACHING)
    // =================================================================
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // Cache for 24 hours

    // Set background using either cached blob or URL
    const setBackground = (bgData) => {
        if (bgData.imageBlob) {
            // Use cached blob image
            const objectUrl = URL.createObjectURL(bgData.imageBlob);
            document.body.style.backgroundImage = `url(${objectUrl})`;
        } else {
            // Use remote URL
            document.body.style.backgroundImage = `url(${bgData.image_url})`;
        }
        
        attributionContainer.innerHTML = `
            Photo by <a href="${bgData.photographer_url}" target="_blank">${bgData.photographer}</a> on <a href="https://pexels.com" target="_blank">Pexels</a>
        `;
    };

    // Download and cache an image from a URL
    const downloadAndCacheImage = async (imageUrl) => {
        try {
            console.log('Downloading image to cache:', imageUrl);
            
            // Create an AbortController with timeout to prevent hanging downloads
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
            
            const response = await fetch(imageUrl, {
                signal: controller.signal,
                cache: 'no-store' // Bypass cache to ensure we get the latest image
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Failed to download image');
            
            const imageBlob = await response.blob();
            return imageBlob;
        } catch (error) {
            console.error('Error downloading image:', error);
            return null;
        }
    };

    // Check if we have a valid cached background
    const checkAndLoadCachedBackground = () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['backgroundImageData', 'backgroundImageBlob', 'lastFetchTimestamp'], (result) => {
                const now = Date.now();
                const lastFetch = result.lastFetchTimestamp || 0;
                const bgData = result.backgroundImageData;
                const bgBlob = result.backgroundImageBlob;
                
                // Check if cache is valid (less than 48 hours old)
                if (bgData && (now - lastFetch < CACHE_DURATION_MS)) {
                    console.log("Using cached background image. Hours since last fetch:", Math.floor((now - lastFetch) / (1000 * 60 * 60)));
                    
                    try {
                        if (bgBlob) {
                            // Convert base64 string back to blob if needed
                            let imageBlob;
                            if (typeof bgBlob === 'string') {
                                try {
                                    const byteCharacters = atob(bgBlob);
                                    const byteArrays = [];
                                    
                                    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                                        const slice = byteCharacters.slice(offset, offset + 512);
                                        
                                        const byteNumbers = new Array(slice.length);
                                        for (let i = 0; i < slice.length; i++) {
                                            byteNumbers[i] = slice.charCodeAt(i);
                                        }
                                        
                                        const byteArray = new Uint8Array(byteNumbers);
                                        byteArrays.push(byteArray);
                                    }
                                    
                                    imageBlob = new Blob(byteArrays, { type: 'image/jpeg' });
                                    bgData.imageBlob = imageBlob;
                                } catch (error) {
                                    console.error("Error converting base64 to blob:", error);
                                    // Continue without blob, will use image_url instead
                                }
                            } else if (bgBlob instanceof Blob) {
                                // For backward compatibility
                                bgData.imageBlob = bgBlob;
                            }
                        }
                        
                        // Make sure we have the essential data even if blob conversion fails
                        if (bgData.image_url && bgData.photographer && bgData.photographer_url) {
                            setBackground(bgData);
                            resolve(true); // We have a valid cache
                            return;
                        }
                    } catch (error) {
                        console.error("Error processing cached image data:", error);
                    }
                }
                
                console.log("No valid cached background image found or cache expired.");
                resolve(false); // Need to fetch new background
            });
        });
    };

    const fetchNewBackground = async (keys) => {
        try {
            // First check if we have a valid cached background
            const hasCachedBackground = await checkAndLoadCachedBackground();
            if (hasCachedBackground) {
                return; // Use cached background and exit
            }
            
            let response;
            let data;
            
            if (keys.userPexelsKey) {
                // --- Case 1: User has their own Pexels key ---
                console.log("Fetching new image with user-provided Pexels key.");
                // Use search endpoint with more specific parameters to avoid 500 errors
                const PEXELS_API_URL = "https://api.pexels.com/v1/search?query=dark%20landscape&per_page=20";
                console.log("Fetching from Pexels:", pexelsUrl);
                response = await fetch(PEXELS_API_URL, {
                    headers: { 'Authorization': keys.userPexelsKey }
                });
                
                // Check if the response is OK before parsing JSON
                if (!response.ok) {
                    const errorText = await response.text();
                    try {
                        const errorJson = JSON.parse(errorText);
                        throw new Error(errorJson.error || `Pexels API error: ${response.status}`);
                    } catch (e) {
                        throw new Error(`Pexels API error: ${response.status}. Please verify your API key.`);
                    }
                }
                
                try {
                    data = await response.json();
                    // Log only necessary parts of the response for debugging
                    console.log("Pexels API response received, total photos:", data.photos ? data.photos.length : 'none');
                    
                    if (!data) {
                        throw new Error('Empty response from Pexels API');
                    }
                    
                    if (!data.photos) {
                        console.error("Unexpected Pexels API response format:", data);
                        throw new Error('Missing photos array in Pexels API response');
                    }
                    
                    if (data.photos.length === 0) {
                        throw new Error('No photos returned from Pexels API. Try a different query.');
                    }
                    
                    console.log(`Received ${data.photos.length} photos from Pexels API`);
                } catch (error) {
                    console.error("Error parsing Pexels API response:", error);
                    throw new Error(`Failed to parse Pexels API response: ${error.message}`);
                }
                
                // Pexels API nests photos in a `photos` array
                if (data.photos && data.photos.length > 0) {
                    // Get a random index within bounds
                    const randomIndex = Math.floor(Math.random() * data.photos.length);
                    const photo = data.photos[randomIndex];
                    
                    // Safe check for photo object
                    if (!photo) {
                        console.error('Selected photo is null or undefined');
                        throw new Error('Invalid photo data from Pexels API');
                    }
                    
                    // Safe check for photo.src
                    if (!photo.src) {
                        console.error('Photo object structure is invalid');
                        throw new Error('Invalid photo data structure from Pexels API');
                    }
                    
                    // Determine the best available image URL with additional error checking
                    let imageUrl;
                    
                    // Log available image options but limit the output size
                    console.log("Available image URLs from Pexels:", 
                        photo.src ? Object.keys(photo.src).length : 'none');
                        
                    if (photo.src.large2x) {
                        imageUrl = photo.src.large2x;
                    } else if (photo.src.large) {
                        imageUrl = photo.src.large;
                    } else if (photo.src.medium) {
                        imageUrl = photo.src.medium;
                    } else if (photo.src.original) {
                        imageUrl = photo.src.original;
                    } else {
                        console.error("No valid image URLs found in photo.src");
                        throw new Error('No suitable image URL found in photo.src');
                    }
                    
                    const bgData = {
                        image_url: imageUrl,
                        photographer: photo.photographer || 'Unknown',
                        photographer_url: photo.photographer_url || '#'
                    };
                    
                    // Download and cache the actual image
                    const imageBlob = await downloadAndCacheImage(bgData.image_url);
                    if (imageBlob) {
                        bgData.imageBlob = imageBlob;
                        
                        // Convert blob to base64 for storage
                        const reader = new FileReader();
                        reader.onloadend = function() {
                            // Get base64 string without the prefix
                            const base64data = reader.result.split(',')[1];
                            
                            // Save both the image metadata and the image blob
                            chrome.storage.local.set({
                                backgroundImageData: bgData,
                                backgroundImageBlob: base64data,
                                lastFetchTimestamp: Date.now()
                            });
                        };
                        reader.readAsDataURL(imageBlob);
                    }
                    
                    setBackground(bgData);
                }
            } else if (keys.nudgeApiKey) {
                // --- Case 2: User has a Nudge API key ---
                console.log("Fetching new image with Nudge API key.");
                const NUDGE_API_URL = 'https://lab.shakibbinkabir.me/api/nudge/v2/endpoints/image.php?query=dark%20landscape';
                
                try {
                    // Create an AbortController with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
                    
                    response = await fetch(NUDGE_API_URL, {
                        headers: { 'X-API-KEY': keys.nudgeApiKey },
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId); // Clear the timeout if request completes
                    
                    // Check if the response is OK before parsing JSON
                    if (!response.ok) {
                        const errorText = await response.text();
                        try {
                            const errorJson = JSON.parse(errorText);
                            throw new Error(errorJson.error || `Nudge API error: ${response.status}`);
                        } catch (e) {
                            throw new Error(`Nudge API error: ${response.status}. Please verify your API key.`);
                        }
                    }
                } catch (err) {
                    console.error("Network error with Nudge API:", err);
                    throw new Error(`Network error with Nudge API: ${err.message}`);
                }
                
                try {
                    data = await response.json();
                    if (!data || !data.image_url || !data.photographer || !data.photographer_url) {
                        throw new Error('Invalid response format from Nudge API');
                    }
                } catch (err) {
                    console.error("Error parsing Nudge API response:", err);
                    throw new Error(`Error parsing Nudge API response: ${err.message}`);
                }
                
                // Download and cache the actual image
                const imageBlob = await downloadAndCacheImage(data.image_url);
                if (imageBlob) {
                    data.imageBlob = imageBlob;
                    
                    // Convert blob to base64 for storage
                    const reader = new FileReader();
                    reader.onloadend = function() {
                        // Get base64 string without the prefix
                        const base64data = reader.result.split(',')[1];
                        
                        // Save both the image metadata and the image blob
                        chrome.storage.local.set({
                            backgroundImageData: data,
                            backgroundImageBlob: base64data,
                            lastFetchTimestamp: Date.now()
                        });
                    };
                    reader.readAsDataURL(imageBlob);
                }
                
                setBackground(data);
            } else {
                // --- Case 3: No keys configured ---
                console.log("No API key configured.");
                // Use fallback background
                document.body.style.backgroundImage = `url('background.jpg')`;
                attributionContainer.innerHTML = 'Please set an API key in the <a href="#" id="open-options-link">settings</a> to load backgrounds.';
                document.getElementById('open-options-link').addEventListener('click', () => chrome.runtime.openOptionsPage());
                
                // Clear any potentially invalid cached data since we're in an unconfigured state
                chrome.storage.local.remove(['backgroundImageData', 'backgroundImageBlob', 'lastFetchTimestamp']);
            }
        } catch (error) {
            console.error("Failed to fetch background:", error);
            
            // If it's a Pexels API specific error with the user's key
            if (keys.userPexelsKey && error.message.includes('Pexels API')) {
                console.warn("There seems to be an issue with the provided Pexels API key. Checking if we should notify the user.");
                
                // Show specific message for Pexels API key issues
                let errorMsg = `There was a problem with your Pexels API key: ${error.message}.`;
                attributionContainer.innerHTML = `${errorMsg} <a href="#" id="open-options-link-error">Check settings</a>`;
                document.getElementById('open-options-link-error').addEventListener('click', () => chrome.runtime.openOptionsPage());
                
                // Also try to use cached image as fallback
                useCachedImageAsFallback(error);
            } else if (keys.nudgeApiKey && error.message.includes('Nudge API')) {
                console.warn("There seems to be an issue with the Nudge API server: ", error.message);
                
                if (error.message.includes('502')) {
                    // Special case for 502 Bad Gateway errors
                    const errorMsg = `The Nudge API server is temporarily unavailable (502 Bad Gateway). Using cached image if available.`;
                    attributionContainer.innerHTML = `${errorMsg} <a href="#" id="try-again-link">Try again</a>`;
                    document.getElementById('try-again-link').addEventListener('click', () => handleBackground());
                } else {
                    // Other Nudge API errors
                    const errorMsg = `There was a problem with the Nudge API: ${error.message}.`;
                    attributionContainer.innerHTML = `${errorMsg} <a href="#" id="open-options-link-error">Check settings</a>`;
                    document.getElementById('open-options-link-error').addEventListener('click', () => chrome.runtime.openOptionsPage());
                }
                
                // Try to use cached image as fallback
                useCachedImageAsFallback(error);
            } else {
                // For other errors, just try to use cached data without specific UI message
                useCachedImageAsFallback(error);
            }
        }
    };
    
    // Helper function to use cached image as fallback
    const useCachedImageAsFallback = (originalError) => {
        chrome.storage.local.get(['backgroundImageData', 'backgroundImageBlob'], (result) => {
            const bgData = result.backgroundImageData;
            const bgBlob = result.backgroundImageBlob;
            
            if (bgData) {
                // Use cached data as fallback
                console.log("Using cached background image after API error.");
                
                if (bgBlob) {
                    // Convert base64 string back to blob
                    try {
                        if (typeof bgBlob === 'string') {
                            try {
                                const byteCharacters = atob(bgBlob);
                                const byteArrays = [];
                                
                                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                                    const slice = byteCharacters.slice(offset, offset + 512);
                                    
                                    const byteNumbers = new Array(slice.length);
                                    for (let i = 0; i < slice.length; i++) {
                                        byteNumbers[i] = slice.charCodeAt(i);
                                    }
                                    
                                    const byteArray = new Uint8Array(byteNumbers);
                                    byteArrays.push(byteArray);
                                }
                                
                                const imageBlob = new Blob(byteArrays, { type: 'image/jpeg' });
                                bgData.imageBlob = imageBlob;
                            } catch (decodeError) {
                                console.error("Error decoding base64 string:", decodeError);
                                // Continue without blob, will use image_url instead
                                console.log("Falling back to image_url instead of cached blob");
                            }
                        } else if (bgBlob instanceof Blob) {
                            // For backward compatibility
                            bgData.imageBlob = bgBlob;
                        }
                    } catch (err) {
                        console.error("Error processing cached blob:", err);
                    }
                }
                
                setBackground(bgData);
            } else {
                // As a last resort, use the local static image
                document.body.style.backgroundImage = `url('background.jpg')`;
                attributionContainer.innerHTML = `Error: ${originalError.message}. <a href="#" id="open-options-link-error">Check settings.</a>`;
                document.getElementById('open-options-link-error').addEventListener('click', () => chrome.runtime.openOptionsPage());
            }
        });
    };

    const handleBackground = () => {
        // Check for both possible keys
        chrome.storage.local.get(['nudgeApiKey', 'userPexelsKey'], (keys) => {
            fetchNewBackground(keys);
        });
    };

    // Initialize background handling
    handleBackground();
    

    // =================================================================
    //  CLOCK & SEARCH FUNCTIONALITY
    // =================================================================
    
    // --- Clock (Pixel phone style) ---
    function updateClock() {
        const now = new Date();
        
        // Format hours with leading zero for single digits
        let hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        clockContainer.textContent = `${hours}:${minutes}`;
        
        // Update the date in format: Friday, 18th July, 2025
        updateDate(now);
    }
    
    // Function to get the ordinal suffix for a day (1st, 2nd, 3rd, etc.)
    function getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    // Function to update the date display
    function updateDate(date) {
        const dateContainer = document.getElementById('date-container');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const day = date.getDate();
        const dayOfWeek = days[date.getDay()];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const ordinalSuffix = getOrdinalSuffix(day);
        
        dateContainer.textContent = `${dayOfWeek}, ${day}${ordinalSuffix} ${month}, ${year}`;
    }
    
    setInterval(updateClock, 1000);
    updateClock();

    // --- Search with Autocomplete ---
    const searchSuggestions = document.getElementById('search-suggestions');
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    const imageSearchBtn = document.getElementById('image-search-btn');
    
    let currentSuggestions = [];
    let selectedSuggestionIndex = -1;
    let debounceTimeout = null;
    
    // Function to fetch search suggestions from Google
    const fetchSuggestions = async (query) => {
        if (!query.trim()) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.classList.remove('active');
            return;
        }
        
        try {
            // Use message passing to request suggestions from the background script
            chrome.runtime.sendMessage(
                { action: 'fetchSearchSuggestions', query: query },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.success) {
                        renderSuggestions(response.suggestions);
                    } else if (response && response.suggestions) {
                        renderSuggestions(response.suggestions);
                    } else {
                        searchSuggestions.innerHTML = '';
                        searchSuggestions.classList.remove('active');
                        console.error('Error fetching suggestions:', response?.error || 'Unknown error');
                    }
                }
            );
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };
    
    // Function to render suggestions
    const renderSuggestions = (suggestions) => {
        currentSuggestions = suggestions;
        selectedSuggestionIndex = -1;
        
        if (suggestions.length === 0) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.classList.remove('active');
            return;
        }
        
        searchSuggestions.innerHTML = '';
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                searchInput.value = suggestion;
                searchSuggestions.classList.remove('active');
                // Use the same approach as the form's submit handler to navigate to Google
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(suggestion)}`;
            });
            searchSuggestions.appendChild(item);
        });
        
        searchSuggestions.classList.add('active');
    };
    
    // Handle input for autocomplete
    searchInput.addEventListener('input', (event) => {
        const query = event.target.value.trim();
        
        // Clear any existing timeout
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        
        // Set a new timeout to debounce the API call
        debounceTimeout = setTimeout(() => {
            fetchSuggestions(query);
        }, 300); // 300ms debounce
    });
    
    // Handle keyboard navigation for suggestions
    searchInput.addEventListener('keydown', (event) => {
        if (!searchSuggestions.classList.contains('active')) {
            return;
        }
        
        const suggestions = document.querySelectorAll('.suggestion-item');
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                break;
            case 'Escape':
                searchSuggestions.classList.remove('active');
                selectedSuggestionIndex = -1;
                return;
            case 'Enter':
                if (selectedSuggestionIndex >= 0) {
                    event.preventDefault();
                    const selectedSuggestion = currentSuggestions[selectedSuggestionIndex];
                    searchInput.value = selectedSuggestion;
                    searchSuggestions.classList.remove('active');
                    // Navigate to Google search with the selected suggestion
                    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(selectedSuggestion)}`;
                }
                return;
            default:
                return;
        }
        
        // Update the selected item visual cue
        suggestions.forEach((item, index) => {
            if (index === selectedSuggestionIndex) {
                item.classList.add('selected');
                searchInput.value = currentSuggestions[index];
            } else {
                item.classList.remove('selected');
            }
        });
    });
    
    // Handle click outside to close suggestions
    document.addEventListener('click', (event) => {
        if (!searchSuggestions.contains(event.target) && event.target !== searchInput) {
            searchSuggestions.classList.remove('active');
        }
    });
    
    // Handle form submission
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    });
    
    // Voice search functionality
    voiceSearchBtn.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            
            voiceSearchBtn.classList.add('listening');
            
            recognition.start();
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                searchInput.value = transcript;
                voiceSearchBtn.classList.remove('listening');
                
                // Trigger search
                if (transcript) {
                    setTimeout(() => {
                        searchForm.submit();
                    }, 500);
                }
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                voiceSearchBtn.classList.remove('listening');
            };
            
            recognition.onend = () => {
                voiceSearchBtn.classList.remove('listening');
            };
        } else {
            alert('Speech recognition is not supported in your browser');
        }
    });
    
    // Image search functionality
    imageSearchBtn.addEventListener('click', () => {
        // Create a hidden file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Trigger the file selection dialog
        fileInput.click();
        
        // Handle file selection
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                // Navigate to Google image search
                const googleImagesUrl = 'https://www.google.com/searchbyimage/upload';
                
                // Create form for upload
                const formData = new FormData();
                formData.append('encoded_image', file);
                
                // Open a new tab for the search
                chrome.runtime.sendMessage({
                    action: 'imageSearch',
                    file: URL.createObjectURL(file)
                }, (response) => {
                    // Clean up
                    document.body.removeChild(fileInput);
                });
            } else {
                // Clean up if no file was selected
                document.body.removeChild(fileInput);
            }
        });
    });

    // =================================================================
    //  TO-DO LIST WITH PRIORITIZATION
    // =================================================================
    let tasks = [];
    let showAllTasks = false;

    // --- Core Functions ---
    const saveTasks = () => chrome.storage.local.set({ tasks: tasks });

    const sortTasks = (taskArray) => {
        return taskArray.sort((a, b) => {
            // 1. Completed tasks always go to the bottom
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            // 2. Sort by priority (1=High, 3=Low)
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // 3. Sort by deadline (earlier dates first, no deadline is last)
            const dateA = a.deadline ? new Date(a.deadline) : null;
            const dateB = b.deadline ? new Date(b.deadline) : null;
            if (dateA && !dateB) return -1; // Task with deadline comes before task without
            if (!dateA && dateB) return 1;
            if (dateA && dateB) {
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                }
            }
            // 4. Fallback to creation date (implicit via ID)
            return a.id - b.id;
        });
    };

    const renderTasks = () => {
        todoList.innerHTML = '';
        const sortedTasks = sortTasks([...tasks]);
        const tasksToDisplay = showAllTasks ? sortedTasks : sortedTasks.slice(0, 5);
        
        toggleViewBtn.textContent = showAllTasks ? 'Top 5' : `All ${tasks.length}`;
        
        // Apply fixed height class when showing all tasks with smooth animation
        if (showAllTasks) {
            todoList.style.opacity = '0.6';
            setTimeout(() => {
                todoList.classList.add('fixed-height-scroll');
                setTimeout(() => {
                    todoList.style.opacity = '1';
                }, 50);
            }, 50);
        } else {
            todoList.style.opacity = '0.6';
            setTimeout(() => {
                todoList.classList.remove('fixed-height-scroll');
                setTimeout(() => {
                    todoList.style.opacity = '1';
                }, 50);
            }, 50);
        }

        tasksToDisplay.forEach(task => {
            const li = document.createElement('li');
            li.dataset.id = task.id;
            if (task.completed) li.classList.add('completed');

            const taskDetails = document.createElement('div');
            taskDetails.className = 'task-details';
            
            const taskText = document.createElement('span');
            taskText.textContent = task.text;
            taskDetails.appendChild(taskText);

            if (task.deadline) {
                const deadlineText = document.createElement('span');
                deadlineText.className = 'task-deadline';
                deadlineText.textContent = `Due: ${task.deadline}`;
                taskDetails.appendChild(deadlineText);
            }
            
            li.appendChild(taskDetails);
            taskDetails.addEventListener('click', () => toggleComplete(task.id));
            
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id);
            });
            
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    };
    
    const addTask = (text, deadline, priority) => {
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            deadline: deadline || null, // Store deadline as string or null
            priority: parseInt(priority, 10) // Store priority as number
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
    };

    const toggleComplete = (id) => {
        tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
        saveTasks();
        renderTasks();
    };

    const deleteTask = (id) => {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    };

    // --- Intelligent Task Detection Algorithm ---
    const analyzeTask = (taskText) => {
        // Original values (defaults)
        let deadline = todoDeadline.value;
        let priority = todoPriority.value;
        let cleanText = taskText;
        
        // Date detection patterns
        const datePatterns = [
            // by Friday, Monday, etc.
            {
                regex: /by\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i,
                handler: (match) => {
                    const today = new Date();
                    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                        .indexOf(match[1].toLowerCase());
                    const targetDate = new Date();
                    
                    // Calculate days to add
                    let daysToAdd = dayOfWeek - today.getDay();
                    if (daysToAdd <= 0) daysToAdd += 7; // If it's the same day or past, go to next week
                    
                    targetDate.setDate(today.getDate() + daysToAdd);
                    return targetDate.toISOString().split('T')[0];
                }
            },
            // "by tomorrow", "by next week"
            {
                regex: /by\s+tomorrow\b/i,
                handler: () => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toISOString().split('T')[0];
                }
            },
            {
                regex: /by\s+next\s+week\b  /i,
                handler: () => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    return nextWeek.toISOString().split('T')[0];
                }
            },
            // "by month day" e.g., "by July 30", "by Dec 25"
            {
                regex: /by\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
                handler: (match) => {
                    const months = {
                        'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
                        'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
                        'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
                        'nov': 10, 'november': 10, 'dec': 11, 'december': 11
                    };
                    
                    const month = months[match[1].toLowerCase()];
                    const day = parseInt(match[2], 10);
                    
                    const targetDate = new Date();
                    const currentMonth = targetDate.getMonth();
                    
                    // If the month is earlier than the current month, go to next year
                    if (month < currentMonth) {
                        targetDate.setFullYear(targetDate.getFullYear() + 1);
                    }
                    
                    targetDate.setMonth(month);
                    targetDate.setDate(day);
                    
                    return targetDate.toISOString().split('T')[0];
                }
            },
            // time pattern (by X AM/PM, at X AM/PM)
            {
                regex: /by\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
                handler: (match) => {
                    // If time is included, it's likely due today
                    const today = new Date();
                    
                    // Very early hours (before 9 AM) might be high priority
                    const hour = parseInt(match[1], 10);
                    const isPM = match[3].toLowerCase() === 'pm';
                    
                    if (hour < 9 && !isPM) {
                        // Early morning deadlines get high priority
                        priority = '1';
                    }
                    
                    return today.toISOString().split('T')[0];
                }
            }
        ];
        
        // Urgency words to determine priority
        const urgencyWords = {
            high: [
                'urgent', 'asap', 'immediately', 'critical', 'important', 'crucial', 
                'vital', 'essential', 'emergency', 'priority', 'deadline'
            ],
            medium: [
                'soon', 'needed', 'necessary', 'required', 'should'
            ],
            low: [
                'whenever', 'someday', 'eventually', 'might', 'could', 'possibly', 
                'consider', 'think about'
            ]
        };
        
        // Check for date patterns
        for (const pattern of datePatterns) {
            const match = taskText.match(pattern.regex);
            if (match) {
                deadline = pattern.handler(match);
                
                // Remove the matched date text from the task
                cleanText = cleanText.replace(pattern.regex, '').trim();
                break; // Only use the first detected date pattern
            }
        }
        
        // Calculate urgency based on deadline proximity
        if (deadline) {
            const today = new Date();
            const dueDate = new Date(deadline);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            // Adjust priority based on time remaining
            if (daysUntilDue <= 1) {
                priority = '1'; // High - Today or tomorrow
            } else if (daysUntilDue <= 3) {
                priority = '2'; // Medium - Within 3 days
            } else {
                priority = '3'; // Low - More than 3 days away
            }
        }
        
        // Check for urgency words
        let wordCount = {high: 0, medium: 0, low: 0};
        
        const lowerText = taskText.toLowerCase();
        for (const word of urgencyWords.high) {
            if (lowerText.includes(word)) wordCount.high++;
        }
        for (const word of urgencyWords.medium) {
            if (lowerText.includes(word)) wordCount.medium++;
        }
        for (const word of urgencyWords.low) {
            if (lowerText.includes(word)) wordCount.low++;
        }
        
        // Override priority based on urgency words if they exist
        if (wordCount.high > 0) priority = '1';
        else if (wordCount.medium > 0) priority = '2';
        else if (wordCount.low > 0) priority = '3';
        
        // Update UI to show detected date and priority
        if (deadline) {
            todoDeadline.value = deadline;
            updateSelectedDateDisplay(new Date(deadline));
        }
        
        if (priority !== todoPriority.value) {
            todoPriority.value = priority;
            updateSelectedPriorityDisplay(priority);
        }
        
        return {
            text: cleanText,
            deadline: deadline,
            priority: priority
        };
    };
    
    // --- Event Listeners ---
    todoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const taskText = todoInput.value.trim();
        if (taskText) {
            const analyzed = analyzeTask(taskText);
            addTask(analyzed.text, analyzed.deadline, analyzed.priority);
            todoForm.reset();
            todoPriority.value = "2"; // Reset priority to Medium
            
            // Reset the displayed options
            selectedDateElement.classList.remove('visible');
            selectedPriorityElement.classList.remove('visible');
            selectedOptionsElement.style.display = 'none';
            taskOptions.classList.remove('visible');
        }
    });
    
    // Add task by pressing Enter
    todoInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const taskText = todoInput.value.trim();
            if (taskText) {
                const analyzed = analyzeTask(taskText);
                addTask(analyzed.text, analyzed.deadline, analyzed.priority);
                todoForm.reset();
                todoPriority.value = "2"; // Reset priority to Medium
                
                // Reset the displayed options
                selectedDateElement.classList.remove('visible');
                selectedPriorityElement.classList.remove('visible');
                selectedOptionsElement.style.display = 'none';
                taskOptions.classList.remove('visible');
            }
        }
    });

    toggleViewBtn.addEventListener('click', () => {
        showAllTasks = !showAllTasks;
        renderTasks();
    });
    
    // Voice and camera search buttons
    document.querySelectorAll('.search-icon').forEach(button => {
        button.addEventListener('click', () => {
            if (button.title === 'Search by voice') {
                // Implement Web Speech API for voice search
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = false;
                    recognition.lang = 'en-US';
                    
                    const micButton = button;
                    const originalInnerHTML = micButton.innerHTML;
                    
                    recognition.start();
                    micButton.classList.add('listening');
                    
                    recognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript;
                        searchInput.value = transcript;
                        micButton.classList.remove('listening');
                        micButton.innerHTML = originalInnerHTML;
                        
                        // Auto-submit the form after a short delay
                        setTimeout(() => {
                            searchForm.dispatchEvent(new Event('submit'));
                        }, 300);
                    };
                    
                    recognition.onerror = (event) => {
                        console.error('Speech recognition error:', event.error);
                        micButton.classList.remove('listening');
                        micButton.innerHTML = originalInnerHTML;
                    };
                    
                    recognition.onend = () => {
                        micButton.classList.remove('listening');
                        micButton.innerHTML = originalInnerHTML;
                    };
                } else {
                    console.warn('Web Speech API not supported in this browser.');
                    alert('Voice search is not supported in your browser.');
                }
            } else if (button.title === 'Search by image') {
                // Create a file input element
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
                
                // Listen for file selection
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        
                        reader.onload = (event) => {
                            const imageDataUrl = event.target.result;
                            // Get base64 string without metadata
                            const base64String = imageDataUrl.split(',')[1];
                            
                            // Navigate to Google Lens with the image
                            const googleSearchUrl = `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageDataUrl)}`;
                            window.open(googleSearchUrl, '_blank');
                        };
                        
                        reader.readAsDataURL(file);
                    }
                    document.body.removeChild(fileInput);
                });
                
                // Trigger file selection
                fileInput.click();
            }
        });
    });

    // --- Initial Load ---
    chrome.storage.local.get(['tasks'], (result) => {
        tasks = result.tasks || [];
        renderTasks();
    });
    
    // =================================================================
    //  USER PROFILE FUNCTIONALITY (SIMPLIFIED - NO GOOGLE LOGIN)
    // =================================================================
    
    const userProfile = document.getElementById('user-profile');
    
    // Simplified profile icon handling - just use the SVG icon
    // Add click handler for the profile icon to open Chrome settings
    userProfile.addEventListener('click', () => {
        // Opens Chrome settings instead of Google account
        chrome.tabs.create({ url: 'chrome://settings/' });
    });
});

// Helper function to pick a random item from an array
function array_rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Debug function to test if Web Speech API is available
window.checkSpeechApiSupport = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return {
        isSupported: !!SpeechRecognition,
        apiObject: SpeechRecognition ? 'Available' : 'Not available'
    };
};
