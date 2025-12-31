declare module 'ol-ext/interaction/Transform' {
  import { Interaction } from 'ol/interaction';
  import { Collection } from 'ol';
  import Feature from 'ol/Feature';
  import { EventsKey } from 'ol/events';
  import { BaseEvent } from 'ol/events';

  export interface TransformOptions {
    enableRotatedTransform?: boolean;
    addCondition?: (event: any) => boolean;
    translateFeature?: boolean;
    translate?: boolean;
    scale?: boolean;
    rotate?: boolean;
    stretch?: boolean;
    keepAspectRatio?: (event: any) => boolean;
    features?: any;
    layers?: any[];
    filter?: (feature: any, layer: any) => boolean;
    select?: any;
    condition?: (event: any) => boolean;
    hitTolerance?: number;
    translateBBox?: boolean;
    noFlip?: boolean;
    selection?: boolean;
    modifyCenter?: (event: any) => boolean;
    keepRectangle?: boolean;
    buffer?: number;
    style?: any;
    pointRadius?: number | number[] | ((feature: any) => number | number[]);
  }

  export default class Transform extends Interaction {
    constructor(options?: TransformOptions);
    on(type: string | string[], listener: (event: any) => void): EventsKey;
    getFeatures(): Collection<Feature>;
    setActive(active: boolean): void;
  }
}

declare module 'ol-ext/interaction/CopyPaste' {
  import { Interaction } from 'ol/interaction';
  import { Collection } from 'ol';
  import Feature from 'ol/Feature';
  import { EventsKey } from 'ol/events';
  import { BaseEvent } from 'ol/events';
  import { VectorSource } from 'ol/source';

  export interface CopyPasteOptions {
    features?: Collection<Feature>;
    destination?: VectorSource;
    sources?: VectorSource | VectorSource[];
    condition?: (event: any) => string | false; // 'copy', 'cut', 'paste', or false
    mapCondition?: (event: any) => boolean;
  }

  export interface CopyPasteEvent extends BaseEvent {
    features: Collection<Feature>;
    type: 'copy' | 'cut' | 'paste';
  }

  export interface CopyOptions {
    features?: Collection<Feature>;
    cut?: boolean;
    silent?: boolean;
  }

  export interface PasteOptions {
    destination?: VectorSource;
    silent?: boolean;
  }

  export default class CopyPaste extends Interaction {
    constructor(options?: CopyPasteOptions);
    on(type: string | string[], listener: (event: CopyPasteEvent) => void): EventsKey;
    copy(options?: CopyOptions): void;
    paste(options?: PasteOptions, features?: Collection<Feature>): void;
    getFeatures(): Collection<Feature>;
    setFeatures(features: Collection<Feature>): void;
    getDestination(): VectorSource;
    setDestination(source: VectorSource): void;
    getSources(): VectorSource[];
    setSources(sources: VectorSource | VectorSource[]): void;
    setActive(active: boolean): void;
  }
}

declare module 'ol-ext/control/Search' {
  import { Control } from 'ol/control';
  import Map from 'ol/Map';
  import Feature from 'ol/Feature';

  export interface SearchOptions {
    className?: string;
    target?: Element | string;
    title?: string;
    reverseTitle?: string;
    placeholder?: string;
    typing?: number;
    minLength?: number;
    maxItems?: number;
    maxHistory?: number;
    getTitle?: (feature: any) => string;
    autocomplete?: (searchString: string, callback: (results: any[]) => void) => void | any[];
    onselect?: (feature: any) => void;
    centerOnSelect?: boolean;
    zoomOnSelect?: number | boolean;
    collapsed?: boolean;
    noCollapse?: boolean;
  }

  export interface SelectEvent {
    type: 'select';
    search: any;
    coordinate: [number, number];
    feature?: Feature;
  }

  export default class Search extends Control {
    constructor(options?: SearchOptions);
    on(type: string | string[], listener: (event: SelectEvent | any) => void): void;
    getInputField(): Element;
    getTitle(f: any): string;
    select(f: any, reverse?: boolean, coord?: [number, number], options?: any): void;
    setInput(value: string, search?: boolean): void;
    search(): void;
    clearHistory(): void;
    getHistory(): any[];
    saveHistory(): void;
    restoreHistory(): void;
    collapse(b?: boolean): void;
    equalFeatures(f1: any, f2: any): boolean;
    reverseGeocode(coord: [number, number], cback?: (result: any) => void): void;
  }
}

declare module 'ol-ext/control/SearchJSON' {
  import Search from 'ol-ext/control/Search';
  import Map from 'ol/Map';

  export interface SearchJSONOptions extends Search.SearchOptions {
    url?: string;
    authentication?: string;
    handleResponse?: (response: any) => any[];
  }

