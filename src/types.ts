export interface FieldMapping {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
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
