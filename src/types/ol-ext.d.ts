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