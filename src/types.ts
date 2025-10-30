export interface FieldMapping {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  fontFamily?: 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Times-Roman' | 'Times-Bold' | 'Times-Italic' | 'Courier' | 'Courier-Bold';
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

export interface TemplateMapping {
  [fieldName: string]: FieldMapping;
}

export interface DrawingPlacementArea {
  drawingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateConfiguration {
  mapping: TemplateMapping;
  drawingPlacements?: DrawingPlacementArea[];
}

export interface DrawingInfo {
  name: string;
  type: 'pdf' | 'image' | 'svg';
  hasMapping: boolean;
}

export interface DrawingInsertion {
  drawing: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    [key: string]: string;
  };
}

export interface GenerateRequest {
  template: string;
  data: {
    [key: string]: string;
  };
  drawings?: DrawingInsertion[];
}

export interface TemplateInfo {
  name: string;
  hasMapping: boolean;
}
