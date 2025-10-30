import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFMapper.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
}

interface TemplateMapping {
  [fieldName: string]: FieldMapping;
}

interface Props {
  templateName: string;
  onMappingSaved: () => void;
  isDrawing?: boolean;
}

function PDFMapper({ templateName, onMappingSaved, isDrawing = false }: Props) {
  const [mapping, setMapping] = useState<TemplateMapping>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [textColor, setTextColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [manualX, setManualX] = useState(0);
  const [manualY, setManualY] = useState(0);
  const [manualWidth, setManualWidth] = useState(200);
  const [manualHeight, setManualHeight] = useState(40);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMapping({});
    setEditingField(null);
    setNewFieldName('');
    setCurrentRect(null);
    setIsDrawingRect(false);
    setStartPos(null);
    loadMapping();
    loadPDF();
  }, [templateName]);

  useEffect(() => {
    loadPDF();
  }, [zoom]);

  useEffect(() => {
    drawFieldBoxes();
  }, [mapping, zoom, currentRect]);

  const loadMapping = async () => {
    try {
      const endpoint = isDrawing ? `/api/drawing-mappings/${templateName}` : `/api/mappings/${templateName}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setMapping(data);
      } else {
        setMapping({});
      }
    } catch (error) {
      setMapping({});
    }
  };

  const loadPDF = async () => {
    const url = isDrawing ? `/api/drawings/${templateName}` : `/api/templates/${templateName}`;

    try {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const canvas = canvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!canvas || !overlayCanvas) return;

      const viewport = page.getViewport({ scale: zoom });
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
      overlayCanvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      drawFieldBoxes();
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const drawFieldBoxes = () => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    Object.entries(mapping).forEach(([fieldName, field]) => {
      const x = field.x * zoom;
      const topY = field.y * zoom;
      const boxWidth = (field.maxWidth || 200) * zoom;
      const boxHeight = (field.maxHeight || field.size + 4) * zoom;
      const baselineY = topY + (field.size * zoom);

      const isEditing = editingField === fieldName;

      ctx.strokeStyle = isEditing ? '#f59e0b' : '#667eea';
      ctx.lineWidth = isEditing ? 3 : 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, topY, boxWidth, boxHeight);

      ctx.fillStyle = isEditing ? 'rgba(245, 158, 11, 0.15)' : 'rgba(102, 126, 234, 0.1)';
      ctx.fillRect(x, topY, boxWidth, boxHeight);

      ctx.fillStyle = isEditing ? '#f59e0b' : '#667eea';
      ctx.font = 'bold 12px Arial';
      ctx.setLineDash([]);
      ctx.fillText(fieldName, x, topY - 5);

      ctx.beginPath();
      ctx.arc(x, baselineY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = isEditing ? '#f59e0b' : '#ff4444';
      ctx.fill();
    });

    if (currentRect) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!newFieldName.trim() && !editingField) {
      alert('Please enter a field name first');
      return;
    }

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setIsDrawingRect(true);
    setStartPos({ x: canvasX, y: canvasY });
    setCurrentRect({ x: canvasX, y: canvasY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRect || !startPos) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const width = canvasX - startPos.x;
    const height = canvasY - startPos.y;

    setCurrentRect({
      x: width < 0 ? canvasX : startPos.x,
      y: height < 0 ? canvasY : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });

    drawFieldBoxes();
  };

  const snapToGridValue = (value: number): number => {
    if (!snapToGrid) return Math.round(value);
    return Math.round(value / gridSize) * gridSize;
  };

  const handleMouseUp = () => {
    if (!isDrawingRect || !currentRect || !startPos) return;

    let actualX = Math.round(currentRect.x / zoom);
    let actualY = Math.round(currentRect.y / zoom);
    let actualWidth = Math.round(currentRect.width / zoom);
    let actualHeight = Math.round(currentRect.height / zoom);

    if (snapToGrid) {
      actualX = snapToGridValue(actualX);
      actualY = snapToGridValue(actualY);
      actualWidth = snapToGridValue(actualWidth);
      actualHeight = snapToGridValue(actualHeight);
    }

    if (actualWidth < 10 || actualHeight < 5) {
      alert('Area too small. Please draw a larger selection area.');
      setIsDrawingRect(false);
      setStartPos(null);
      setCurrentRect(null);
      drawFieldBoxes();
      return;
    }

    setManualX(actualX);
    setManualY(actualY);
    setManualWidth(actualWidth);
    setManualHeight(actualHeight);

    applyFieldMapping(actualX, actualY, actualWidth, actualHeight);
  };

  const applyFieldMapping = (x: number, y: number, width: number, height: number) => {
    const targetFieldName = editingField || newFieldName;
    
    if (!targetFieldName.trim()) {
      alert('Please enter a field name first');
      return;
    }

    const newMapping = {
      ...mapping,
      [targetFieldName]: {
        x: x,
        y: y,
        size: fontSize,
        align: alignment,
        color: textColor,
        fontFamily: fontFamily,
        maxWidth: width,
        maxHeight: height,
        bold: bold,
        italic: italic,
      },
    };

    setMapping(newMapping);
    if (!editingField) {
      setNewFieldName('');
    }
    setEditingField(null);
    setIsDrawingRect(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  const handleManualApply = () => {
    const x = snapToGridValue(manualX);
    const y = snapToGridValue(manualY);
    const width = snapToGridValue(manualWidth);
    const height = snapToGridValue(manualHeight);

    applyFieldMapping(x, y, width, height);
  };

  const handleSaveMapping = async () => {
    try {
      const endpoint = isDrawing ? `/api/drawing-mappings/${templateName}` : `/api/mappings/${templateName}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });

      if (response.ok) {
        alert('Mapping saved successfully!');
        onMappingSaved();
      } else {
        alert('Failed to save mapping');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save mapping');
    }
  };

  const handleDeleteField = (fieldName: string) => {
    const newMapping = { ...mapping };
    delete newMapping[fieldName];
    setMapping(newMapping);
    if (editingField === fieldName) {
      setEditingField(null);
    }
  };

  const handleEditField = (fieldName: string) => {
    const field = mapping[fieldName];
    setEditingField(fieldName);
    setFontSize(field.size);
    setAlignment(field.align || 'left');
    setTextColor(field.color || '#000000');
    setFontFamily(field.fontFamily || 'Helvetica');
    setBold(field.bold || false);
    setItalic(field.italic || false);
    
    setManualX(field.x);
    setManualY(field.y);
    setManualWidth(field.maxWidth || 200);
    setManualHeight(field.maxHeight || (field.size + 4));
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setFontSize(12);
    setAlignment('left');
    setTextColor('#000000');
    setFontFamily('Helvetica');
    setBold(false);
    setItalic(false);
  };

  return (
    <div className="pdf-mapper">
      <div className="mapper-content">
        <div className="pdf-viewer">
          <div className="zoom-controls">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>🔍-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(4, zoom + 0.25))}>🔍+</button>
            <button onClick={() => setZoom(1.5)}>Reset</button>
          </div>
          <div className="pdf-container">
            <canvas ref={canvasRef} style={{ position: 'absolute' }} />
            <canvas 
              ref={overlayCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                if (isDrawingRect) handleMouseUp();
              }}
              style={{ position: 'absolute', cursor: isDrawingRect ? 'crosshair' : 'crosshair' }}
            />
          </div>
        </div>

        <div className="fields-panel">
          <div className="panel-section">
            <h3>{editingField ? 'Edit Field' : 'Add New Field'}</h3>
            
            {editingField ? (
              <div className="edit-info">
                <strong>Editing: {editingField}</strong>
                <button className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
              </div>
            ) : (
              <div className="control-group">
                <label>Field Name:</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., customer_name"
                />
              </div>
            )}

            <div className="control-row">
              <div className="control-group">
                <label>Font Size:</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min="6"
                  max="72"
                />
              </div>
              <div className="control-group">
                <label>Align:</label>
                <select
                  value={alignment}
                  onChange={(e) => setAlignment(e.target.value as 'left' | 'center' | 'right')}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>Font Family:</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times Roman</option>
                  <option value="Courier">Courier</option>
                </select>
              </div>
            </div>

            <div className="control-group">
              <label>Text Color:</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  style={{ width: '50px', height: '35px' }}
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#000000"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="control-row checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                />
                <span>Bold</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={italic}
                  onChange={(e) => setItalic(e.target.checked)}
                />
                <span>Italic</span>
              </label>
            </div>

            <div className="section-divider">
              <h4>Position & Size</h4>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>X Position:</label>
                <input
                  type="number"
                  value={manualX}
                  onChange={(e) => setManualX(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div className="control-group">
                <label>Y Position:</label>
                <input
                  type="number"
                  value={manualY}
                  onChange={(e) => setManualY(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>Width:</label>
                <input
                  type="number"
                  value={manualWidth}
                  onChange={(e) => setManualWidth(Number(e.target.value))}
                  min="10"
                />
              </div>
              <div className="control-group">
                <label>Height:</label>
                <input
                  type="number"
                  value={manualHeight}
                  onChange={(e) => setManualHeight(Number(e.target.value))}
                  min="5"
                />
              </div>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                  />
                  <span>Snap to Grid</span>
                </label>
              </div>
              <div className="control-group">
                <label>Grid Size:</label>
                <input
                  type="number"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  min="5"
                  max="50"
                  disabled={!snapToGrid}
                />
              </div>
            </div>

            <button className="apply-manual-btn" onClick={handleManualApply}>
              ✓ Apply Position & Size
            </button>

            <div className="instruction">
              {editingField 
                ? '🎯 Drag on PDF or use manual inputs to redefine field area'
                : '🎯 Drag on PDF or use manual inputs to define field area'}
            </div>
          </div>

          <div className="panel-section">
            <div className="fields-header">
              <h3>Mapped Fields ({Object.keys(mapping).length})</h3>
              <button className="save-btn" onClick={handleSaveMapping}>
                💾 Save Mapping
              </button>
            </div>
            {Object.keys(mapping).length === 0 ? (
              <div className="no-fields">
                <p>No fields mapped yet</p>
                <p className="hint">Drag on PDF to add fields</p>
              </div>
            ) : (
              <div className="fields-items">
                {Object.entries(mapping).map(([fieldName, field]) => (
                  <div key={fieldName} className={`field-item ${editingField === fieldName ? 'editing' : ''}`}>
                    <div className="field-info">
                      <div className="field-name">{fieldName}</div>
                      <div className="field-details">
                        x:{field.x}, y:{field.y}, size:{field.size}
                        <br />
                        area: {field.maxWidth || 200}×{field.maxHeight || 20}
                        <br />
                        {field.fontFamily || 'Helvetica'}, {field.color || '#000'}
                      </div>
                    </div>
                    <div className="field-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditField(fieldName)}
                        title="Edit field"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteField(fieldName)}
                        title="Delete field"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PDFMapper;
