# Changelog

All notable changes to the Nudge Chrome Extension will be documented in this file.

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
- Task management now intelligently sets due dates and priorities based on task content

### Fixed
- Fixed Content Security Policy issues with Google search suggestions
- Improved task input placeholder with smooth transition effects
- Improved search suggestion implementation using message passing
- Enhanced image search with file upload capability
- Fixed clock display to always show leading zeros for hours (00:14 instead of 0:14)

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
