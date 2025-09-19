document.addEventListener('DOMContentLoaded', () => {
    const containerEl = document.querySelector('.container');
    const messageEl = document.getElementById('quirky-message');
    const taskContentWrapper = document.getElementById('task-content-wrapper');
    const tasksEl = document.getElementById('top-tasks-list');
    const showSnoozeBtn = document.getElementById('show-snooze-btn');
    const snoozeSection = document.querySelector('.snooze-section');
    const snoozeButtons = document.querySelectorAll('.snooze-btn');
    const guiltMessageEl = document.getElementById('snooze-guilt');

    // =================================================================
    //  1. CENTRALIZED BACKGROUND LOGIC (v1.0.2)
    // =================================================================
    
    // Attribution container for Pexels credit
    let attributionContainer = document.getElementById('attribution-container');
    if (!attributionContainer) {
        attributionContainer = document.createElement('div');
        attributionContainer.id = 'attribution-container';
        attributionContainer.style.position = 'fixed';
        attributionContainer.style.bottom = '10px';
        attributionContainer.style.right = '20px';
        attributionContainer.style.background = 'rgba(0,0,0,0.4)';
        attributionContainer.style.color = '#fff';
        attributionContainer.style.fontSize = '13px';
        attributionContainer.style.padding = '4px 10px';
        attributionContainer.style.borderRadius = '8px';
        attributionContainer.style.zIndex = '1000';
        attributionContainer.style.fontFamily = 'inherit';
        document.body.appendChild(attributionContainer);
    }

    async function loadInterventionBackground() {
        try {
            // Get API keys and cache
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['userPexelsKey', 'backgroundCache', 'connectionStatus'], resolve);
            });
            
            const userPexelsKey = result.userPexelsKey;
            const cache = result.backgroundCache;
            
            // Check if we have a valid cache first
            if (cache && cache.expiresAt && Date.now() < cache.expiresAt) {
                console.log('Using cached background for intervention');
                displayInterventionBackground({
                    image_url: cache.url,
                    photographer: cache.photographer,
                    photographer_url: cache.photographer_url,
                    imageBlob: cache.imageBlob
                });
                return;
            }
            
            // Try to fetch fresh background if we have a key
            if (userPexelsKey) {
                console.log('Fetching fresh background for intervention from Pexels');
                const backgroundResult = await fetchPexelsBackgroundForIntervention(userPexelsKey);
                
                if (backgroundResult.success) {
                    displayInterventionBackground(backgroundResult.data);
                    return;
                }
            }
            
            // Use stale cache if available
            if (cache && cache.url) {
                console.log('Using stale cached background for intervention as fallback');
                displayInterventionBackground({
                    image_url: cache.url,
                    photographer: cache.photographer || 'Unknown',
                    photographer_url: cache.photographer_url || '#',
                    imageBlob: cache.imageBlob
                });
                return;
            }
            
            // Final fallback to local image
            console.log('Using local fallback background for intervention');
            displayLocalFallbackForIntervention();
            
        } catch (error) {
            console.error('Error loading intervention background:', error);
            displayLocalFallbackForIntervention();
        }
    }

    async function fetchPexelsBackgroundForIntervention(apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch('https://api.pexels.com/v1/search?query=dark%20nature&per_page=20', {
                headers: { 'Authorization': apiKey },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.photos || data.photos.length === 0) {
                throw new Error('No photos returned from Pexels API');
            }
            
            const randomIndex = Math.floor(Math.random() * data.photos.length);
            const photo = data.photos[randomIndex];
            
            if (!photo || !photo.src) {
                throw new Error('Invalid photo data structure');
            }
            
            let imageUrl;
            if (photo.src.large2x) {
                imageUrl = photo.src.large2x;
            } else if (photo.src.large) {
                imageUrl = photo.src.large;
            } else if (photo.src.medium) {
                imageUrl = photo.src.medium;
            } else if (photo.src.original) {
                imageUrl = photo.src.original;
            } else {
                throw new Error('No suitable image URL found');
            }
            
            const backgroundData = {
                image_url: imageUrl,
                photographer: photo.photographer || 'Unknown',
                photographer_url: photo.photographer_url || '#'
            };
            
            return { success: true, data: backgroundData };
            
        } catch (error) {
            console.error('Intervention Pexels API error:', error);
            return { success: false, error: error };
        }
    }
    
    function displayInterventionBackground(bgData) {
        if (bgData.imageBlob) {
            // Use cached blob image
            const objectUrl = URL.createObjectURL(bgData.imageBlob);
            document.body.style.backgroundImage = `url(${objectUrl})`;
        } else {
            // Use remote URL
            document.body.style.backgroundImage = `url(${bgData.image_url})`;
        }
        
        if (bgData.photographer && bgData.photographer_url) {
            attributionContainer.innerHTML = `Photo by <a href="${bgData.photographer_url}" target="_blank" style="color:#fff;text-decoration:underline;">${bgData.photographer}</a> on <a href="https://www.pexels.com" target="_blank" style="color:#fff;text-decoration:underline;">Pexels</a>`;
        } else {
            attributionContainer.innerHTML = '';
        }
    }
    
    function displayLocalFallbackForIntervention() {
        document.body.style.backgroundImage = `url('../assets/background.jpg')`;
        attributionContainer.innerHTML = '';
    }
    
    // Initialize background loading
    loadInterventionBackground();

    // =================================================================
    //  ANIMATION & CONTENT ORCHESTRATION
    // =================================================================
    const quirkyMessages = [
        // Original Messages
        "This Energy Could Be Used Elsewhere ✨",
        "Focus! You got this. 💪",
        "Are you forgetting me? 🥹",

        // New Additions
        "Did you just trip and fall into this tab? 😉",
        "Your to-do list is getting lonely. 🥺",
        "The Procrastination Station is closed. 🚂",
        "Future you is begging you to stop. 🙏",
        "I see you've chosen chaos. Let's reconsider. 🤔",
        "This isn't the focus you're looking for. *waves hand*",
        "Error 404: Focus Not Found. 🤷",
        "Running `sudo focus --now`... 💻",
        "Seriously? Again? 😂",
        "Hello, it's me, your conscience. 😇",
        "The dopamine is temporary, but the deadline is real. 💀",
        "Let's not and say we did. But for real, let's not. 🤫",
        "Are we working hard or hardly working? 👀",
        "Those tasks aren't going to complete themselves! 🤖",
        "A wild distraction appears! Quick, use FOCUS! 💥",
        "Is this on your to-do list? I'll wait. 🧐",
        "Don't make me use the puppy-dog eyes. 🥺",
        "You're better than this tab. You know it, I know it. 👍",
        "Okay, but what if we... didn't? 🤯",
        "Your goals are on another tab, literally. 🗺️",
        "Let's turn that brain power back to your tasks. 🧠",
        "Another one? DJ Khaled would be proud, but I'm not. 😅",
        "This is your daily reminder that you're awesome and have stuff to do. ✨",
        "I'm not mad, just disappointed. 😕",
        "Get back to work, you brilliant human! 🌟",
        "Was this part of the master plan? 🤨"
    ];
    messageEl.textContent = quirkyMessages[Math.floor(Math.random() * quirkyMessages.length)];

    setTimeout(() => {
        containerEl.classList.add('visible');
        setTimeout(() => {
            messageEl.classList.add('visible');
            taskContentWrapper.style.display = 'none';
            setTimeout(() => {
                taskContentWrapper.style.display = 'flex';
                containerEl.classList.add('tasks-visible');
            }, 3000);
        }, 500);
    }, 600);

    // =================================================================
    //  SNOOZE TRANSITION LOGIC
    // =================================================================
    showSnoozeBtn.addEventListener('click', () => {
        messageEl.style.transition = 'none';
        messageEl.style.display = 'none';
        taskContentWrapper.style.opacity = '0';
        taskContentWrapper.style.pointerEvents = 'none';
        snoozeSection.classList.add('visible');
    });

    // =================================================================
    //  SNOOZE & TASK LOGIC
    // =================================================================
    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get('originalUrl');

    snoozeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!originalUrl) return;
            const minutes = parseInt(button.dataset.minutes, 10);
            const snoozeUntil = Date.now() + (minutes * 60 * 1000);
            const domain = new URL(originalUrl).hostname;
            chrome.storage.local.get(['snoozes', 'snoozeHistory'], (result) => {
                const snoozes = result.snoozes || {};
                snoozes[domain] = snoozeUntil;
                const today = new Date().toISOString().slice(0, 10);
                const snoozeHistory = result.snoozeHistory || {};
                snoozeHistory[today] = (snoozeHistory[today] || 0) + minutes;
                chrome.storage.local.set({ snoozes, snoozeHistory }, () => {
                    chrome.tabs.update({ url: originalUrl });
                });
            });
        });
    });

    chrome.storage.local.get(['snoozeHistory'], (result) => {
        const today = new Date().toISOString().slice(0, 10);
        const snoozedMinutesToday = (result.snoozeHistory || {})[today] || 0;
        if (snoozedMinutesToday > 0) {
            guiltMessageEl.textContent = `You are already ignoring me for last ${snoozedMinutesToday} minutes today... 💔`;
        }
    });

    // Returns day with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getDayWithSuffix = (d) => {
        if (d > 3 && d < 21) return `${d}th`;
        switch (d % 10) {
            case 1: return `${d}st`;
            case 2: return `${d}nd`;
            case 3: return `${d}rd`;
            default: return `${d}th`;
        }
    };
    const sortTasks = (arr) => arr.sort((a, b) => (a.completed - b.completed) || (a.priority - b.priority) || ((a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity)) || (a.id - b.id));

    chrome.storage.local.get(['tasks'], (result) => {
        if (result.tasks && result.tasks.length > 0) {
            const tasksToDisplay = sortTasks(result.tasks).filter(t => !t.completed).slice(0, 3);
            if (tasksToDisplay.length === 0) {
                tasksEl.innerHTML = '<li>You have no incomplete tasks!</li>';
                return;
            }
            tasksToDisplay.forEach(task => {
                const li = document.createElement('li');
                const taskText = `<span>${task.text}</span>`;
                let metaParts = [];
                if (task.deadline) {
                    let date = new Date(task.deadline);
                    if (isNaN(date.getTime())) {
                        // Try fallback with T00:00:00
                        date = new Date(task.deadline + 'T00:00:00');
                    }
                    if (!isNaN(date.getTime())) {
                        metaParts.push(`Due on: ${getDayWithSuffix(date.getDate())} ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
                    } else {
                        metaParts.push('Due date: Invalid');
                    }
                }
                metaParts.push(`Priority: ${{1: 'High', 2: 'Medium', 3: 'Low'}[task.priority]}`);
                const taskMeta = `<span class="task-meta">${metaParts.join(' | ')}</span>`;
                li.innerHTML = `${taskText}${taskMeta}`;
                tasksEl.appendChild(li);
            });
        } else {
            tasksEl.innerHTML = '<li>You have no tasks! Go enjoy your day.</li>';
        }
    });
});
