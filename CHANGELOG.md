# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-04-27

### Added

- Settings panel with appearance, shortcuts, startup, and about sections
- Update check functionality (check GitHub Releases for new versions)
- Clipboard-manager plugin for paste support (Ctrl+V)
- Window snap buttons (snap to left/right half of screen)
- Custom app icons (claude-color design)
- `.idea/` to gitignore for JetBrains IDE users

### Fixed

- Window decorations missing in dev mode (added `decorations: true` to config)
- Sidebar toggle not working when settings panel is open
- Removed unused `-webkit-app-region` CSS (for borderless window)

### Changed

- Right-click disabled in production build for cleaner UX
- UI color system refinements (artisan terminal theme)
- Improved sidebar panel toggle logic

## [0.1.0] - 2025-04-24

### Added

- Initial release
- Multi-terminal support with xterm.js + portable-pty
- Sidebar panels: Sessions, Skills, Agents, MCP Servers, Plugins
- Project quick launch with per-project options
- Native terminal experience (runs real Claude CLI)
- Cross-platform builds (Windows, macOS, Linux)
- CI/CD with GitHub Actions