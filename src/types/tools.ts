export type ToolName =
  | 'hand'
  | 'select'
  | 'point'
  | 'polyline'
  | 'line'
  | 'freehand'
  | 'arrow'
  | 'legends'
  | 'measure'
  | 'text'
  | 'gp'
  | 'tower'
  | 'junction'
  | 'triangle'
  | 'pit'
  | 'icon'
  | 'search'
  | 'split'
  | 'merge'
  | 'transform'
  | 'offset';

export interface ToolCapabilities {
  requiresDrawInteraction: boolean;
  requiresClickHandler: boolean;
  isEditable: boolean;
  isSelectable: boolean;
  geometryType?: string;
}

export interface ToolConfig {
  name: ToolName;
  label: string;
  icon: string;
  capabilities: ToolCapabilities;
}
