# Changelog

All notable changes to the "Elysia Companion" extension will be documented in this file.

## [0.2.0] - 2026-10-09

### Added
- **Compression Stats Tab**: New dedicated tab showing detailed compression metrics from `elysia-code --compression-stats --json`
- **Session Savings Display**: Real-time tokens and USD saved in current session
- **Lifetime Savings Display**: Historical cumulative tokens (32M+) and USD ($37+) saved
- **Top Projects Table**: Collapsible table showing top 5 projects by tokens saved with request counts and savings percentages
- **Top Models Table**: Collapsible table showing top 5 models with compression efficiency
- **Recent Requests Cards**: Last 5 requests with detailed metrics (original → optimized → saved tokens)
- **Build Scripts**: Added `build-and-package.ps1` and `build-and-package.cmd` for easy VSIX generation

### Changed
- **Dashboard Redesign**: Split into 2 tabs: **Usage** (model, usage, config, actions) and **Compression** (stats, projects, models, requests)
- **Tab Navigation**: Added tab bar for easy switching between Usage and Compression
- **Model Selector**: Kept at top of **Usage tab** for easy access
- **Actions**: Available in both tabs (Refresh, Restart, Settings in Usage; Refresh Stats, Restart in Compression)

### Technical
- New interfaces: `CompressionStats`, `CompressionSession`, `CompressionLifetime`, `ProjectStats`, `ModelStats`, `RecentRequest`
- New service method: `fetchCompressionStats()` with JSON parsing
- Helper functions: `formatNumber()` (K/M), `formatTime()` for better readability
- Version bump: 0.1.0 → 0.2.0

---

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
