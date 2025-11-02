# PDF Generator Microservice for Technical Drawings

## Overview
This TypeScript-based PDF Generator microservice is designed for ERPNext/Frappe integration, specifically for technical drawings and customer templates. It enables users to upload PDF templates and technical drawings (PDF, PNG, JPG, SVG), define visual field mappings, specify drawing placement areas, and generate composite PDFs via a REST API. Key capabilities include conditional field rendering, a full-screen visual editor with drag-to-define field areas, and a file-based architecture requiring no database. The project aims to provide a robust, production-ready solution for automated document generation, enhancing efficiency in engineering and manufacturing workflows.

## User Preferences
I prefer iterative development with a focus on clear, concise communication. Please provide detailed explanations for significant architectural decisions or complex code changes. I want to be asked before any major changes are made to the core logic or public APIs. Do not make changes to files outside the explicitly mentioned scope for a given task.

## System Architecture

### UI/UX Decisions
The frontend is built with React and Vite, emphasizing a full-screen, responsive design (`100vh` layout) to maximize workspace. Key UI features include:
- Collapsible sidebars for enhanced viewing space.
- Intuitive drag-and-drop interfaces for defining field boundaries and placing drawings.
- Real-time visual feedback for field mapping and drawing placement, including numbered labels, colored borders, and rotation previews.
- Consistent zoom, pan, and scroll controls across all PDF viewers.
- Professional styling with larger, more spacious buttons and improved spacing.
- **Side-by-Side Layout**: VisualPlacementEditor features a side-by-side layout with the PDF viewport always visible on the left and a fixed 350px properties panel on the right, ensuring users can always see the template while editing drawing placements.

### Technical Implementations
- **Backend**: Node.js 20+, Express, TypeScript, utilizing `pdf-lib` for PDF manipulation and `fs-extra` for file management.
- **Frontend**: React 18, Vite, `PDF.js` for in-browser PDF rendering.
- **PDF Compositing Engine**: `PDFService` handles template field population, embedding of drawings (PDFs or images), and applying drawing-specific field mappings. It supports drawing rotation and maintains aspect ratios using letterboxing/pillarboxing.
- **Field Mapping**: Visual area selection with grid snapping, manual input for precision, and support for various font styles (bold, italic), sizes, colors, and alignments. Conditional field logic allows fields to be rendered based on data values.
- **Drawing Placement Editor**: A visual editor allows users to drag, resize, and rotate drawings directly on the template preview, with real-time visual updates.
- **File-Based Storage**: All templates, mappings, drawings, and combination configurations are stored directly on the file system, eliminating the need for a database. This simplifies backup, version control, and direct manipulation.

### Feature Specifications
- **Template Management**: Upload, delete, and manage PDF templates and their associated field mappings.
- **Drawing Management**: Upload, delete, and rename technical drawings (PDF, PNG, JPG, SVG). PDF drawings can have their own field mappings.
- **Global Mapping Presets**: Save, load, and reuse drawing field mapping configurations across different drawings. Presets include coordinates, fonts, colors, alignments, and conditional logic, enabling consistent mapping patterns across projects.
- **Combinations Management**: A three-tier architecture links templates with drawing placements. Combinations define which drawings are placed on a template, their positions, sizes, and conditional rendering rules. Bulk creation feature generates multiple separate combinations (one per drawing) with configurable naming patterns.
- **PDF Generation API**: REST endpoints for generating composite PDFs based on defined combinations and provided data for both template and drawing fields.

### System Design Choices
- **File Structure**: Organized directories for `/templates/`, `/mappings/`, `/drawings/`, `/drawings_mappings/`, `/mapping_presets/`, and `/combinations/` ensure clear separation of assets. Mapping presets are stored as JSON files in the mapping_presets directory for global reuse.
- **Coordinate System**: Internally uses PDF points (72 points = 1 inch) with Y-axis flipped for consistency. Coordinate storage is top-edge Y for UI, converted to baseline Y for PDF rendering.
- **Security**: Includes path traversal protection, filename sanitization, and allowed file type validation.

## External Dependencies
- **pdf-lib**: Pure JavaScript library for PDF creation and modification.
- **PDF.js**: Mozilla's PDF viewer for rendering PDFs in the browser.
- **Express**: Node.js web application framework for building the API.
- **React**: JavaScript library for building user interfaces.
- **Vite**: Frontend build tool for fast development.
- **fs-extra**: Node.js module for extended file system operations.
- **Multer**: Node.js middleware for handling `multipart/form-data`, primarily for file uploads.