/**
 * Centralized background image management utility for Nudge v1.0.2
 * Handles caching, error handling, and provider fallbacks
 */

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 5000]; // Exponential backoff in milliseconds

/**
 * Error types for background fetching
 */
const ErrorTypes = {
    INVALID_KEY: 'InvalidKey',
    RATE_LIMITED: 'RateLimited',
    SERVER_DOWN: 'ServerDown',
    NETWORK_OFFLINE: 'NetworkOffline',
    UNKNOWN: 'Unknown',
};

/**
 * Classify error based on response status
 */
function classifyError(error, response) {
    if (!navigator.onLine) {
        return ErrorTypes.NETWORK_OFFLINE;
    }

    if (response) {
        if (response.status === 401 || response.status === 403) {
            return ErrorTypes.INVALID_KEY;
        }
        if (response.status === 429) {
            return ErrorTypes.RATE_LIMITED;
        }
        if (response.status >= 500) {
            return ErrorTypes.SERVER_DOWN;
        }
    }

    return ErrorTypes.UNKNOWN;
}

/**
 * Check if cache is valid and fresh
 */
function isCacheValid(cache) {
    if (!cache || !cache.fetchedAt || !cache.expiresAt) {
        return false;
    }
    return Date.now() < cache.expiresAt;
}

/**
 * Get cached background if available and valid
 */
async function getCachedBackground() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['backgroundCache'], (result) => {
            const cache = result.backgroundCache;
            if (isCacheValid(cache)) {
                resolve(cache);
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Save background to cache
 */
async function saveCacheBackground(backgroundData, provider) {
    const now = Date.now();
    const cache = {
        url: backgroundData.image_url,
        provider: provider,
        fetchedAt: now,
        expiresAt: now + CACHE_DURATION_MS,
        photographer: backgroundData.photographer,
        photographer_url: backgroundData.photographer_url,
        imageBlob: backgroundData.imageBlob,
    };

    return new Promise((resolve) => {
        chrome.storage.local.set({ backgroundCache: cache }, () => {
            resolve(cache);
        });
    });
}

/**
 * Fetch background with retry logic and error handling
 */
async function fetchBackground(provider, apiKey, retryCount = 0) {
    try {
        let url, headers;

        if (provider === 'pexels') {
            url = 'https://api.pexels.com/v1/search?query=dark%20nature&per_page=20';
            headers = { Authorization: apiKey };
        } else {
            throw new Error('Invalid provider specified');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            headers: headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorType = classifyError(null, response);
            const error = new Error(`${errorType}: ${response.status} ${response.statusText}`);
            error.type = errorType;
            error.response = response;
            throw error;
        }

        const data = await response.json();

        if (!data.photos || data.photos.length === 0) {
            throw new Error('No photos returned from API');
        }

        // Select random photo
        const randomIndex = Math.floor(Math.random() * data.photos.length);
        const photo = data.photos[randomIndex];

        if (!photo || !photo.src) {
            throw new Error('Invalid photo data structure');
        }

        // Get best available image URL
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
            photographer_url: photo.photographer_url || '#',
        };

        // Try to download and cache the image
        try {
            const imageBlob = await downloadImage(imageUrl);
            if (imageBlob) {
                backgroundData.imageBlob = imageBlob;
            }
        } catch (downloadError) {
            console.warn('Failed to download image for caching:', downloadError);
            // Continue without blob caching
        }

        // Save to cache
        await saveCacheBackground(backgroundData, provider);

        return {
            success: true,
            data: backgroundData,
            provider: provider,
        };
    } catch (error) {
        console.error(`Background fetch attempt ${retryCount + 1} failed:`, error);

        // Check if we should retry
        const shouldRetry =
            retryCount < MAX_RETRIES &&
            error.type !== ErrorTypes.INVALID_KEY &&
            (error.type === ErrorTypes.SERVER_DOWN ||
                error.type === ErrorTypes.NETWORK_OFFLINE ||
                error.type === ErrorTypes.UNKNOWN);

        if (shouldRetry) {
            const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            console.log(`Retrying in ${delay}ms...`);

            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchBackground(provider, apiKey, retryCount + 1);
        }

        return {
            success: false,
            error: error,
            errorType: error.type || ErrorTypes.UNKNOWN,
        };
    }
}

/**
 * Download image and return blob
 */
async function downloadImage(imageUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(imageUrl, {
            signal: controller.signal,
            cache: 'no-store',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Failed to download image');
        }

        return await response.blob();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Get fallback background (local placeholder)
 */
function getFallbackBackground() {
    return {
        image_url: '../assets/background.jpg',
        photographer: 'Nudge',
        photographer_url: '#',
        isLocal: true,
    };
}

/**
 * Main function to get background image with full fallback chain
 */
async function getBackground(userPexelsKey) {
    // Step 1: Try cache first
    const cachedBackground = await getCachedBackground();
    if (cachedBackground) {
        console.log('Using cached background');
        return {
            success: true,
            data: {
                image_url: cachedBackground.url,
                photographer: cachedBackground.photographer,
                photographer_url: cachedBackground.photographer_url,
                imageBlob: cachedBackground.imageBlob,
            },
            provider: cachedBackground.provider,
            fromCache: true,
        };
    }

    // Step 2: Try to fetch new background
    if (userPexelsKey) {
        console.log('Fetching fresh background from Pexels');
        const result = await fetchBackground('pexels', userPexelsKey);

        if (result.success) {
            // Update connection status
            chrome.storage.local.set({ connectionStatus: 'byok' });
            return result;
        } else {
            console.warn('Failed to fetch background:', result.error);

            // Try to use stale cache if available
            const staleCache = await new Promise((resolve) => {
                chrome.storage.local.get(['backgroundCache'], (result) => {
                    resolve(result.backgroundCache);
                });
            });

            if (staleCache && staleCache.url) {
                console.log('Using stale cached background as fallback');
                return {
                    success: true,
                    data: {
                        image_url: staleCache.url,
                        photographer: staleCache.photographer,
                        photographer_url: staleCache.photographer_url,
                        imageBlob: staleCache.imageBlob,
                    },
                    provider: staleCache.provider,
                    fromStaleCache: true,
                    error: result.error,
                };
            }
        }
    }

    // Step 3: Fallback to local placeholder
    console.log('Using local fallback background');
    chrome.storage.local.set({ connectionStatus: 'disconnected' });

    return {
        success: true,
        data: getFallbackBackground(),
        provider: 'local',
        isLocal: true,
    };
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getBackground,
        getCachedBackground,
        ErrorTypes,
        getFallbackBackground,
    };
}
