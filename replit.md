# PDF Generator Microservice for Technical Drawings

## Overview
A TypeScript-based PDF Generator microservice for ERPNext/Frappe integration designed specifically for technical drawings and customer templates. This application allows you to:
- Upload PDF templates with visual field mapping
- Upload technical drawings (PDF, PNG, JPG, SVG) with field mappings
- Define drawing placement areas in templates
- Generate composite PDFs via REST API with template + drawing data
- Support conditional field rendering
- Full-screen visual editor with drag-to-define field areas
- No database required - everything is file-based

**Status**: Core features complete, drawing compositing in progress
**Last Updated**: October 30, 2025

## Recent Updates (October 30, 2025)

### Completed Features ✅
1. **Full-Screen UI Redesign**
   - 100vh layout for maximum workspace
   - Collapsible template sidebar for more viewing space
   - Templates/Drawings main view tabs in header
   - Compact header design

2. **Template Management Enhancements**
   - Delete template functionality with confirmation
   - Delete button appears on hover over template items
   - Automatic cleanup of template + mapping files

3. **Visual Area Selection System**
   - Drag rectangles on PDF to define field boundaries (width × height)
   - Grid snapping (5-50px) for uniform field sizing
   - Manual position/size inputs (x, y, width, height) with precision controls
   - Real-time visual overlay showing field areas
   - Fixed coordinate system alignment (baseline positioning)

4. **Enhanced Font System**
   - Bold + Italic font combinations with proper StandardFonts mapping
   - Legacy compatibility for existing templates
   - Font families: Helvetica, Times-Roman, Courier (with bold/italic variants)
   - Text color picker and alignment controls

5. **PDF Preview System**
   - In-browser PDF preview before download
   - Cache-control headers for instant updates
   - Download button for final PDFs

6. **Drawing Management System** (NEW)
   - Upload drawings: PDF, PNG, JPG, GIF, SVG
   - List all drawings with type badges
   - Delete drawings with confirmation
   - Separate API endpoints for drawing management
   - File-based storage in `/drawings/` directory

7. **Conditional Field Logic** (Schema Ready)
   - Type definitions for conditional rendering
   - Operators: equals, not_equals, contains, not_contains
   - Backend ready, UI implementation pending

### In Progress 🚧
1. **Drawing Field Mapping**
   - Reuse PDFMapper component for drawings
   - Store field mappings per drawing in `/drawings_mappings/`
   - API endpoints ready, UI integration needed

2. **Drawing Placement Areas in Templates**
   - Define rectangular areas where drawings will be placed
   - Support multiple drawings per template
   - Drag-to-define placement zones in templates
   - Store configuration in template mapping

3. **PDF Compositing Engine**
   - Load drawing files (PDF, images)
   - Apply field mappings to drawings
   - Composite drawings into template at defined positions
   - Support multiple drawings with proper layering

### Pending Features 📋
1. **Conditional Field UI**
   - Add condition builder to field mapping interface
   - Show/hide fields based on data values
   - Visual indication of conditional fields

2. **Multi-Drawing Template Support**
   - UI for managing multiple drawing placements
   - Drawing slot naming (e.g., "Front View", "Side View")
   - Preview all drawing placements simultaneously

## Project Architecture

### Backend (TypeScript + Express)
- **src/server.ts** - Express API server with CORS enabled
- **src/pdfService.ts** - PDF manipulation and compositing service
- **src/types.ts** - TypeScript type definitions (expanded for drawings)

### Frontend (React + Vite)
- **client/src/App.tsx** - Main app with Templates/Drawings views
- **client/src/components/PDFMapper.tsx** - Visual template field mapper
- **client/src/components/DrawingManager.tsx** - Drawing upload and management
- **client/src/components/TemplateList.tsx** - Template sidebar with delete
- **client/src/components/TestGenerator.tsx** - PDF generation tester

### File Structure
```
/templates/           - PDF template files
/mappings/            - JSON mapping files (template field positions)
/drawings/            - Drawing files (PDF, PNG, JPG, SVG)
/drawings_mappings/   - JSON mapping files (drawing field positions)
/output/              - Temporary generated PDFs (optional)
/dist/                - Compiled backend code
/client/build/        - Built React frontend
```

## API Endpoints

### Template Management
- `GET /api/templates` - List all templates
- `GET /api/templates/:name` - Download specific template
- `POST /api/templates/upload` - Upload new template (multipart/form-data)
- `DELETE /api/templates/:name` - Delete template and its mapping
- `GET /api/mappings/:name` - Get field mapping for template
- `POST /api/mappings/:name` - Save field mapping for template

### Drawing Management (NEW)
- `GET /api/drawings` - List all drawings with type info
- `GET /api/drawings/:name` - Download specific drawing
- `POST /api/drawings/upload` - Upload new drawing (multipart/form-data)
- `DELETE /api/drawings/:name` - Delete drawing and its mapping
- `GET /api/drawing-mappings/:name` - Get field mapping for drawing
- `POST /api/drawing-mappings/:name` - Save field mapping for drawing

### PDF Generation
- `POST /api/generate` - Generate filled PDF from template + data + drawings

## Type Definitions

### FieldMapping (Enhanced)
```typescript
interface FieldMapping {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  fontFamily?: string;
  maxWidth?: number;
  maxHeight?: number;
  bold?: boolean;
  italic?: boolean;
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains';
    value: string;
  };
}
```

