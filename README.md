# yaml-navigator

Navigate and manage file references in YAML files.

## Features

- **Quick File Navigation**: Place cursor on a file path and press <kbd>ALT</kbd>+<kbd>d</kbd> to open the file
- **Reference Explorer**: Explorer sidebar view showing which files reference the current YAML file
- **Preview & Highlight**: Click references to jump to the exact location with highlighting
- **Auto-create Files**: Optional setting to create files if they don't exist

![demo](demo_images/extension%20demo.gif)

## Configuration

- `yaml-navigator.createFileIfNotExists`: Create an empty file if the referenced file does not exist (default: false)

## Changelog

### 1.0.0
- Major architecture rewrite using YAML AST parsing
- Implemented provider pattern for extensibility
- Added reference explorer view with parent/child file references
- Added preview and highlight support
- New option to create files if not found

### 0.2.0 and 0.1.0
- Initial release with basic file navigation

**Enjoy!**
