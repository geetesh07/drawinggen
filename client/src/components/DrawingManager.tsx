import { useState, useEffect, useRef } from 'react';
import './DrawingManager.css';

interface Drawing {
  name: string;
  type: 'pdf' | 'image' | 'svg';
  hasMapping: boolean;
}

interface Props {
  onSelectDrawing?: (name: string) => void;
}

function DrawingManager({ onSelectDrawing }: Props) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDrawings = async () => {
    try {
      const response = await fetch('/api/drawings');
      const data = await response.json();
      setDrawings(data);
    } catch (error) {
      console.error('Failed to load drawings:', error);
    }
  };

  useEffect(() => {
    loadDrawings();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PDF, PNG, JPG, GIF, or SVG file');
      return;
    }

    const formData = new FormData();
    formData.append('drawing', file);

    try {
      await fetch('/api/drawings/upload', {
        method: 'POST',
        body: formData,
      });
      await loadDrawings();
      alert('Drawing uploaded successfully!');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload drawing');
    }
  };

  const handleDelete = async (e: React.MouseEvent, drawingName: string) => {
    e.stopPropagation();
    
    if (!confirm(`Delete drawing "${drawingName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await fetch(`/api/drawings/${drawingName}`, {
        method: 'DELETE',
      });
      
      if (selectedDrawing === drawingName) {
        setSelectedDrawing(null);
      }
      
      await loadDrawings();
      alert('Drawing deleted successfully!');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete drawing');
    }
  };

  const handleSelect = (name: string) => {
    setSelectedDrawing(name);
    if (onSelectDrawing) {
      onSelectDrawing(name);
    }
  };

  return (
    <div className="drawing-manager">
      <div className="drawing-header">
        <h2>Drawings</h2>
        <p className="drawing-subtitle">Upload and manage technical drawings for templates</p>
        <button
          className="upload-drawing-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          + Upload Drawing
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.svg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="drawing-grid">
        {drawings.length === 0 ? (
          <div className="no-drawings">
            <p>No drawings yet</p>
            <p className="hint">Upload PDF, PNG, JPG, GIF, or SVG files</p>
          </div>
        ) : (
          drawings.map((drawing) => (
            <div
              key={drawing.name}
              className={`drawing-card ${selectedDrawing === drawing.name ? 'selected' : ''}`}
              onClick={() => handleSelect(drawing.name)}
            >
              <div className="drawing-preview">
                {drawing.type === 'pdf' && <span className="drawing-icon">📄</span>}
                {drawing.type === 'image' && <span className="drawing-icon">🖼️</span>}
                {drawing.type === 'svg' && <span className="drawing-icon">🎨</span>}
              </div>
              <div className="drawing-info">
                <div className="drawing-name">{drawing.name}</div>
                <div className="drawing-type">
                  {drawing.type.toUpperCase()}
                </div>
                {drawing.hasMapping && (
                  <span className="drawing-mapped-badge">Mapped</span>
                )}
              </div>
              <button
                className="delete-drawing-btn"
                onClick={(e) => handleDelete(e, drawing.name)}
                title="Delete drawing"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DrawingManager;
