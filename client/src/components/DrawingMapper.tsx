import { useState, useEffect } from 'react';
import PDFMapper from './PDFMapper';

interface Props {
  drawingName: string;
  onMappingSaved: () => void;
}

function DrawingMapper({ drawingName, onMappingSaved }: Props) {
  const [drawingType, setDrawingType] = useState<'pdf' | 'image' | 'svg'>('pdf');

  useEffect(() => {
    const fetchDrawingType = async () => {
      try {
        const response = await fetch('/api/drawings');
        const drawings = await response.json();
        const drawing = drawings.find((d: any) => d.name === drawingName);
        if (drawing) {
          setDrawingType(drawing.type);
        }
      } catch (error) {
        console.error('Failed to fetch drawing type:', error);
      }
    };

    fetchDrawingType();
  }, [drawingName]);

  if (drawingType !== 'pdf') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Drawing Field Mapping</h2>
        <p style={{ color: '#666', marginTop: '1rem' }}>
          Field mapping is currently only supported for PDF drawings.
        </p>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Image-based drawings ({drawingType.toUpperCase()}) can be placed in templates but cannot have field mappings.
        </p>
        <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '1.5rem' }}>
          Convert your drawing to PDF format to enable field mapping.
        </p>
      </div>
    );
  }

  return (
    <PDFMapper
      templateName={drawingName}
      onMappingSaved={onMappingSaved}
      isDrawing={true}
    />
  );
}

export default DrawingMapper;
