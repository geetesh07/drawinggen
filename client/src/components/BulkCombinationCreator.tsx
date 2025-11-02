import { useState, useEffect } from 'react';
import VisualPlacementEditor from './VisualPlacementEditor';
import './BulkCombinationCreator.css';

interface TemplateInfo {
  name: string;
  hasMapping: boolean;
}

interface DrawingInfo {
  name: string;
  type: string;
  hasMapping: boolean;
}

interface DrawingPlacement {
  drawingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

interface BulkCombinationCreatorProps {
  onComplete: () => void;
  onCancel: () => void;
}

function BulkCombinationCreator({ onComplete, onCancel }: BulkCombinationCreatorProps) {
  const [step, setStep] = useState<'template' | 'placement' | 'drawings' | 'review'>('template');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [drawings, setDrawings] = useState<DrawingInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDrawings, setSelectedDrawings] = useState<Set<string>>(new Set());
  const [placementConfig, setPlacementConfig] = useState<DrawingPlacement>({
    drawingName: 'PLACEHOLDER',
    x: 50,
    y: 50,
    width: 200,
    height: 200,
    rotation: 0
  });
  const [namingPattern, setNamingPattern] = useState<'drawing' | 'custom'>('drawing');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTemplates();
    loadDrawings();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadDrawings = async () => {
    try {
      const response = await fetch('/api/drawings');
      const data = await response.json();
      setDrawings(data);
    } catch (error) {
      console.error('Failed to load drawings:', error);
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    setStep('placement');
  };

  const handlePlacementUpdate = (placements: DrawingPlacement[]) => {
    if (placements.length > 0) {
      setPlacementConfig(placements[0]);
    }
  };

  const handleDrawingToggle = (drawingName: string) => {
    const newSelected = new Set(selectedDrawings);
    if (newSelected.has(drawingName)) {
      newSelected.delete(drawingName);
    } else {
      newSelected.add(drawingName);
    }
    setSelectedDrawings(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredDrawings();
    const allSelected = filtered.every(d => selectedDrawings.has(d.name));
    
    if (allSelected) {
      const newSelected = new Set(selectedDrawings);
      filtered.forEach(d => newSelected.delete(d.name));
      setSelectedDrawings(newSelected);
    } else {
      const newSelected = new Set(selectedDrawings);
      filtered.forEach(d => newSelected.add(d.name));
      setSelectedDrawings(newSelected);
    }
  };

  const getFilteredDrawings = () => {
    if (!searchTerm) return drawings;
    return drawings.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const generateCombinationName = (drawingName: string): string => {
    const baseName = drawingName.replace(/\.[^/.]+$/, '');
    return `${prefix}${baseName}${suffix}`;
  };

  const handleBulkCreate = async () => {
    if (selectedDrawings.size === 0) {
      alert('Please select at least one drawing');
      return;
    }

    setIsCreating(true);

    try {
      const combinations = Array.from(selectedDrawings).map(drawingName => ({
        name: generateCombinationName(drawingName),
        templateName: selectedTemplate,
        drawing: drawingName,
        placement: {
          x: placementConfig.x,
          y: placementConfig.y,
          width: placementConfig.width,
          height: placementConfig.height,
          rotation: placementConfig.rotation || 0
        }
      }));

      const response = await fetch('/api/combinations/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combinations })
      });

      if (!response.ok) {
        throw new Error('Failed to create combinations');
      }

      const result = await response.json();
      alert(`Successfully created ${result.created} combination(s)!`);
      onComplete();
    } catch (error) {
      console.error('Bulk create error:', error);
      alert('Failed to create combinations. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDrawings = getFilteredDrawings();
  const allFilteredSelected = filteredDrawings.length > 0 && 
    filteredDrawings.every(d => selectedDrawings.has(d.name));

  return (
    <div className="bulk-creator">
      <div className="bulk-creator-header">
        <h2>Bulk Combination Creator</h2>
        <button onClick={onCancel} className="close-btn">×</button>
      </div>

      <div className="bulk-creator-steps">
        <div className={`step ${step === 'template' ? 'active' : ''}`}>1. Template</div>
        <div className={`step ${step === 'placement' ? 'active' : ''}`}>2. Placement</div>
        <div className={`step ${step === 'drawings' ? 'active' : ''}`}>3. Drawings</div>
        <div className={`step ${step === 'review' ? 'active' : ''}`}>4. Review</div>
      </div>

      <div className="bulk-creator-content">
        {step === 'template' && (
          <div className="step-content">
            <h3>Select Template</h3>
            <p>Choose the base template for all combinations</p>
            <div className="template-grid">
              {templates.map(template => (
                <div
                  key={template.name}
                  className={`template-card ${selectedTemplate === template.name ? 'selected' : ''}`}
                  onClick={() => handleTemplateSelect(template.name)}
                >
                  <div className="template-icon">📄</div>
                  <div className="template-name">{template.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'placement' && (
          <div className="step-content">
            <h3>Define Placement Area</h3>
            <p>Set the position and size for where drawings will appear (same for all)</p>
            <div className="placement-editor-container">
              <VisualPlacementEditor
                templateName={selectedTemplate}
                placements={[placementConfig]}
                onPlacementsChange={handlePlacementUpdate}
                drawings={[]}
              />
            </div>
            <div className="placement-controls">
              <div className="placement-info">
                <label>X: <input type="number" value={placementConfig.x} onChange={e => setPlacementConfig({...placementConfig, x: parseInt(e.target.value) || 0})} /></label>
                <label>Y: <input type="number" value={placementConfig.y} onChange={e => setPlacementConfig({...placementConfig, y: parseInt(e.target.value) || 0})} /></label>
                <label>Width: <input type="number" value={placementConfig.width} onChange={e => setPlacementConfig({...placementConfig, width: parseInt(e.target.value) || 0})} /></label>
                <label>Height: <input type="number" value={placementConfig.height} onChange={e => setPlacementConfig({...placementConfig, height: parseInt(e.target.value) || 0})} /></label>
                <label>Rotation: <input type="number" value={placementConfig.rotation || 0} onChange={e => setPlacementConfig({...placementConfig, rotation: parseInt(e.target.value) || 0})} />°</label>
              </div>
              <button onClick={() => setStep('drawings')} className="next-btn">Next: Select Drawings</button>
            </div>
          </div>
        )}

        {step === 'drawings' && (
          <div className="step-content">
            <h3>Select Drawings</h3>
            <p>Choose which drawings to create combinations for</p>
            
            <div className="drawings-controls">
              <input
                type="text"
                placeholder="Search drawings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button onClick={handleSelectAll} className="select-all-btn">
                {allFilteredSelected ? 'Deselect All' : 'Select All'} ({filteredDrawings.length})
              </button>
            </div>

            <div className="naming-config">
              <h4>Combination Naming</h4>
              <div className="naming-options">
                <label>
                  <input
                    type="radio"
                    checked={namingPattern === 'drawing'}
                    onChange={() => setNamingPattern('drawing')}
                  />
                  Use drawing name
                </label>
                <label>
                  <input
                    type="radio"
                    checked={namingPattern === 'custom'}
                    onChange={() => setNamingPattern('custom')}
                  />
                  Custom pattern
                </label>
              </div>
              {namingPattern === 'custom' && (
                <div className="custom-naming">
                  <input
                    type="text"
                    placeholder="Prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  />
                  <span>[Drawing Name]</span>
                  <input
                    type="text"
                    placeholder="Suffix"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                  />
                </div>
              )}
              {selectedDrawings.size > 0 && (
                <div className="naming-preview">
                  Preview: {generateCombinationName(Array.from(selectedDrawings)[0])}
                </div>
              )}
            </div>

            <div className="drawings-list">
              {filteredDrawings.map(drawing => (
                <div
                  key={drawing.name}
                  className={`drawing-item ${selectedDrawings.has(drawing.name) ? 'selected' : ''}`}
                  onClick={() => handleDrawingToggle(drawing.name)}
                >
                  <input
                    type="checkbox"
                    checked={selectedDrawings.has(drawing.name)}
                    onChange={() => {}}
                  />
                  <span className="drawing-name">{drawing.name}</span>
                  <span className="drawing-type">{drawing.type}</span>
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button onClick={() => setStep('placement')} className="back-btn">Back</button>
              <button 
                onClick={() => setStep('review')} 
                className="next-btn"
                disabled={selectedDrawings.size === 0}
              >
                Review ({selectedDrawings.size})
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="step-content">
            <h3>Review & Create</h3>
            <div className="review-summary">
              <div className="summary-item">
                <strong>Template:</strong> {selectedTemplate}
              </div>
              <div className="summary-item">
                <strong>Placement:</strong> ({placementConfig.x}, {placementConfig.y}) | 
                {placementConfig.width}×{placementConfig.height} | {placementConfig.rotation}°
              </div>
              <div className="summary-item">
                <strong>Drawings:</strong> {selectedDrawings.size} selected
              </div>
              <div className="summary-item">
                <strong>Will create:</strong> {selectedDrawings.size} combinations
              </div>
            </div>

            <div className="combinations-preview">
              <h4>Combinations to be created:</h4>
              <div className="preview-list">
                {Array.from(selectedDrawings).map(drawing => (
                  <div key={drawing} className="preview-item">
                    <span className="combo-name">{generateCombinationName(drawing)}</span>
                    <span className="arrow">→</span>
                    <span className="drawing-name">{drawing}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="step-actions">
              <button onClick={() => setStep('drawings')} className="back-btn">Back</button>
              <button 
                onClick={handleBulkCreate}
                className="create-btn"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : `Create ${selectedDrawings.size} Combinations`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkCombinationCreator;
