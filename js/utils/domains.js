/**
 * Domain normalization and validation utility for Nudge v1.0.2
 * Handles input sanitization, deduplication, and migration
 */

/**
 * Normalize a domain input
 */
function normalizeDomain(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }

    let domain = input.trim();

    if (!domain) {
        return null;
    }

    // Remove protocol (http:// or https://)
    domain = domain.replace(/^https?:\/\//, '');

    // Remove paths, query parameters, and fragments
    domain = domain.split('/')[0].split('?')[0].split('#')[0];

    // Convert to lowercase
    domain = domain.toLowerCase();

    // Remove trailing dots
    domain = domain.replace(/\.+$/, '');

    // Handle www. prefix - convert www.example.com to example.com
    domain = domain.replace(/^www\./, '');

    // Basic domain validation
    if (!isValidDomain(domain)) {
        return null;
    }

    return domain;
}

/**
 * Basic domain validation
 */
function isValidDomain(domain) {
    if (!domain || domain.length === 0) {
        return false;
    }

    // Reject IP addresses (basic check)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
        return false;
    }

    // Must contain at least one dot (except for localhost-style domains)
    if (!domain.includes('.') && !['localhost'].includes(domain)) {
        return false;
    }

    // Basic character validation - only allow letters, numbers, dots, and hyphens
    if (!/^[a-z0-9.-]+$/.test(domain)) {
        return false;
    }

    // Must not start or end with dot or hyphen
    if (/^[.-]|[.-]$/.test(domain)) {
        return false;
    }

    // No consecutive dots
    if (/\.\./.test(domain)) {
        return false;
    }

    return true;
}

/**
 * Check if a domain already exists in the list
 */
function isDuplicateDomain(domain, existingDomains) {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
        return true; // Treat invalid domains as duplicates
    }

    return existingDomains.some((item) => {
        const existingDomain = typeof item === 'string' ? item : item.domain;
        return normalizeDomain(existingDomain) === normalizedDomain;
    });
}

/**
 * Migrate old domain format to new normalized format
 */
function migrateDomains(oldDomains) {
    if (!Array.isArray(oldDomains)) {
        return [];
    }

    const migratedDomains = [];
    const seenDomains = new Set();

    oldDomains.forEach((item) => {
        let domain, active, addedAt;

        // Handle both string format and object format
        if (typeof item === 'string') {
            domain = item;
            active = true;
            addedAt = Date.now();
        } else if (item && typeof item === 'object') {
            domain = item.domain;
            active = item.active !== undefined ? item.active : true;
            addedAt = item.addedAt || Date.now();
        } else {
            return; // Skip invalid entries
        }

        const normalizedDomain = normalizeDomain(domain);

        if (normalizedDomain && !seenDomains.has(normalizedDomain)) {
            seenDomains.add(normalizedDomain);
            migratedDomains.push({
                domain: normalizedDomain,
                active: active,
                addedAt: addedAt,
            });
        }
    });

    return migratedDomains;
}

/**
 * Suggest base domain if only subdomain was entered
 */
function suggestBaseDomain(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) {
        return null;
    }

    const parts = normalized.split('.');
    if (parts.length > 2) {
        // If it's a subdomain like "mail.google.com", suggest "google.com"
        const baseDomain = parts.slice(-2).join('.');
        if (baseDomain !== normalized) {
            return baseDomain;
        }
    }

    return null;
}

/**
 * Validate and prepare domain for addition to blacklist
 */
function validateDomainInput(input, existingDomains) {
    const normalized = normalizeDomain(input);

    if (!normalized) {
        return {
            valid: false,
            error: 'Please enter a valid domain name (e.g., example.com)',
        };
    }

    if (isDuplicateDomain(normalized, existingDomains)) {
        return {
            valid: false,
            error: 'This domain is already in your list',
        };
    }

    const suggestion = suggestBaseDomain(normalized);

    return {
        valid: true,
        domain: normalized,
        suggestion: suggestion,
    };
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeDomain,
        isValidDomain,
        isDuplicateDomain,
        migrateDomains,
        suggestBaseDomain,
        validateDomainInput,
    };
}
