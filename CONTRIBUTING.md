# Contributing to Grid Layout Inspector

Thank you for taking the time to contribute! 🎉

This document provides guidelines for reporting bugs, requesting features, and submitting pull requests.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Conventions](#coding-conventions)

---

## Code of Conduct

Be respectful, inclusive, and constructive. Harassment or abusive behavior of any kind will not be tolerated.

---

## Reporting Bugs

Before opening a bug report, please:

1. **Check existing issues** — your bug may already be tracked.
2. **Reproduce with the latest version** — reload the extension from `chrome://extensions/` and confirm the bug still exists.

When filing a bug, include:
- Chrome version (`chrome://version/`)
- Extension version (visible in `chrome://extensions/`)
- A clear description of the expected vs actual behavior
- Steps to reproduce
- Any relevant console errors (right-click extension icon → **Inspect popup** → Console)

---

## Suggesting Features

Open a GitHub issue with the label **enhancement** and describe:

- The problem you're trying to solve
- Your proposed solution or behavior
- Any alternatives you considered

---

## Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/hoangkhacphuc/Grid-Layout-Inspector.git
cd grid-layout-inspector

# 2. Load in Chrome
#    chrome://extensions/ → Developer mode → Load unpacked → select this folder

# 3. Edit styles (LESS → CSS)
npx less popup/popup.less popup/popup.css

# 4. Reload the extension after changes
#    chrome://extensions/ → click the ↺ reload button on the extension card
```

> **No build step required** — the extension runs directly from source.  
> The only compile step is LESS → CSS when editing popup styles.

---

## Submitting a Pull Request

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the [Coding Conventions](#coding-conventions) below.

3. **Test manually** in Chrome:
   - Load the unpacked extension
   - Verify all settings save and restore correctly
   - Verify the grid overlay renders on multiple sites
   - Verify Row Inspector mode works and deactivates on click

4. **Update documentation** if you change behavior:
   - `README.md` — settings table, feature descriptions
   - `CHANGELOG.md` — add an entry under `[Unreleased]`

5. **Open a Pull Request** with a clear description of the change and why it is needed.

---

## Coding Conventions

| Area | Convention |
|---|---|
| **Language** | All comments and documentation in **English** |
| **CSS units** | Font sizes in `rem` · spacing/sizing in `px` |
| **Styles** | Edit `popup/popup.less` — never write inline styles in HTML |
| **JS** | Vanilla ES2020+, no frameworks or bundlers |
| **Null safety** | Always guard `getElementById` results before use |
| **Messages** | Use the existing `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` patterns |
| **Storage** | All settings through `chrome.storage.local` — no `localStorage` |
| **Commits** | `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` prefixes preferred |
