import { useState, useEffect } from 'react';
import './CombinationsManager.css';

interface Combination {
  name: string;
  templateName: string;
  drawingPlacements: DrawingPlacement[];
}

interface DrawingPlacement {
  drawingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CombinationInfo {
  name: string;
}

interface TemplateInfo {
  name: string;
  hasMapping: boolean;
}

interface DrawingInfo {
  name: string;
  type: string;
  hasMapping: boolean;
}

function CombinationsManager() {
  const [combinations, setCombinations] = useState<CombinationInfo[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [currentCombination, setCurrentCombination] = useState<Combination | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [drawings, setDrawings] = useState<DrawingInfo[]>([]);

  const loadCombinations = async () => {
    try {
      const response = await fetch('/api/combinations');
      const data = await response.json();
      setCombinations(data);
    } catch (error) {
      console.error('Failed to load combinations:', error);
    }
  };

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

  useEffect(() => {
    loadCombinations();
    loadTemplates();
    loadDrawings();
  }, []);

  const handleSelectCombination = async (name: string) => {
    setSelectedCombination(name);
    setIsCreating(false);
    
    try {
      const response = await fetch(`/api/combinations/${name}`);
      const data = await response.json();
      setCurrentCombination(data);
    } catch (error) {
      console.error('Failed to load combination:', error);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedCombination(null);
    setCurrentCombination({
      name: '',
      templateName: templates.length > 0 ? templates[0].name : '',
      drawingPlacements: []
    });
    setNewCombinationName('');
  };

  const handleAddDrawing = () => {
    if (!currentCombination) return;
    
    const newPlacement: DrawingPlacement = {
      drawingName: drawings.length > 0 ? drawings[0].name : '',
      x: 50,
      y: 50,
      width: 300,
      height: 200
    };

    setCurrentCombination({
      ...currentCombination,
      drawingPlacements: [...currentCombination.drawingPlacements, newPlacement]
    });
  };

  const handleRemoveDrawing = (index: number) => {
    if (!currentCombination) return;
    
    const newPlacements = currentCombination.drawingPlacements.filter((_, i) => i !== index);
    setCurrentCombination({
      ...currentCombination,
      drawingPlacements: newPlacements
    });
  };

  const handleUpdatePlacement = (index: number, field: keyof DrawingPlacement, value: string | number) => {
    if (!currentCombination) return;
    
    const newPlacements = [...currentCombination.drawingPlacements];
    newPlacements[index] = {
      ...newPlacements[index],
      [field]: value
    };

    setCurrentCombination({
      ...currentCombination,
      drawingPlacements: newPlacements
    });
  };

  const handleSave = async () => {
    if (!currentCombination) return;
    
    const name = isCreating ? newCombinationName : currentCombination.name;
    
    if (!name) {
      alert('Please enter a combination name');
      return;
    }

    if (!currentCombination.templateName) {
      alert('Please select a template');
      return;
    }

    const combinationToSave = {
      ...currentCombination,
      name
    };

    try {
      await fetch(`/api/combinations/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(combinationToSave),
      });

      alert('Combination saved successfully!');
      await loadCombinations();
      setIsCreating(false);
      setSelectedCombination(name);
      setCurrentCombination(combinationToSave);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save combination');
    }
  };

  const handleDelete = async () => {
    if (!selectedCombination) return;
    
    if (!confirm(`Delete combination "${selectedCombination}"? This cannot be undone.`)) {
      return;
    }

    try {
      await fetch(`/api/combinations/${selectedCombination}`, {
        method: 'DELETE',
      });

      alert('Combination deleted successfully!');
      setSelectedCombination(null);
      setCurrentCombination(null);
      await loadCombinations();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete combination');
    }
  };

  return (
    <div className="combinations-manager">
      <div className="combinations-sidebar">
        <h2>Combinations</h2>
        <p className="combinations-subtitle">Connect templates with drawings</p>
        
        <button
          className="create-combination-btn"
          onClick={handleCreateNew}
        >
          + New Combination
        </button>

        <div className="combinations-list">
          {combinations.length === 0 ? (
            <div className="no-combinations">
              <p>No combinations yet</p>
              <p className="hint">Create one to get started</p>
            </div>
          ) : (
            combinations.map((combo) => (
              <div
                key={combo.name}
                className={`combination-item ${selectedCombination === combo.name ? 'selected' : ''}`}
                onClick={() => handleSelectCombination(combo.name)}
              >
                <div className="combination-icon">🔗</div>
                <div className="combination-name">{combo.name}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="combinations-editor">
        {!currentCombination && !isCreating ? (
          <div className="no-selection">
            <h2>👈 Select a combination to get started</h2>
            <p>or create a new one</p>
          </div>
        ) : (
          <div className="editor-content">
            <div className="editor-header">
              <h2>{isCreating ? 'New Combination' : currentCombination?.name}</h2>
              <div className="editor-actions">
                <button className="save-btn" onClick={handleSave}>
                  💾 Save
                </button>
                {!isCreating && (
                  <button className="delete-btn" onClick={handleDelete}>
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>

            {isCreating && (
              <div className="form-group">
                <label>Combination Name:</label>
                <input
                  type="text"
                  value={newCombinationName}
                  onChange={(e) => setNewCombinationName(e.target.value)}
                  placeholder="e.g., Customer Drawing Package"
                  className="combination-name-input"
                />
              </div>
            )}

            <div className="form-group">
              <label>Template:</label>
              <select
                value={currentCombination?.templateName || ''}
                onChange={(e) => setCurrentCombination({
                  ...currentCombination!,
                  templateName: e.target.value
                })}
                className="template-select"
              >
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name} {template.hasMapping ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div className="section-header">
                <label>Drawing Placements:</label>
                <button className="add-drawing-btn" onClick={handleAddDrawing}>
                  + Add Drawing
                </button>
              </div>

              {currentCombination?.drawingPlacements.length === 0 ? (
                <div className="no-placements">
                  <p>No drawings added yet</p>
                  <p className="hint">Click "Add Drawing" to add a drawing placement</p>
                </div>
              ) : (
                <div className="placements-list">
                  {currentCombination?.drawingPlacements.map((placement, index) => (
                    <div key={index} className="placement-card">
                      <div className="placement-header">
                        <span className="placement-index">#{index + 1}</span>
                        <button
                          className="remove-placement-btn"
                          onClick={() => handleRemoveDrawing(index)}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="placement-form">
                        <div className="placement-field">
                          <label>Drawing:</label>
                          <select
                            value={placement.drawingName}
                            onChange={(e) => handleUpdatePlacement(index, 'drawingName', e.target.value)}
                          >
                            {drawings.map((drawing) => (
                              <option key={drawing.name} value={drawing.name}>
                                {drawing.name} {drawing.hasMapping ? '✓' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="placement-coords">
                          <div className="placement-field">
                            <label>X:</label>
                            <input
                              type="number"
                              value={placement.x}
                              onChange={(e) => handleUpdatePlacement(index, 'x', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="placement-field">
                            <label>Y:</label>
                            <input
                              type="number"
                              value={placement.y}
                              onChange={(e) => handleUpdatePlacement(index, 'y', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="placement-field">
                            <label>Width:</label>
                            <input
                              type="number"
                              value={placement.width}
                              onChange={(e) => handleUpdatePlacement(index, 'width', parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="placement-field">
                            <label>Height:</label>
                            <input
                              type="number"
                              value={placement.height}
                              onChange={(e) => handleUpdatePlacement(index, 'height', parseFloat(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CombinationsManager;
