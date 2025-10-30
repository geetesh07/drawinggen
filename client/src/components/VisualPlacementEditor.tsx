import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './VisualPlacementEditor.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DrawingPlacement {
  drawingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  conditionField?: string;
  conditionValue?: string;
}

interface Props {
  templateName: string;
  placements: DrawingPlacement[];
  onPlacementsChange: (placements: DrawingPlacement[]) => void;
  drawings: string[];
}

function VisualPlacementEditor({ templateName, placements, onPlacementsChange, drawings }: Props) {
  const [zoom, setZoom] = useState(1.0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadPDF();
  }, [templateName, zoom]);

  useEffect(() => {
    drawPlacements();
  }, [placements, zoom, selectedIndex]);

  const loadPDF = async () => {
    if (!canvasRef.current) return;

    try {
      const pdf = await pdfjsLib.getDocument(`/api/templates/${templateName}`).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = viewport.width;
        overlayCanvasRef.current.height = viewport.height;
      }

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      drawPlacements();
    } catch (error) {
      console.error('Failed to load PDF:', error);
    }
  };

  const drawPlacements = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    placements.forEach((placement, index) => {
      const x = placement.x * zoom;
      const y = placement.y * zoom;
      const width = placement.width * zoom;
      const height = placement.height * zoom;

      const isSelected = index === selectedIndex;

      ctx.fillStyle = isSelected ? 'rgba(102, 126, 234, 0.2)' : 'rgba(40, 167, 69, 0.15)';
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = isSelected ? '#667eea' : '#28a745';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [5, 5]);
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = isSelected ? '#667eea' : '#28a745';
      ctx.font = `bold ${14}px Arial`;
      const label = `${index + 1}. ${placement.drawingName}`;
      const textMetrics = ctx.measureText(label);
      
      ctx.fillRect(x, y - 25, textMetrics.width + 16, 25);
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 8, y - 7);

      if (isSelected) {
        const handleSize = 8;
        ctx.fillStyle = '#667eea';
        ctx.fillRect(x + width - handleSize, y + height - handleSize, handleSize, handleSize);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + width - handleSize, y + height - handleSize, handleSize, handleSize);
      }
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      
      const handleSize = 8 / zoom;
      if (
        mouseX >= p.x + p.width - handleSize &&
        mouseX <= p.x + p.width &&
        mouseY >= p.y + p.height - handleSize &&
        mouseY <= p.y + p.height
      ) {
        setSelectedIndex(i);
        setIsResizing(true);
        setDragStart({ x: mouseX, y: mouseY });
        return;
      }

      if (
        mouseX >= p.x &&
        mouseX <= p.x + p.width &&
        mouseY >= p.y &&
        mouseY <= p.y + p.height
      ) {
        setSelectedIndex(i);
        setIsDragging(true);
        setDragStart({ x: mouseX - p.x, y: mouseY - p.y });
        return;
      }
    }

    setSelectedIndex(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && !isResizing) return;
    if (selectedIndex === null || !dragStart) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    const newPlacements = [...placements];
    const placement = newPlacements[selectedIndex];

    if (isDragging) {
      placement.x = Math.max(0, mouseX - dragStart.x);
      placement.y = Math.max(0, mouseY - dragStart.y);
    } else if (isResizing) {
      placement.width = Math.max(50, mouseX - placement.x);
      placement.height = Math.max(50, mouseY - placement.y);
    }

    onPlacementsChange(newPlacements);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStart(null);
  };

  const handleAddPlacement = () => {
    if (drawings.length === 0) {
      alert('No drawings available. Please upload drawings first.');
      return;
    }

    const newPlacement: DrawingPlacement = {
      drawingName: drawings[0],
      x: 50,
      y: 50,
      width: 300,
      height: 200
    };

    onPlacementsChange([...placements, newPlacement]);
    setSelectedIndex(placements.length);
  };

  const handleRemovePlacement = () => {
    if (selectedIndex === null) return;

    const newPlacements = placements.filter((_, i) => i !== selectedIndex);
    onPlacementsChange(newPlacements);
    setSelectedIndex(null);
  };

  const handleUpdateSelectedPlacement = (field: keyof DrawingPlacement, value: string | number) => {
    if (selectedIndex === null) return;

    const newPlacements = [...placements];
    newPlacements[selectedIndex] = {
      ...newPlacements[selectedIndex],
      [field]: value
    };

    onPlacementsChange(newPlacements);
  };

  return (
    <div className="visual-placement-editor">
      <div className="placement-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={handleAddPlacement}>
            ➕ Add Drawing
          </button>
          {selectedIndex !== null && (
            <button className="toolbar-btn danger" onClick={handleRemovePlacement}>
              🗑️ Remove Selected
            </button>
          )}
        </div>
        
        <div className="zoom-controls">
          <label>Zoom:</label>
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(2, zoom + 0.1))}>+</button>
        </div>
      </div>

      {selectedIndex !== null && (
        <div className="placement-properties">
          <h4>Selected: {placements[selectedIndex].drawingName}</h4>
          <div className="properties-grid">
            <div className="prop-field">
              <label>Drawing:</label>
              <select
                value={placements[selectedIndex].drawingName}
                onChange={(e) => handleUpdateSelectedPlacement('drawingName', e.target.value)}
              >
                {drawings.map((drawing) => (
                  <option key={drawing} value={drawing}>{drawing}</option>
                ))}
              </select>
            </div>
            <div className="prop-field">
              <label>X:</label>
              <input
                type="number"
                value={Math.round(placements[selectedIndex].x)}
                onChange={(e) => handleUpdateSelectedPlacement('x', parseFloat(e.target.value))}
              />
            </div>
            <div className="prop-field">
              <label>Y:</label>
              <input
                type="number"
                value={Math.round(placements[selectedIndex].y)}
                onChange={(e) => handleUpdateSelectedPlacement('y', parseFloat(e.target.value))}
              />
            </div>
            <div className="prop-field">
              <label>Width:</label>
              <input
                type="number"
                value={Math.round(placements[selectedIndex].width)}
                onChange={(e) => handleUpdateSelectedPlacement('width', parseFloat(e.target.value))}
              />
            </div>
            <div className="prop-field">
              <label>Height:</label>
              <input
                type="number"
                value={Math.round(placements[selectedIndex].height)}
                onChange={(e) => handleUpdateSelectedPlacement('height', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#666' }}>Conditional Rendering (Optional)</h4>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' }}>
              Show this drawing only when a specific field has a value. Leave empty to always show.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="prop-field">
                <label>Field Name:</label>
                <input
                  type="text"
                  placeholder="e.g., show_detail"
                  value={placements[selectedIndex].conditionField || ''}
                  onChange={(e) => handleUpdateSelectedPlacement('conditionField', e.target.value)}
                />
              </div>
              <div className="prop-field">
                <label>Required Value:</label>
                <input
                  type="text"
                  placeholder="e.g., yes"
                  value={placements[selectedIndex].conditionValue || ''}
                  onChange={(e) => handleUpdateSelectedPlacement('conditionValue', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="canvas-container">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <canvas
          ref={overlayCanvasRef}
          className="overlay-canvas"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
      </div>

      <div className="placement-help">
        <p>💡 <strong>Tip:</strong> Click and drag rectangles to position drawings. Drag the handle in the bottom-right corner to resize.</p>
      </div>
    </div>
  );
}

export default VisualPlacementEditor;
