# Changelog

All notable changes to the Nudge Chrome Extension will be documented in this file.

## [0.9.8] - 2025-07-22

### Added
- Displayed favicons next to each domain in the Distractions list for better visual identification.
- Implemented a real-time favicon preview in the 'Add Domain' input field that appears as you type.
- Created an automatic migration process to update the old blacklist data structure to the new format.

### Changed
- Overhauled the Distractions page actions, replacing the single 'Remove' button with a more flexible **Block/Unblock** toggle and a separate **Delete** button.
- Upgraded the blacklist's underlying data structure to support toggling domains on or off.

### Fixed
- Implemented robust validation for user-provided Pexels API keys to verify the key with Pexels *before* saving it, preventing invalid keys.

## [0.9.7] - 2025-07-22

### Changed
- Redesigned the "Disconnected" API state UI with collapsible toggle sections
- Implemented mutual exclusivity for API connection options with toggle switches
- Added smooth animations for form section transitions
- Improved user experience for API setup with clearer separation between options
- Fixed issue with collapsible toggle sections not working properly in the API settings
- Improved JavaScript implementation for toggle switches to ensure compatibility
- Enhanced user experience by making form toggle animations more reliable

## [0.9.6] - 2025-07-21

### Added
- Implemented fully functional API key forms in settings page
- Added email registration and OTP verification workflow for Nudge API
- Added form for saving personal Pexels API keys
- Implemented API state management with dynamic UI updates
- Added immediate UI feedback after form submissions
- Added error handling for API requests and form validation

## [0.9.5] - 2025-07-21

### Added
- Completely redesigned settings page with modern "Tech Dashboard" UI
- New two-column layout with sidebar navigation
- Implemented "frosted glass" card design with dark theme
- Added teal/cyan accent color scheme
- Separate sections for API Keys, Distractions, and About
- Improved organization of settings interface
- Implemented sidebar navigation functionality
- Added interactive tab switching between settings sections
- Improved UX with visual highlighting of active navigation items
- Implemented dynamic "State-Aware" API Keys view in settings page
- Added automatic detection of API connection type (Nudge API or Pexels)
- Display appropriate UI based on user's connection status
- Implemented disconnect functionality for both API options
- Added masked key display for security when using Pexels API
- Usage statistics display for Nudge API users

## [0.9.4] - 2025-07-20

### Enhanced
- Expanded quirky message collection from 3 to 28 options
- Added emoji enrichment to all messages for improved user engagement
- Improved variety of tone and style in intervention messages

## [0.9.3] - 2025-07-20

### Added
- Implemented dynamic background image system for the intervention page
- Added "Dark Nature" themed image fetching via Pexels API or Nudge API
- Created background image caching system with 24-hour refresh interval
- Integrated background handling with the existing animation sequences
- Added fallback mechanism for API failures

## [0.9.2] - 2025-07-20

### Fixed
- Fixed intervention page layout to properly fill the viewport (90vw/90vh)
- Enhanced quirky message to display at a larger size (5rem) in the center of the container
- Improved initial animation sequence for cleaner user experience
- Removed premature display of task content and snooze options in the first animation stage
- Implemented smooth transition animation from large centered message to smaller top-aligned message
- Added animated fade-in for task content after 3-second delay
- Improved task card styling with proper alignment and spacing
- Implemented polished snooze transition with fade-out of main content and fade-in of snooze options
- Added sassy messaging to the snooze view with "Fine, ignore me then... 🙄" heading
- Enhanced snooze guilt message with red text and prominent text-shadow effect
- Fixed snooze button styling and interaction

## [0.9.1] - 2025-07-20

### Added
- Dynamic background system for intervention page with "Dark Nature" themed images
- Image caching system that stores background images for 24 hours
- New frosted glass container effect with subtle animation on the intervention page
- Animated quirky message system with random motivational messages
- Styled task list showing the top 3 incomplete tasks with due dates and priority levels
- Timed animation sequence for content elements on intervention page
- "I'll Do Later!" button with hover effect
- Interactive snooze transition with smooth animation between views
- Three snooze duration options (10 minutes, 30 minutes, 1 hour)
- "Guilt message" showing total snooze time used for the day
- Snooze history tracking in chrome.storage.local

### Changed
- Completely redesigned intervention page foundation with clean HTML structure
- Replaced static background with dynamic background images from Pexels API or Nudge API
- Implemented animated content container with 600ms delay and smooth fade-in effect
- Enhanced task display with organized meta information and improved styling
- Improved snooze UX with better styled buttons and smoother transitions
- Enhanced user flow with animated cross-fade between task view and snooze options
- Added multi-stage animation choreography with 4-second delay between message and tasks

## [0.9.0] - 2025-07-19

### Added
- Implemented voice search functionality using the Web Speech API
- Google Lens integration for image search
- Added visual feedback when using the voice search feature
- Added Google-style search autocomplete suggestions
- Keyboard navigation support for search suggestions
- Task option buttons (due date and importance) now appear only when user starts typing
- Added intelligent task detection algorithm that automatically identifies dates and priorities in task text
- Added visual indication of selected date and priority in the task input field with smooth transitions

### Changed
- Modernized "Show All" and "Show Top 5" buttons with a more minimal design
- Enhanced scrollbar styling for task list with completely invisible scrollbars that only appear on hover
- Improved task list scrolling experience with smooth scroll behavior

### Fixed
- Fixed native calendar date picker positioning to appear in the same location as the custom date picker dropdown
- Modernized and improved styling of the native date picker with glassmorphism effect and better typography
- Enhanced date picker UX with proper show/hide animations and click-outside handling
- Task management now intelligently sets due dates and priorities based on task content

### Fixed
- Fixed Content Security Policy issues with Google search suggestions
- Improved task input placeholder with smooth transition effects
- Improved search suggestion implementation using message passing
- Enhanced image search with file upload capability
- Fixed clock display to always show leading zeros for hours (00:14 instead of 0:14)
- Fixed selected options display remaining visible after adding a task

## [0.8.0] - 2025-07-18

### Added
- Major UI overhaul with a more modern and minimalist design
- Added Poppins font across the entire extension
- Redesigned clock to match Pixel phone's modern style
- Added mic and camera buttons to Google search bar
- Redesigned tasks interface with a more intuitive layout
- Enhanced task creation UI with improved date selection options
- Added black overlay to background images (25% opacity)
- Added Chrome-style navigation with Gmail, Images, and Apps links

## [0.7.1] - 2025-07-18

### Added
- Skip intervention screen when all tasks are completed or no tasks exist
- Added this changelog file to track project changes

## [0.7.0] - Earlier Release

- Initial feature set including:
  - Beautiful background images with API integrations
  - Task management with priorities and deadlines
  - Distraction management with website blocking
  - Intervention system with snooze functionality