### DrawingPlacementArea
```typescript
interface DrawingPlacementArea {
  drawingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### GenerateRequest (Enhanced)
```typescript
interface GenerateRequest {
  template: string;
  data: { [key: string]: string };
  drawings?: {
    drawing: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: { [key: string]: string };
  }[];
}
```

## Mapping JSON Format

### Template Mapping (with conditional fields)
```json
{
  "customer_name": {
    "x": 100,
    "y": 200,
    "size": 14,
    "align": "left",
    "fontFamily": "Helvetica",
    "bold": true,
    "maxWidth": 300,
    "maxHeight": 20
  },
  "special_note": {
    "x": 100,
    "y": 250,
    "size": 12,
    "condition": {
      "field": "has_note",
      "operator": "equals",
      "value": "yes"
    }
  }
}
```

### Drawing Info Response
```json
{
  "name": "front_view.pdf",
  "type": "pdf",
  "hasMapping": true
}
```

## Technical Drawing Workflow

### 1. Setup Template
1. Upload main template PDF (title block, borders, approval fields)
2. Map template fields: date, author, customer, description, etc.
3. Save template mapping

### 2. Setup Drawings
1. Upload technical drawings (PDF/images)
2. Map drawing-specific fields (dimensions, part numbers, notes)
3. Save drawing mappings

### 3. Define Drawing Placements (In Progress)
1. Select template
2. Define rectangular areas for drawings
3. Assign drawing names to each area
4. Support multiple drawings (front view, side view, etc.)

### 4. Generate PDFs
```javascript
POST /api/generate
{
  "template": "Customer_Drawing_Template.pdf",
  "data": {
    "date": "2025-10-30",
    "author": "John Doe",
    "customer": "Acme Corp",
    "description": "Widget Assembly"
  },
  "drawings": [
    {
      "drawing": "front_view.pdf",
      "x": 50,
      "y": 200,
      "width": 400,
      "height": 300,
      "data": {
        "dimension_a": "100mm",
        "dimension_b": "50mm"
      }
    }
  ]
}
```

## Features

### ✅ Completed
- Full-screen visual field mapper with drag-to-define areas
- Template upload and management
- Template deletion
- Field mapping with visual overlay
- Grid snapping for uniform sizing
- Manual position/size inputs
- Font customization (family, size, bold, italic, color)
- Text alignment (left, center, right)
- Text wrapping and clipping within defined areas
- PDF preview in browser
- Drawing upload and management
- Drawing deletion
- File-based storage (no database)
- CORS enabled API
- Type-safe TypeScript implementation
- Collapsible sidebar for maximum workspace

### 🚧 In Progress
- Drawing field mapping UI
- Drawing placement area definition in templates
- PDF compositing with drawings
- Multiple drawings per template

### 📋 Planned
- Conditional field rendering UI
- Drawing preview in placement areas
- Template + drawing preview mode
- Batch PDF generation

## Development

### Install Dependencies
```bash
npm install
cd client && npm install
```

### Build
```bash
npm run build           # Build backend
cd client && npm run build  # Build frontend
```

### Run Development Server
```bash
npm run dev
```

Server runs on http://0.0.0.0:5000
- Admin interface: http://0.0.0.0:5000
- API: http://0.0.0.0:5000/api/generate

## User Workflow

### Template Mode
1. Click Templates tab
2. Upload or select template
3. Use Field Mapper to drag-define field areas
4. Configure text styling (font, size, color, alignment)
5. Save mapping
6. Test with Test Generator

### Drawings Mode
1. Click Drawings tab
2. Upload technical drawings (PDF, PNG, JPG, SVG)
3. Select drawing to map fields (Coming soon)
4. Define drawing-specific field mappings

### Integration (Coming soon)
1. Define drawing placement areas in template
2. Generate composite PDFs via API
3. Single JSON payload with template data + drawing data

## Technical Details

- **Backend**: Node.js 20+, Express, TypeScript
- **PDF Library**: pdf-lib (pure JS, no dependencies)
- **Frontend**: React 18, Vite, PDF.js
- **File Management**: fs-extra
- **Upload Handling**: Multer
- **Coordinate System**: PDF points (72 points = 1 inch), Y-axis flipped

## Security

- Path traversal protection with filename sanitization
- Allowed file types validation
- CORS configuration for production deployment
- No secret exposure in client code

## Design Decisions

### File-Based Storage
- No database dependency for simplicity
- Easy backup and version control
- Direct file manipulation
- Suitable for moderate volume (hundreds of templates)

### Coordinate Storage
- Stored as top-edge Y for UI consistency
- Converted to baseline Y for PDF rendering
- Automatic height calculation for text baseline

### Font System
- Base families with bold/italic flags
- Backend handles all font variant combinations
- Supports legacy templates with direct font names

## Next Steps

1. **Complete Drawing Integration**
   - Implement drawing field mapper UI (reuse PDFMapper)
   - Add drawing placement area definition in templates
   - Build PDF compositing logic

2. **Enhanced Features**
   - Conditional field rendering UI
   - Multi-drawing template support
   - Drawing preview in placements

3. **Production Readiness**
   - Error handling improvements
   - Validation enhancements
   - Performance optimization for large files
   - Deployment configuration
