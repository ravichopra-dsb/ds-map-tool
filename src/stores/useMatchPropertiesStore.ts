import { create } from 'zustand';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

/**
 * Captured styles from a source feature that can be applied to target features.
 * Optional properties allow partial style matching based on feature type.
 */
export interface CapturedStyles {
    // Line styles (polyline, freehand, arrow, measure, legends)
    lineColor?: string;
    lineWidth?: number;
    opacity?: number;

    // Shape styles (box, circle, revcloud)
    strokeColor?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    fillColor?: string;
    fillOpacity?: number;

    // Text styles
    textScale?: number;
    textRotation?: number;
    color?: string;

    // Point styles
    pointOpacity?: number;
}

export type MatchPropertiesPhase = 'idle' | 'awaiting-source' | 'awaiting-targets';

interface MatchPropertiesState {
    // State
    isActive: boolean;
    capturedStyles: CapturedStyles | null;
    sourceFeatureId: string | null;
    phase: MatchPropertiesPhase;

    // Actions
    activate: () => void;
    deactivate: () => void;
    captureStyles: (feature: Feature<Geometry>) => void;
    applyStyles: (feature: Feature<Geometry>) => void;
    reset: () => void;
}

/**
 * Extract style properties from a feature based on its type
 */
const extractStylesFromFeature = (feature: Feature<Geometry>): CapturedStyles => {
    const styles: CapturedStyles = {};

    // Line styles
    if (feature.get('lineColor') !== undefined) {
        styles.lineColor = feature.get('lineColor');
    }
    if (feature.get('lineWidth') !== undefined) {
        styles.lineWidth = feature.get('lineWidth');
    }
    if (feature.get('opacity') !== undefined) {
        styles.opacity = feature.get('opacity');
    }

    // Shape styles
    if (feature.get('strokeColor') !== undefined) {
        styles.strokeColor = feature.get('strokeColor');
    }
    if (feature.get('strokeWidth') !== undefined) {
        styles.strokeWidth = feature.get('strokeWidth');
    }
    if (feature.get('strokeOpacity') !== undefined) {
        styles.strokeOpacity = feature.get('strokeOpacity');
    }
    if (feature.get('fillColor') !== undefined) {
        styles.fillColor = feature.get('fillColor');
    }
    if (feature.get('fillOpacity') !== undefined) {
        styles.fillOpacity = feature.get('fillOpacity');
    }

    // Text styles
    if (feature.get('textScale') !== undefined) {
        styles.textScale = feature.get('textScale');
    }
    if (feature.get('textRotation') !== undefined) {
        styles.textRotation = feature.get('textRotation');
    }
    if (feature.get('color') !== undefined) {
        styles.color = feature.get('color');
    }

    // Point styles
    if (feature.get('pointOpacity') !== undefined) {
        styles.pointOpacity = feature.get('pointOpacity');
    }

    return styles;
};

/**
 * Apply captured styles to a target feature based on its type
 */
const applyStylesToFeature = (feature: Feature<Geometry>, styles: CapturedStyles): void => {
    // Line styles - apply if target feature has line properties OR is a line-type feature
    const isLineFeature = feature.get('isPolyline') || feature.get('isFreehand') ||
        feature.get('isArrow') || feature.get('isMeasure') || feature.get('islegends');

    if (isLineFeature) {
        if (styles.lineColor !== undefined) {
            feature.set('lineColor', styles.lineColor);
        }
        if (styles.lineWidth !== undefined) {
            feature.set('lineWidth', styles.lineWidth);
        }
        if (styles.opacity !== undefined) {
            feature.set('opacity', styles.opacity);
        }
    }

    // Shape styles - apply if target feature is a shape
    const isShapeFeature = feature.get('isBox') || feature.get('isCircle') || feature.get('isRevisionCloud');

    if (isShapeFeature) {
        if (styles.strokeColor !== undefined) {
            feature.set('strokeColor', styles.strokeColor);
        }
        if (styles.strokeWidth !== undefined) {
            feature.set('strokeWidth', styles.strokeWidth);
        }
        if (styles.strokeOpacity !== undefined) {
            feature.set('strokeOpacity', styles.strokeOpacity);
        }
        if (styles.fillColor !== undefined) {
            feature.set('fillColor', styles.fillColor);
        }
        if (styles.fillOpacity !== undefined) {
            feature.set('fillOpacity', styles.fillOpacity);
        }
    }

    // Text styles - apply if target feature is text
    const isTextFeature = feature.get('isText');

    if (isTextFeature) {
        if (styles.textScale !== undefined) {
            feature.set('textScale', styles.textScale);
        }
        if (styles.textRotation !== undefined) {
            feature.set('textRotation', styles.textRotation);
        }
        if (styles.color !== undefined) {
            feature.set('color', styles.color);
        }
    }

    // Point styles - apply if target feature is a point
    const isPointFeature = feature.get('isPoint');

    if (isPointFeature) {
        if (styles.pointOpacity !== undefined) {
            feature.set('pointOpacity', styles.pointOpacity);
        }
        // Also apply color if available
        if (styles.color !== undefined) {
            feature.set('color', styles.color);
        }
    }

    // Trigger feature update
    feature.changed();
};

const getFeatureId = (feature: Feature<Geometry>): string => {
    return (feature as unknown as { ol_uid: string }).ol_uid || '';
};

export const useMatchPropertiesStore = create<MatchPropertiesState>((set, get) => ({
    isActive: false,
    capturedStyles: null,
    sourceFeatureId: null,
    phase: 'idle',

    activate: () => {
        set({
            isActive: true,
            phase: 'awaiting-source',
            capturedStyles: null,
            sourceFeatureId: null,
        });
    },

    deactivate: () => {
        set({
            isActive: false,
            phase: 'idle',
            capturedStyles: null,
            sourceFeatureId: null,
        });
    },

    captureStyles: (feature) => {
        const styles = extractStylesFromFeature(feature);
        const featureId = getFeatureId(feature);

        set({
            capturedStyles: styles,
            sourceFeatureId: featureId,
            phase: 'awaiting-targets',
        });
    },

    applyStyles: (feature) => {
        const { capturedStyles, sourceFeatureId } = get();

        if (!capturedStyles) {
            return;
        }

        // Don't apply to the source feature itself
        const targetId = getFeatureId(feature);
        if (targetId === sourceFeatureId) {
            return;
        }

        applyStylesToFeature(feature, capturedStyles);
    },

    reset: () =>
        set({
            capturedStyles: null,
            sourceFeatureId: null,
            phase: 'awaiting-source',
        }),
}));
