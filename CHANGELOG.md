# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] – 2026-03-30

### Added
- Column grid overlay with configurable container width, column count, and gutter
- Row grid overlay with configurable row height and row gutter
- Independent color pickers for column color, row color, and hover highlight color
  - Full `#rrggbbaa` hex support with native color picker + opacity slider
- **Row Inspector mode** — hover any row to highlight it; click anywhere to exit
- Per-site enable/disable with `chrome.storage.local` persistence
- Global on/off toggle in the popup header
- Auto-restore grid on page reload for enabled sites
- Light-mode popup UI (white + blue theme)
