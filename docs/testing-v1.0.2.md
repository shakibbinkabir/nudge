# Nudge v1.0.2 Testing Guide

This document outlines the testing procedures for Nudge v1.0.2 to ensure all features work correctly.

## Pre-Testing Setup

1. **Environment Preparation:**
   - Clean Chrome browser profile or incognito mode
   - Extension Developer Mode enabled in Chrome
   - Sample Pexels API key for testing (get from https://www.pexels.com/api/)

2. **Build Verification:**
   ```bash
   npm install
   npm run lint    # Should pass with no errors
   npm run build   # Should complete successfully
   ```

## Test Scenarios

### 1. Fresh Installation Test

**Objective:** Verify clean installation works correctly

**Steps:**
1. Load unpacked extension from repository root
2. Open new tab
3. Click on extension options (settings)
4. Verify all UI elements load correctly

**Expected Results:**
- New tab loads with local fallback background
- Settings page shows "Disconnected" status badge
- Distraction list is empty
- No console errors

### 2. API Key Configuration Test

**Objective:** Test Pexels API key validation and storage

**Steps:**
1. In settings, expand "Bring Your Own Key (BYOK)" section
2. Enter an invalid API key, submit
3. Verify error message appears
4. Enter a valid Pexels API key, submit
5. Verify success message and status change

**Expected Results:**
- Invalid key shows appropriate error
- Valid key shows success message
- Status badge changes to "✓ Connected via BYOK"
- New tab page loads fresh background

### 3. Background Caching Test

**Objective:** Verify 24h caching and fallback behavior

**Steps:**
1. With valid API key, open new tab (should fetch fresh background)
2. Open DevTools > Application > Storage > Local Storage
3. Verify `backgroundCache` entry exists with proper structure
4. Open new tab again (should use cached background)
5. Modify cache `expiresAt` to past date
6. Open new tab (should fetch fresh background)

**Expected Results:**
- First load fetches from API
- Second load uses cache (check console logs)
- Expired cache triggers fresh fetch
- Cache structure includes: url, provider, fetchedAt, expiresAt

### 4. Domain Management Test

**Objective:** Test distraction list validation and normalization

**Steps:**
1. In settings, go to Distraction Management
2. Try adding invalid domains: "not-a-domain", "http://", "123.456.789"
3. Try adding valid domains: "example.com", "https://www.google.com/search"
4. Try adding duplicate domains
5. Verify normalization works correctly

**Expected Results:**
- Invalid domains show error styling and tooltip
- Valid domains are normalized (protocols removed, lowercase)
- Duplicates are rejected
- Domains appear in table with favicon

### 5. Migration Test (Update Path)

**Objective:** Verify existing users migrate correctly

**Steps:**
1. Manually add old-format storage data:
   ```javascript
   chrome.storage.local.set({
     blacklist: ['YouTube.com', 'FACEBOOK.COM', 'reddit.com'],
     schemaVersion: 1
   });
   ```
2. Reload extension
3. Check settings distraction list

**Expected Results:**
- Old blacklist migrated to distractions format
- Domains normalized (youtube.com, facebook.com, reddit.com)
- Schema version updated to 2
- No duplicates

### 6. Offline/Error Handling Test

**Objective:** Test graceful degradation

**Steps:**
1. Disconnect from internet
2. Open new tab
3. In settings, try adding invalid API key
4. Reconnect internet, verify recovery

**Expected Results:**
- Offline: uses cached or local fallback background
- No API errors spam console
- Invalid key shows clear error message
- Recovery works when connection restored

### 7. Update Banner Test

**Objective:** Verify update notification system

**Steps:**
1. Set storage to simulate update from v1.0.1:
   ```javascript
   chrome.storage.local.set({
     schemaVersion: 2,
     dismissedBanners: {}
   });
   ```
2. Open new tab
3. Verify banner appears
4. Click "Dismiss" button
5. Open new tab again

**Expected Results:**
- Banner appears for first load after update
- Banner has correct styling and content
- Dismiss button works
- Banner doesn't appear after dismissal

## Performance Testing

### Background Loading Performance
- New tab should load quickly (<2s)
- Background images should cache properly
- No excessive API calls (check Network tab)

### Memory Usage
- Extension should not cause memory leaks
- Check Chrome Task Manager during extended use

## Acceptance Criteria Verification

### ✅ Backgrounds
- [ ] Always displays on New Tab and Intervention pages
- [ ] Fresh image ≤ 24h old when online with valid BYOK
- [ ] Auto-fallback to BYOK when Nudge API down
- [ ] Local placeholder when no connectivity/providers
- [ ] Clear, actionable errors when needed
- [ ] No repeated flicker with cached images

### ✅ User Experience
- [ ] One-time update banner with dismiss option
- [ ] Connection status badge in Settings
- [ ] Domain input validation prevents duplicates/invalid entries
- [ ] Existing users' lists normalized automatically

### ✅ Technical
- [ ] Minimal required permissions only
- [ ] Lint passes without errors
- [ ] No console errors during normal use
- [ ] Extension loads and functions correctly

## Browser Compatibility

Test on:
- Chrome (latest stable)
- Chrome (beta channel)
- Chromium-based browsers (Edge, Brave) - optional

## Regression Testing

Verify existing features still work:
- Task management in new tab
- Intervention page blocking
- Snooze functionality
- Settings UI navigation

## Release Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Changelog complete
- [ ] Extension packaged correctly