export type LinkValue = { label?: string; href?: string };

export type Block = {
  id: string;
  type: string;
  data: Record<string, any>;
};

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'lines'
  | 'select'
  | 'number'
  | 'boolean'
  | 'link'
  | 'icon'
  | 'list'
  | 'color'
  | 'range'
  | 'font'
  | 'heading';

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: { value: string; label: string }[];
  fields?: Field[]; // for "list"
  itemLabel?: string; // for "list"
  placeholder?: string;
  min?: number; // for "range"
  max?: number;
  step?: number;
  unit?: string;
  half?: boolean; // show in a 2-column grid
};

export type BlockSchema = {
  type: string;
  label: string;
  description: string;
  group: 'Hero' | 'Content' | 'Marketing' | 'Dynamic' | 'Forms' | 'Advanced';
  fields: Field[];
  defaults: Record<string, any>;
};
