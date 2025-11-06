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
    scale?: boolean;
    rotate?: boolean;
    keepAspectRatio?: (event: any) => boolean;
  }

  export default class Transform extends Interaction {
    constructor(options?: TransformOptions);
    on(type: string, listener: (event: any) => void): EventsKey;
    getFeatures(): Collection<Feature>;
  }
}