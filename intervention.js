document.addEventListener('DOMContentLoaded', () => {
    const messageEl = document.getElementById('quirky-message');
    const tasksEl = document.getElementById('top-tasks-list');
    const snoozeButtons = document.querySelectorAll('.snooze-btn');
    const guiltMessageEl = document.getElementById('snooze-guilt');

    const quirkyMessages = [
        "Don't you wanna do it? 😏",
        "Are you forgetting me? 🥹",
        "You are ignoring me! 😭",
        "Focus! You got this.",
        "Is this really what you want?"
    ];

    // Show a random message
    messageEl.textContent = quirkyMessages[Math.floor(Math.random() * quirkyMessages.length)];
    
    // Function to sort tasks (copied from newtab script for now)
    const sortTasks = (taskArray) => {
        return taskArray.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.priority !== b.priority) return a.priority - b.priority;
            const dateA = a.deadline ? new Date(a.deadline) : null;
            const dateB = b.deadline ? new Date(b.deadline) : null;
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
            if (dateA && dateB) {
                if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            }
            return a.id - b.id;
        });
    };

    // Load and display top 3 tasks
    chrome.storage.local.get(['tasks'], (result) => {
        if (result.tasks && result.tasks.length > 0) {
            const sortedTasks = sortTasks(result.tasks);
            const tasksToDisplay = sortedTasks.slice(0, 3);
            tasksToDisplay.forEach(task => {
                const li = document.createElement('li');
                li.textContent = task.text;
                tasksEl.appendChild(li);
            });
        } else {
            tasksEl.innerHTML = '<li>You have no tasks!</li>';
        }
    });
    
    // --- 1. Get the original URL the user was trying to visit ---
    const urlParams = new URLSearchParams(window.location.search);
    const originalUrl = urlParams.get('originalUrl');
    
    if (!originalUrl) {
        console.error('No original URL found in query parameters');
        // Hide the snooze section if there's no URL to go back to
        document.querySelector('.snooze-section').classList.add('hidden');
    }

    // --- 2. Set up event listeners for snooze buttons ---
    snoozeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!originalUrl) {
                console.log('No original URL to snooze for');
                return;
            }
            
            const minutes = parseInt(button.dataset.minutes, 10);
            const snoozeUntil = Date.now() + (minutes * 60 * 1000);
            
            try {
                // Get the domain from the original URL to use as a key
                const url = new URL(originalUrl);
                const domain = url.hostname;
                
                if (!domain) {
                    console.error('Invalid hostname in URL:', originalUrl);
                    return;
                }

                // Save the snooze information
                chrome.storage.local.get(['snoozes', 'snoozeHistory'], (result) => {
                    const snoozes = result.snoozes || {};
                    snoozes[domain] = snoozeUntil;
                    
                    // Track total snooze time for the day for the guilt message
                    const today = new Date().toISOString().slice(0, 10);
                    const snoozeHistory = result.snoozeHistory || {};
                    snoozeHistory[today] = (snoozeHistory[today] || 0) + minutes;

                    chrome.storage.local.set({ snoozes: snoozes, snoozeHistory: snoozeHistory }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error saving snooze:', chrome.runtime.lastError);
                            return;
                        }
                        
                        console.log(`Snooze set for ${domain} until ${new Date(snoozeUntil).toLocaleTimeString()}`);
                        
                        // Redirect the user to their original destination
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs && tabs.length > 0) {
                                chrome.tabs.update(tabs[0].id, { url: originalUrl });
                            } else {
                                console.error('No active tab found for redirection');
                                // Fallback - try to open in a new tab
                                window.location.href = originalUrl;
                            }
                        });
                    });
                });
            } catch (err) {
                console.error('Error processing snooze:', err);
                alert('There was an error processing your request. Please try again.');
            }
        });
    });

    // --- 3. Display the guilt message if applicable ---
    chrome.storage.local.get(['snoozeHistory'], (result) => {
        const today = new Date().toISOString().slice(0, 10);
        const snoozeHistory = result.snoozeHistory || {};
        const snoozedMinutesToday = snoozeHistory[today] || 0;

        if (snoozedMinutesToday > 0) {
            guiltMessageEl.textContent = `You already ignoring me for last ${snoozedMinutesToday} minutes 💔`;
            guiltMessageEl.classList.remove('hidden');
        }
    });
});