  export default class SearchJSON extends Search {
    constructor(options?: SearchJSONOptions);
    requestData(s: string): any;
    handleResponse(response: any): any[];
  }
}

declare module 'ol-ext/control/SearchNominatim' {
  import SearchJSON from 'ol-ext/control/SearchJSON';
  import Map from 'ol/Map';

  export interface SearchNominatimOptions extends SearchJSON.SearchOptions {
    polygon?: boolean;
    viewbox?: [number, number, number, number];
    bounded?: boolean;
    url?: string;
    className?: string;
    title?: string;
    placeholder?: string;
    reverseTitle?: string;
    collapsed?: boolean;
    typing?: number;
    minLength?: number;
    maxItems?: number;
    maxHistory?: number;
    centerOnSelect?: boolean;
    zoomOnSelect?: number | boolean;
  }

  export default class SearchNominatim extends SearchJSON {
    constructor(options?: SearchNominatimOptions);
    getTitle(f: any): string;
    requestData(s: string): any;
    select(f: any): void;
    reverseGeocode(coord: [number, number], cback?: (result: any) => void): void;
  }
}

/**
 * UndoRedo interaction from ol-ext
 * Adds undo/redo functionality to OpenLayers maps
 */
declare module 'ol-ext/interaction/UndoRedo' {
  import Map from 'ol/Map';
  import Interaction from 'ol/interaction/Interaction';
  import Collection from 'ol/Collection';
  import Feature from 'ol/Feature';

  export interface UndoRedoOptions {
    /**
     * Maximum number of undo/redo steps to keep in memory
     * Default: 50
     */
    maxHistorySize?: number;

    /**
     * Automatically add drawing interactions to undo stack
     * Default: true
     */
    autoTrack?: boolean;

    /**
     * Collection of features to track for changes
     * Default: null (track all features)
     */
    features?: Collection<Feature> | null;

    /**
     * Map instance to attach to
     */
    map?: import('ol/Map').default;
  }

  export default class UndoRedo extends Interaction {
    constructor(options?: UndoRedoOptions);

    /**
     * Perform an undo operation
     * @returns true if undo was performed, false if no undo available
     */
    undo(): boolean;

    /**
     * Perform a redo operation
     * @returns true if redo was performed, false if no redo available
     */
    redo(): boolean;

    /**
     * Check if undo is available
     */
    hasUndo(): boolean;

    /**
     * Check if redo is available
     */
    hasRedo(): boolean;

    /**
     * Get the current undo stack length
     */
    getUndoStackLength(): number;

    /**
     * Get the current redo stack length
     */
    getRedoStackLength(): number;

    /**
     * Clear all undo/redo history
     */
    clear(): void;

    /**
     * Set the maximum history size
     */
    setMaxHistorySize(size: number): void;

    /**
     * Get the current position in the history
     */
    getCurrentIndex(): number;

    getStack(type?: string): Array<any>;

    /**
     * Add a custom action to the undo stack
     */
    pushAction(action: {
      undo: () => void;
      redo: () => void;
      name?: string;
    }): void;

    /**
     * Attach event listener
     */
    on(
      type: 'undo' | 'redo' | 'stack:add' | 'stack:remove' | 'stack:clear',
      listener: (event: any) => void
    ): void;
  }
}

/**
 * Split interaction from ol-ext
 * Splits LineString features by clicking on a point on the feature
 */
declare module 'ol-ext/interaction/Split' {
  import { Interaction } from 'ol/interaction';
  import { Vector as VectorSource } from 'ol/source';
  import { Collection } from 'ol';
  import Feature from 'ol/Feature';
  import { EventsKey } from 'ol/events';

  export interface SplitOptions {
    /**
     * A list of source to split (configured with useSpatialIndex set to true)
     */
    sources?: VectorSource | VectorSource[];

    /**
     * A collection of features to split
     */
    features?: Collection<Feature>;

    /**
     * Distance (in px) to snap to a line (default: 25)
     */
    snapDistance?: number;

    /**
     * Cursor to display when hovering on a splittable feature
     */
    cursor?: string;

    /**
     * A filter function that returns true for features to split
     */
    filter?: (feature: Feature) => boolean;
  }

  export interface SplitEvent {
    /**
     * Event type: 'beforesplit' or 'aftersplit'
     */
    type: 'beforesplit' | 'aftersplit';

    /**
     * The original feature that was split
     */
    original: Feature;

    /**
     * The resulting features after split
     */
    features: Feature[];
  }

  export default class Split extends Interaction {
    constructor(options?: SplitOptions);

    /**
     * Attach event listener for split events
     */
    on(type: 'beforesplit' | 'aftersplit', listener: (event: SplitEvent) => void): EventsKey;
    on(type: string | string[], listener: (event: any) => void): EventsKey;

    /**
     * Set the interaction active state
     */
    setActive(active: boolean): void;
  }
}