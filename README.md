# Medical PACS Viewer

A professional web-based DICOM medical imaging viewer inspired by OmegaAI, built with React, TypeScript, and Cornerstone.js.

## Features

### Image Manipulation Tools
- **Window/Level**: Adjust brightness and contrast for optimal tissue visualization
- **Pan**: Reposition images within the viewport
- **Zoom**: Magnify or reduce image size
- **Rotate**: Rotate images up to 360 degrees
- **Flip**: Mirror images horizontally or vertically

### Measurement Tools
- **Length**: Measure distances in medical images
- **Angle**: Measure angles between anatomical structures
- **Ellipse ROI**: Draw elliptical regions of interest
- **Rectangle ROI**: Draw rectangular regions of interest

### Annotation Tools
- **Arrow**: Add directional arrows to highlight features
- **Text**: Add text annotations (coming soon)

### Layout & Viewing
- **Multi-Viewport Layouts**: Switch between 1×1, 2×2, and 3×3 grid layouts
- **Series Navigation**: Thumbnail sidebar for quick navigation between studies
- **Cine Mode**: Animated playback through image series (coming soon)
- **Professional Dark Theme**: Optimized for medical imaging with reduced eye strain

### Advanced Features
- **DICOM File Support**: Load and view DICOM (.dcm) medical imaging files
- **Multiple File Loading**: Load multiple DICOM files simultaneously
- **Real-time Tool Switching**: Instant activation of different tools
- **Viewport Information**: Display patient, study, series, and image metadata

## Getting Started

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm dev
```

### Testing with Sample DICOM Files

You can download free sample DICOM files for testing from:

1. **Rubo Medical**: https://www.rubomedical.com/dicom_files/
   - X-ray Angiograms
   - MRI Brain scans
   - Ultrasound images

2. **DICOM Library**: https://www.dicomlibrary.com/
   - Various modalities
   - Anonymized patient data

3. **OsiriX DICOM Library**: https://www.osirix-viewer.com/resources/dicom-image-library/
   - CT scans
   - MRI studies
   - Compressed JPEG2000 format

### How to Use

1. **Load DICOM Files**
   - Click the "Load DICOM" button in the header
   - Select one or more .dcm files from your computer
   - Files will appear in the series navigation sidebar

2. **Select Tools**
   - Click any tool icon in the left sidebar to activate it
   - The active tool is highlighted in blue
   - Tool name is displayed in the status bar

3. **Manipulate Images**
   - **Window/Level**: Click and drag (left/right for brightness, up/down for contrast)
   - **Pan**: Click and drag to move the image
   - **Zoom**: Click and drag up/down to zoom in/out
   - **Measurements**: Click to place measurement points

4. **Change Layout**
   - Use the layout buttons (1×1, 2×2, 3×3) in the header
   - Multiple viewports allow side-by-side comparison

5. **Navigate Series**
   - Click thumbnails in the right sidebar to switch between loaded images
   - Use mouse wheel to scroll through image stacks (when available)

## Technology Stack

- **Frontend Framework**: React 19 + TypeScript
- **DICOM Processing**: Cornerstone.js 3D
- **Image Loading**: cornerstone-wado-image-loader
- **DICOM Parsing**: dicom-parser
- **UI Components**: shadcn/ui + Tailwind CSS 4
- **Styling**: Dark theme optimized for medical imaging

## Architecture

The viewer is built on Cornerstone.js, the industry-standard library for web-based medical imaging:

- **Rendering Engine**: GPU-accelerated image rendering
- **Tool System**: Extensible tool framework for measurements and annotations
- **Viewport Management**: Multi-viewport support with independent tool states
- **DICOM Support**: Full DICOM standard compliance via WADO image loader

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari

**Note**: WebGL support is required for optimal performance.

## Future Enhancements

- [ ] 3D Volume Rendering (MPR - Multi-Planar Reconstruction)
- [ ] Advanced visualization (MIP, MinIP)
- [ ] PET/CT Fusion
- [ ] Hanging Protocols
- [ ] DICOM SR (Structured Reports)
- [ ] Integration with PACS servers (DICOMweb)
- [ ] Export and print functionality
- [ ] Keyboard shortcuts
- [ ] Touch gesture support for tablets

## License

This project is for educational and evaluation purposes.

## Credits

Inspired by OmegaAI by RamSoft - a cloud-native, zero-footprint RIS/PACS/VNA platform.

Built with Cornerstone.js - the open-source foundation for web-based medical imaging.
