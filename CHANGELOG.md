# Changelog

All notable changes to the "Elysia Companion" extension will be documented in this file.

## [0.1.0] - 2026-07-30

### Added
- **Private Mode Toggle**: Click status bar lock icon or dashboard button to toggle between Standard (🔓) and Private (🔒) modes
- **Informa Design System**: Full redesign with official Informa colors, typography (Aleo + Open Sans), and spacing
- **Dual Theme Support**: Complete Light & Dark mode with proper Informa color palette
- **Enhanced Management Panel**: Renamed from "Elysia Usage Dashboard" to "Elysia-Code Management Panel"
- **Improved Status Badges**: Visual indicators with colored dots for Healthy (🟢), Warning (🟡), Critical (🔴)
- **Better Action Buttons**: Restart, Refresh, and Settings buttons with Informa brand colors
- **Auto-refresh Panel**: Dashboard updates automatically after mode changes
- **Design Mockups**: Added standalone HTML mockups for UI review (light + dark)

### Changed
- Updated thresholds: Warning 45%, Critical 85% (based on Informa usage patterns)
- Improved button contrast for better accessibility
- Enhanced model selector dropdown styling
- Unified visual language across all components

### Fixed
- Private Mode button now refreshes panel after toggle
- Text contrast on action buttons in both themes
- Consistent icon sizing and spacing

---

## [0.1.0] - 2026-07-27 (Initial)

### Added
- Initial release
- Status bar item showing Elysia usage ($X.XX / Percentage%)
- Auto-refresh every 5 minutes
- Color-coded status indicators (Green/Yellow/Red)
- Detailed usage dashboard with visual progress bar
- Configurable warning (75%) and critical (90%) thresholds
- Toggle display options for dollar amount and percentage
- Manual refresh command
- Settings integration
- Support for custom elysia-code executable path

## Features

- Real-time usage tracking from `elysia-code --config`
- Visual progress bar in dashboard view
- Remaining budget calculation
- Elysia configuration display (version, model, workspace)
- Error handling with visual indicators
- Auto-refresh with configurable interval
