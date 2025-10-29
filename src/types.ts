export interface FieldMapping {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  fontFamily?: 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' | 'Times-Roman' | 'Times-Bold' | 'Times-Italic' | 'Courier' | 'Courier-Bold';
  maxWidth?: number;
  bold?: boolean;
  italic?: boolean;
}

export interface TemplateMapping {
  [fieldName: string]: FieldMapping;
}

export interface GenerateRequest {
  template: string;
  data: {
    [key: string]: string;
  };
}

export interface TemplateInfo {
  name: string;
  hasMapping: boolean;
}
