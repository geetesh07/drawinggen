import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFMapper.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FieldMapping {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
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
  const [fontSize, setFontSize] = useState(10);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadMapping();
    loadPDF();
  }, [templateName]);

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
      if (!canvas) return;

      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!newFieldName.trim()) {
      alert('Please enter a field name first');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const actualX = Math.round(x / 1.5);
    const actualY = Math.round(y / 1.5);

    setMapping({
      ...mapping,
      [newFieldName]: {
        x: actualX,
        y: actualY,
        size: fontSize,
        align: alignment,
      },
    });

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
        <p className="instruction">
          Click on the PDF where you want to place the field
        </p>
      </div>

      <div className="mapper-content">
        <div className="pdf-viewer">
          <canvas ref={canvasRef} onClick={handleCanvasClick} />
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
                      x: {field.x}, y: {field.y}, size: {field.size}, align: {field.align || 'left'}
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
