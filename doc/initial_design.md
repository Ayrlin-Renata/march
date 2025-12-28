# Initial Design Specification - March

## 1. Overview
March is a desktop application (Electron) designed for content creators and gamers to manage screenshot captures and prepare them for social media posts in real-time.

## 2. Technical Stack
- **Electron**: Cross-platform desktop framework.
- **React + Vite**: Fast frontend development and HMR.
- **TypeScript**: Type safety across main and renderer processes.
- **Zustand**: Lightweight global state management.
- **Framer Motion**: Smooth animations and micro-interactions.
- **Chokidar**: High-performance directory watching.
- **i18next**: Internationalization.

## 3. UI Structure
The application uses a **Single Page Layout** with two primary functional zones:

### 3.1 Ingestion Area (Left/Top)
- **Chronological Dump**: Grid of thumbnails sorted by time.
- **Burst Detection**: Automatic grouping of images based on temporal proximity (configurable threshold).
- **Source Management**: Configuration for multiple "listen" folders.
- **Interaction**:
  - Hover: Medium-sized preview overlay.
  - Left-Click: Full-screen pannable/zoomable preview.
  - Right-Click: Exit full preview.
  - Drag: Move image to Story Builder.

### 3.2 Story Builder Area (Right/Main)
- **Post Mockup**: A simplified, accurate-aspect-ratio preview of a social media post.
- **Layout Selector**: Vertical bar to switch between grid formats (e.g., 1 image, 2x2, 1 large + 2 small).
- **Social Media Tabs**: Switch between platform-specific previews (X, Bluesky, etc.).
- **Post Management**: Side drawer for creating and switching between multiple active "posts".
- **Post Mode**: A dedicated workflow for final verification and copying assets to the clipboard.

## 4. Advanced Features
### 4.1 In-Preview Image Editor
- Images within the mockup can be panned and zoomed.
- **Bounding Boxes**: Dashed lines show the source image boundaries and the crop area.
- **Aspect Ratio Constraint**: Crop handles respect the platform's required thumbnail dimensions.

### 4.2 Content Tools
- **Hashtag Bar**: Clickable tags for quick insertion.
- **Preset Texts**: Customizable snippets for common post descriptions.

## 5. System Integration
- **Windows Registry**: Integration to add March to the right-click menu for quick access or folder selection.
- **One-Click Installer**: Seamless distribution and updates.

## 6. Aesthetics
- **Theme Support**: VSCode-like theming (Light, Dark, High Contrast, and community-inspired themes).
- **Premium Feel**: Glassmorphism, smooth transitions, and modern typography.
- **Adaptive**: The window may resize/reposition automatically during "Post Mode".
