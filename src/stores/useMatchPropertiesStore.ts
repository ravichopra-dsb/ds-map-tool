import { create } from 'zustand';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { getLegendById } from '@/tools/legendsConfig';

/**
 * Captured styles from a source feature that can be applied to target features.
 * Optional properties allow partial style matching based on feature type.
 */
export interface CapturedStyles {
    // Line styles (polyline, freehand, arrow, measure, legends)
    lineColor?: string;
    lineWidth?: number;
    opacity?: number;
    strokeDash?: number[];  // Dash pattern from legends

    // Shape styles (box, circle, revcloud)
    strokeColor?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    fillColor?: string;
    fillOpacity?: number;

    // Text styles
    textScale?: number;
    textRotation?: number;
    textOpacity?: number;
    textFillColor?: string;
    textStrokeColor?: string;

    // Point styles
    pointOpacity?: number;

    // Legend type ID for text legends (OIL, HW, GAS, etc.)
    legendType?: string;
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
    if (feature.get('textOpacity') !== undefined) {
        styles.textOpacity = feature.get('textOpacity');
    }
    if (feature.get('textFillColor') !== undefined) {
        styles.textFillColor = feature.get('textFillColor');
    }
    if (feature.get('textStrokeColor') !== undefined) {
        styles.textStrokeColor = feature.get('textStrokeColor');
    }

    // Point styles
    if (feature.get('pointOpacity') !== undefined) {
        styles.pointOpacity = feature.get('pointOpacity');
    }

    // Extract styles from legend features (including defaults from legend config)
    if (feature.get('islegends')) {
        const legendTypeId = feature.get('legendType');
        if (legendTypeId) {
            // Capture the legendType ID for text legends (OIL, HW, GAS, etc.)
            styles.legendType = legendTypeId;

            const legendType = getLegendById(legendTypeId);
            if (legendType) {
                // Extract color from legend config if not custom-set on feature
                if (!styles.lineColor && legendType.style.strokeColor) {
                    styles.lineColor = legendType.style.strokeColor;
                }
                // Extract width from legend config if not custom-set
                if (styles.lineWidth === undefined && legendType.style.strokeWidth !== undefined) {
                    styles.lineWidth = legendType.style.strokeWidth;
                }
                // Extract opacity from legend config if not custom-set
                if (styles.opacity === undefined && legendType.style.opacity !== undefined) {
                    styles.opacity = legendType.style.opacity;
                }
                // Extract strokeDash from legend config
                if (legendType.style.strokeDash) {
                    styles.strokeDash = legendType.style.strokeDash;
                }
            }
        }
    }
    // Custom strokeDash on feature overrides legend config
    if (feature.get('strokeDash') !== undefined) {
        styles.strokeDash = feature.get('strokeDash');
    }

    return styles;
};

/**
 * Resolve the primary color from captured styles (cross-type)
 */
const resolveColor = (styles: CapturedStyles): string | undefined => {
    return styles.lineColor ?? styles.strokeColor;
};

/**
 * Resolve width from captured styles (cross-type)
 */
const resolveWidth = (styles: CapturedStyles): number | undefined => {
    return styles.lineWidth ?? styles.strokeWidth;
};

/**
 * Resolve opacity from captured styles (cross-type)
 */
const resolveOpacity = (styles: CapturedStyles): number | undefined => {
    return styles.opacity ?? styles.strokeOpacity ?? styles.pointOpacity;
};

/**
 * Apply captured styles to a target feature with cross-type mapping
 */
const applyStylesToFeature = (feature: Feature<Geometry>, styles: CapturedStyles): void => {
    // Feature type detection - ALL types included
    const isLineFeature = feature.get('isPolyline') || feature.get('isFreehand') ||
        feature.get('isArrow') || feature.get('islegends') || feature.get('isArc');
    const isMeasureFeature = feature.get('isMeasure');
    const isShapeFeature = feature.get('isBox') || feature.get('isCircle') || feature.get('isRevisionCloud');
    const isTextFeature = feature.get('isText');
    // Point features include ALL icon types: GP, Tower, Junction, Triangle, Pit
    const isPointFeature = feature.get('isPoint') ||
        feature.get('isGP') || feature.get('isTower') ||
        feature.get('isJunction') || feature.get('isTriangle') || feature.get('isPit');

    // Resolve equivalent properties from captured styles
    const resolvedColor = resolveColor(styles);
    const resolvedWidth = resolveWidth(styles);
    const resolvedOpacity = resolveOpacity(styles);

    // Apply to LINE features (including all legends, excluding Measure)
    if (isLineFeature && !isMeasureFeature) {
        if (resolvedColor !== undefined) {
            feature.set('lineColor', resolvedColor);
        }
        if (resolvedWidth !== undefined) {
            feature.set('lineWidth', resolvedWidth);
        }
        if (resolvedOpacity !== undefined) {
            feature.set('opacity', resolvedOpacity);
        }
        // Apply strokeDash pattern from legends
        if (styles.strokeDash !== undefined) {
            feature.set('strokeDash', styles.strokeDash);
        }
        // Apply legendType for text legends (OIL, HW, GAS, etc.)
        // Also set islegends:true to enable text rendering on target features
        if (styles.legendType !== undefined) {
            feature.set('legendType', styles.legendType);
            feature.set('islegends', true);
        }
    }

    // Apply to SHAPE features (Box, Circle, RevisionCloud)
    if (isShapeFeature) {
        if (resolvedColor !== undefined) {
            feature.set('strokeColor', resolvedColor);
        }
        if (resolvedWidth !== undefined) {
            feature.set('strokeWidth', resolvedWidth);
        }
        if (resolvedOpacity !== undefined) {
            feature.set('strokeOpacity', resolvedOpacity);
        }
        if (styles.fillColor !== undefined) {
            feature.set('fillColor', styles.fillColor);
        }
        if (styles.fillOpacity !== undefined) {
            feature.set('fillOpacity', styles.fillOpacity);
        }
        // Apply strokeDash to shapes too
        if (styles.strokeDash !== undefined) {
            feature.set('strokeDash', styles.strokeDash);
        }
        // Apply legendType for text legends (OIL, HW, GAS, etc.) to shapes
        if (styles.legendType !== undefined) {
            feature.set('legendType', styles.legendType);
        }
    }

    // Apply to TEXT features
    if (isTextFeature) {
        // Text-specific color properties
        if (styles.textFillColor !== undefined) {
            feature.set('textFillColor', styles.textFillColor);
        }
        if (styles.textStrokeColor !== undefined) {
            feature.set('textStrokeColor', styles.textStrokeColor);
        }
        if (styles.textOpacity !== undefined) {
            feature.set('textOpacity', styles.textOpacity);
        }
        // Text-specific layout properties
        if (styles.textScale !== undefined) {
            feature.set('textScale', styles.textScale);
        }
        if (styles.textRotation !== undefined) {
            feature.set('textRotation', styles.textRotation);
        }
    }

    // Apply to POINT/ICON features (Point, GP, Tower, Junction, Triangle, Pit)
    if (isPointFeature) {
        if (resolvedOpacity !== undefined) {
            feature.set('pointOpacity', resolvedOpacity);
        }
        if (resolvedColor !== undefined) {
            feature.set('color', resolvedColor);
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
