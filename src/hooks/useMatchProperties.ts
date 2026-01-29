import { useEffect, useCallback, useRef } from 'react';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { useMatchPropertiesStore } from '@/stores/useMatchPropertiesStore';

interface UseMatchPropertiesOptions {
    map: Map | null;
    vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
    activeTool: string;  // Pass activeTool as prop since it comes from useToolState, not useToolStore
    onSave?: () => void;  // Callback to save state after applying styles
}

interface UseMatchPropertiesReturn {
    isActive: boolean;
    phase: 'idle' | 'awaiting-source' | 'awaiting-targets';
    hasSourceStyles: boolean;
}

/**
 * Hook to manage the Match Properties tool interaction.
 * Handles click registration, style capture, and style application.
 */
export const useMatchProperties = ({
    map,
    vectorLayer,
    activeTool,
    onSave,
}: UseMatchPropertiesOptions): UseMatchPropertiesReturn => {
    const clickHandlerRef = useRef<((evt: any) => void) | null>(null);

    const {
        isActive,
        phase,
        capturedStyles,
        activate,
        deactivate,
        captureStyles,
        applyStyles,
    } = useMatchPropertiesStore();

    // Handle tool activation/deactivation based on active tool
    useEffect(() => {
        if (activeTool === 'matchproperties') {
            activate();
        } else if (isActive) {
            deactivate();
        }
    }, [activeTool, activate, deactivate, isActive]);

    // Get feature at click position
    const getFeatureAtPixel = useCallback(
        (pixel: number[]): Feature<Geometry> | null => {
            if (!map || !vectorLayer) return null;

            const features = map.getFeaturesAtPixel(pixel, {
                layerFilter: (layer) => layer === vectorLayer,
                hitTolerance: 5,
            });

            return (features?.[0] as Feature<Geometry>) || null;
        },
        [map, vectorLayer]
    );

    // Handle map clicks for the match properties tool
    const handleClick = useCallback(
        (evt: any) => {
            if (!isActive || !map) return;

            const pixel = evt.pixel;
            const feature = getFeatureAtPixel(pixel);

            if (!feature) {
                return;
            }

            if (phase === 'awaiting-source') {
                // Capture styles from the source feature
                captureStyles(feature);
            } else if (phase === 'awaiting-targets') {
                // Apply captured styles to the target feature
                applyStyles(feature);
                map.render();
                // Trigger save to persist changes to database
                onSave?.();
            }
        },
        [isActive, map, phase, getFeatureAtPixel, captureStyles, applyStyles, onSave]
    );

    // Register/unregister click handler
    useEffect(() => {
        if (!map) return;

        const viewport = map.getTargetElement() as HTMLElement | null;

        if (isActive) {
            // Remove any existing handler
            if (clickHandlerRef.current) {
                map.un('click', clickHandlerRef.current);
            }

            // Register new handler
            clickHandlerRef.current = handleClick;
            map.on('click', handleClick);

            // Update cursor based on phase
            if (viewport) {
                if (phase === 'awaiting-source') {
                    // Eyedropper/pipette cursor for source selection
                    viewport.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m2 22 1-1h3l9-9\'/%3E%3Cpath d=\'M3 21v-3l9-9\'/%3E%3Cpath d=\'m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z\'/%3E%3C/svg%3E") 2 22, crosshair';
                } else if (phase === 'awaiting-targets') {
                    // Copy/paint cursor for applying styles
                    viewport.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2322c55e\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m19 11-8 8H4v-7l8-8\'/%3E%3Cpath d=\'m4 19 .01.01\'/%3E%3Cpath d=\'M15 4l5 5-1 1-5-5 1-1z\'/%3E%3C/svg%3E") 2 22, copy';
                }
            }
        }

        return () => {
            if (map && clickHandlerRef.current) {
                map.un('click', clickHandlerRef.current);
                clickHandlerRef.current = null;
            }

            // Reset cursor
            if (viewport) {
                viewport.style.cursor = '';
            }
        };
    }, [map, isActive, handleClick, phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            deactivate();
        };
    }, [deactivate]);

    return {
        isActive,
        phase,
        hasSourceStyles: capturedStyles !== null,
    };
};
