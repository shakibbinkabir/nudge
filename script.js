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

    // --- Add event listener for the settings link ---
    document.getElementById('settings-link').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // =================================================================
    //  BACKGROUND IMAGE FUNCTIONALITY (REFACTORED for v2 WITH CACHING)
    // =================================================================
    const FORTY_EIGHT_HOURS_IN_MS = 48 * 60 * 60 * 1000;

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
            Photo by <a href="${bgData.photographer_url}" target="_blank">${bgData.photographer}</a>
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
                if (bgData && (now - lastFetch < FORTY_EIGHT_HOURS_IN_MS)) {
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
                const pexelsUrl = "https://api.pexels.com/v1/search?query=dark+landscape&per_page=20";
                console.log("Fetching from Pexels:", pexelsUrl);
                response = await fetch(pexelsUrl, {
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
                const nudgeApiUrl = 'https://lab.shakibbinkabir.me/api/nudge/v2/endpoints/image.php';
                
                try {
                    // Create an AbortController with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
                    
                    response = await fetch(nudgeApiUrl, {
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
    
    // --- Clock ---
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockContainer.textContent = `${hours}:${minutes}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Search ---
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
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
        
        toggleViewBtn.textContent = showAllTasks ? 'Show Top 5' : `Show All (${tasks.length})`;

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

    // --- Event Listeners ---
    todoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const taskText = todoInput.value.trim();
        if (taskText) {
            addTask(taskText, todoDeadline.value, todoPriority.value);
            todoForm.reset();
            todoPriority.value = "2"; // Reset priority to Medium
        }
    });

    toggleViewBtn.addEventListener('click', () => {
        showAllTasks = !showAllTasks;
        renderTasks();
    });

    // --- Initial Load ---
    chrome.storage.local.get(['tasks'], (result) => {
        tasks = result.tasks || [];
        renderTasks();
    });
});

// Helper function to pick a random item from an array
function array_rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
