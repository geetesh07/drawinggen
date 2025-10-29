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
  bold?: boolean;
  italic?: boolean;
}

interface TemplateMapping {
  [fieldName: string]: FieldMapping;
}

interface Props {
  templateName: string;
  onMappingSaved: () => void;
}

function PDFMapper({ templateName, onMappingSaved }: Props) {
  const [mapping, setMapping] = useState<TemplateMapping>({});
  const [newFieldName, setNewFieldName] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [textColor, setTextColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [maxWidth, setMaxWidth] = useState(200);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [zoom, setZoom] = useState(2.0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadMapping();
    loadPDF();
  }, [templateName]);

  useEffect(() => {
    loadPDF();
  }, [zoom]);

  useEffect(() => {
    drawFieldBoxes();
  }, [mapping, zoom]);

  const loadMapping = async () => {
    try {
      const response = await fetch(`/api/mappings/${templateName}`);
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
    const url = `/api/templates/${templateName}`;

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
      const y = field.y * zoom;
      const boxWidth = (field.maxWidth || 200) * zoom;
      const boxHeight = (field.size + 4) * zoom;

      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y - boxHeight + 4, boxWidth, boxHeight);

      ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
      ctx.fillRect(x, y - boxHeight + 4, boxWidth, boxHeight);

      ctx.fillStyle = '#667eea';
      ctx.font = 'bold 12px Arial';
      ctx.setLineDash([]);
      ctx.fillText(fieldName, x, y - boxHeight - 5);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!newFieldName.trim()) {
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

    const actualX = Math.round(canvasX / zoom);
    const actualY = Math.round(canvasY / zoom);

    const newMapping = {
      ...mapping,
      [newFieldName]: {
        x: actualX,
        y: actualY,
        size: fontSize,
        align: alignment,
        color: textColor,
        fontFamily: fontFamily,
        maxWidth: maxWidth,
        bold: bold,
        italic: italic,
      },
    };

    setMapping(newMapping);
    setNewFieldName('');
  };

  const handleSaveMapping = async () => {
    try {
      const response = await fetch(`/api/mappings/${templateName}`, {
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
  };

  return (
    <div className="pdf-mapper">
      <div className="mapper-controls">
        <h3>Add Field Mapping</h3>
        
        <div className="control-group">
          <label>Field Name:</label>
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="e.g., customer_name"
          />
        </div>

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
            <label>Max Width:</label>
            <input
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              min="50"
              max="1000"
            />
          </div>
        </div>

        <div className="control-row">
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

        <div className="control-row">
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

        <p className="instruction">
          Click on the PDF to place the field. Boxes show field boundaries.
        </p>
      </div>

      <div className="mapper-content">
        <div className="pdf-viewer">
          <div className="zoom-controls">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>🔍-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(4, zoom + 0.25))}>🔍+</button>
            <button onClick={() => setZoom(1.0)}>Reset</button>
          </div>
          <div className="pdf-container">
            <canvas ref={canvasRef} style={{ position: 'absolute' }} />
            <canvas 
              ref={overlayCanvasRef} 
              onClick={handleCanvasClick}
              style={{ position: 'absolute', cursor: 'crosshair' }}
            />
          </div>
        </div>

        <div className="fields-list">
          <div className="fields-header">
            <h3>Mapped Fields ({Object.keys(mapping).length})</h3>
            <button className="save-btn" onClick={handleSaveMapping}>
              💾 Save Mapping
            </button>
          </div>
          {Object.keys(mapping).length === 0 ? (
            <div className="no-fields">
              <p>No fields mapped yet</p>
              <p className="hint">Click on the PDF to add fields</p>
            </div>
          ) : (
            <div className="fields-items">
              {Object.entries(mapping).map(([fieldName, field]) => (
                <div key={fieldName} className="field-item">
                  <div className="field-info">
                    <div className="field-name">{fieldName}</div>
                    <div className="field-details">
                      x: {field.x}, y: {field.y}
                      <br />
                      size: {field.size}, width: {field.maxWidth || 200}
                      <br />
                      {field.fontFamily || 'Helvetica'}, {field.color || '#000000'}
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteField(fieldName)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PDFMapper;
