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
  rotation?: number;
  conditionField?: string;
  conditionOperator?: 'equals' | 'not_equals';
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
  const [isDrawingNew, setIsDrawingNew] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [drawingPreviews, setDrawingPreviews] = useState<{ [name: string]: HTMLImageElement | HTMLCanvasElement }>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPDF();
  }, [templateName, zoom]);

  useEffect(() => {
    drawPlacements();
  }, [placements, zoom, selectedIndex, drawingPreviews, currentRect]);

  useEffect(() => {
    loadDrawingPreviews();
  }, [placements]);

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

  const loadDrawingPreviews = async () => {
    const newPreviews: { [name: string]: HTMLImageElement | HTMLCanvasElement } = { ...drawingPreviews };
    
    for (const placement of placements) {
      if (!newPreviews[placement.drawingName]) {
        try {
          const drawingFile = drawings.find(d => d === placement.drawingName);
          if (!drawingFile) continue;

          if (drawingFile.toLowerCase().endsWith('.pdf')) {
            const pdf = await pdfjsLib.getDocument(`/api/drawings/${drawingFile}`).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              await page.render({ canvasContext: tempCtx, viewport }).promise;
              newPreviews[placement.drawingName] = tempCanvas;
            }
          } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = `/api/drawings/${drawingFile}`;
            });
            newPreviews[placement.drawingName] = img;
          }
        } catch (error) {
          console.error(`Failed to load preview for ${placement.drawingName}:`, error);
        }
      }
    }
    
    setDrawingPreviews(newPreviews);
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
      const rotation = placement.rotation || 0;

      const isSelected = index === selectedIndex;

      ctx.save();
      
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      const preview = drawingPreviews[placement.drawingName];
      if (preview) {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(preview, x, y, width, height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = isSelected ? 'rgba(102, 126, 234, 0.2)' : 'rgba(40, 167, 69, 0.15)';
        ctx.fillRect(x, y, width, height);
      }

      ctx.strokeStyle = isSelected ? '#667eea' : '#28a745';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);

      ctx.restore();

      ctx.fillStyle = isSelected ? '#667eea' : '#28a745';
      ctx.font = `bold ${14}px Arial`;
      const label = `${index + 1}. ${placement.drawingName}${rotation ? ` (${rotation}°)` : ''}`;
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

    if (currentRect) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      return;
    }
    
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const mouseX = canvasX / zoom;
    const mouseY = canvasY / zoom;

    if (isDrawingNew) {
      setDragStart({ x: canvasX, y: canvasY });
      setCurrentRect({ x: canvasX, y: canvasY, width: 0, height: 0 });
      return;
    }

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
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const mouseX = canvasX / zoom;
    const mouseY = canvasY / zoom;

    if (isDrawingNew && dragStart) {
      const width = canvasX - dragStart.x;
      const height = canvasY - dragStart.y;
      setCurrentRect({
        x: width < 0 ? canvasX : dragStart.x,
        y: height < 0 ? canvasY : dragStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
      return;
    }

    if (!isDragging && !isResizing) return;
    if (selectedIndex === null || !dragStart) return;

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
    if (isDrawingNew && currentRect && dragStart) {
      if (drawings.length === 0) {
        alert('No drawings available. Please upload drawings first.');
        setCurrentRect(null);
        setDragStart(null);
        return;
      }

      const actualX = Math.round(currentRect.x / zoom);
      const actualY = Math.round(currentRect.y / zoom);
      const actualWidth = Math.round(currentRect.width / zoom);
      const actualHeight = Math.round(currentRect.height / zoom);

      if (actualWidth < 50 || actualHeight < 50) {
        alert('Area too small. Please draw a larger selection area (minimum 50x50).');
      } else {
        const newPlacement: DrawingPlacement = {
          drawingName: drawings[0],
          x: actualX,
          y: actualY,
          width: actualWidth,
          height: actualHeight,
        };
        onPlacementsChange([...placements, newPlacement]);
        setSelectedIndex(placements.length);
      }
      
      setCurrentRect(null);
      setDragStart(null);
    }

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

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || !containerRef.current) return;
    
    if (e.button === 1) {
      const container = containerRef.current;
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop
      });
      e.preventDefault();
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart || !containerRef.current) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    
    containerRef.current.scrollLeft = panStart.scrollLeft - dx;
    containerRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleContainerMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  return (
    <div className="visual-placement-editor">
      <div className="editor-main-area">
        <div className="placement-toolbar">
          <div className="toolbar-left">
            <button 
              className={`toolbar-btn ${isDrawingNew ? 'active' : ''}`}
              onClick={() => {
                setIsDrawingNew(!isDrawingNew);
                setSelectedIndex(null);
              }}
              style={{ backgroundColor: isDrawingNew ? '#10b981' : undefined }}
            >
              {isDrawingNew ? '✓ Draw Mode' : '✏️ Draw Mode'}
            </button>
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

        <div 
          ref={containerRef}
          className={`canvas-container ${isPanning ? 'panning' : ''}`}
          onMouseDown={handleContainerMouseDown}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseUp}
        >
          <div className="canvas-wrapper">
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
        </div>

        <div className="placement-help">
          <p>💡 <strong>Tip:</strong> {isDrawingNew ? 'Drag on PDF to draw new placement area' : 'Click and drag to position drawings. Use corner handle to resize. Middle-click to pan'}</p>
        </div>
      </div>

      <div className="placement-properties">
        <div className="properties-content">
          {selectedIndex !== null ? (
            <>
              <h4>Drawing {selectedIndex + 1}: {placements[selectedIndex].drawingName}</h4>
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
                  <label>X Position:</label>
                  <input
                    type="number"
                    value={Math.round(placements[selectedIndex].x)}
                    onChange={(e) => handleUpdateSelectedPlacement('x', parseFloat(e.target.value))}
                  />
                </div>
                <div className="prop-field">
                  <label>Y Position:</label>
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
                <div className="prop-field">
                  <label>Rotation (degrees):</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step="1"
                    placeholder="0"
                    value={placements[selectedIndex].rotation || 0}
                    onChange={(e) => handleUpdateSelectedPlacement('rotation', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="conditional-section">
                <h5>Conditional Rendering (Optional)</h5>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem', lineHeight: 1.4 }}>
                  Show this drawing only when a specific field matches or doesn't match a value.
                </p>
                <div className="prop-field">
                  <label>Field Name:</label>
                  <input
                    type="text"
                    placeholder="e.g., type"
                    value={placements[selectedIndex].conditionField || ''}
                    onChange={(e) => handleUpdateSelectedPlacement('conditionField', e.target.value)}
                  />
                </div>
                <div className="prop-field">
                  <label>Operator:</label>
                  <select
                    value={placements[selectedIndex].conditionOperator || 'equals'}
                    onChange={(e) => handleUpdateSelectedPlacement('conditionOperator', e.target.value)}
                  >
                    <option value="equals">Equals (=)</option>
                    <option value="not_equals">Not Equals (≠)</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label>Value:</label>
                  <input
                    type="text"
                    placeholder="e.g., TC"
                    value={placements[selectedIndex].conditionValue || ''}
                    onChange={(e) => handleUpdateSelectedPlacement('conditionValue', e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection-message">
              <div className="icon">👈</div>
              <p><strong>No Drawing Selected</strong></p>
              <p>Click on a drawing in the PDF to edit its properties</p>
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#bbb' }}>or click "Add Drawing" to create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VisualPlacementEditor;
