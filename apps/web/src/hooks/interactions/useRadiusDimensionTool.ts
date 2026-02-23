import { useEffect, useRef, useCallback } from 'react';
import type { Select, Modify } from 'ol/interaction';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { LineString } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import type { Coordinate } from 'ol/coordinate';
import OlOverlay from 'ol/Overlay';
import { formatRadiusWithUnit } from '@/utils/propertyUtils';
import { useFolderStore } from '@/stores/useFolderStore';

interface UseRadiusDimensionToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

type ToolState = 'IDLE' | 'POINT1_SET';

interface RadiusDimState {
  state: ToolState;
  p1: Coordinate | null;
  radiusValue: number | null;
}

function createMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 12px;
    height: 12px;
    background: #ff0000;
    border: 2px solid #ffffff;
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(0,0,0,0.5);
  `;
  return el;
}

export const useRadiusDimensionTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseRadiusDimensionToolOptions): void => {
  const stateRef = useRef<RadiusDimState>({
    state: 'IDLE',
    p1: null,
    radiusValue: null,
  });
  const markerRef = useRef<OlOverlay | null>(null);
  const previewFeatureRef = useRef<Feature<Geometry> | null>(null);

  const resetState = useCallback(() => {
    stateRef.current = { state: 'IDLE', p1: null, radiusValue: null };
    markerRef.current?.setPosition(undefined);

    // Remove preview feature
    if (previewFeatureRef.current && vectorLayer?.getSource()) {
      try {
        vectorLayer.getSource()!.removeFeature(previewFeatureRef.current as Feature<Geometry>);
      } catch {
        // Feature may already be removed
      }
      previewFeatureRef.current = null;
    }
  }, [vectorLayer]);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      // Create marker overlay
      const markerEl = createMarkerElement();
      const marker = new OlOverlay({
        element: markerEl,
        positioning: 'center-center',
        stopEvent: false,
      });
      map.addOverlay(marker);
      markerRef.current = marker;

      // Set crosshair cursor
      const viewport = map.getViewport();
      if (viewport) viewport.style.cursor = 'crosshair';

      const handleClick = (e: any) => {
        const coord: Coordinate = e.coordinate;
        const state = stateRef.current;
        const pixel = map.getEventPixel(e.originalEvent);

        if (state.state === 'IDLE') {
          // First click: try to detect circle feature
          let circleFeature: Feature | null = null;
          map.forEachFeatureAtPixel(pixel, (f) => {
            if (!circleFeature && (f as Feature).get('isCircle')) {
              circleFeature = f as Feature;
            }
          });

          if (!circleFeature) {
            // Not on a circle, ignore
            return;
          }

          const radiusValue = (circleFeature as Feature).get('radius') as number | undefined;
          if (radiusValue === undefined) {
            // No radius property, ignore
            return;
          }

          stateRef.current = { state: 'POINT1_SET', p1: coord, radiusValue };
          marker.setPosition(coord);

          // Create preview feature (rubber-band line from p1 to p1 initially)
          const radiusText = formatRadiusWithUnit(radiusValue, 'm');
          const preview = new Feature({
            geometry: new LineString([coord, coord]),
          });
          preview.set('isRadiusDimension', true);
          preview.set('isPreview', true);
          preview.set('radiusValue', radiusValue);
          preview.set('radiusText', radiusText);
          vectorSource.addFeature(preview);
          previewFeatureRef.current = preview;
        } else if (state.state === 'POINT1_SET') {
          // Second click: finalize dimension
          // Remove preview
          if (previewFeatureRef.current) {
            try {
              vectorSource.removeFeature(previewFeatureRef.current as Feature<Geometry>);
            } catch {
              // Already removed
            }
            previewFeatureRef.current = null;
          }

          // Create final feature
          const radiusText = formatRadiusWithUnit(state.radiusValue!, 'm');
          const feature = new Feature({
            geometry: new LineString([state.p1!, coord]),
          });
          feature.set('isRadiusDimension', true);
          feature.set('radiusValue', state.radiusValue);
          feature.set('radiusText', radiusText);

          // Assign to active folder
          const activeFolder = useFolderStore.getState().activeFolderId;
          if (activeFolder) {
            feature.set('folderId', activeFolder);
          }

          vectorSource.addFeature(feature);

          // Reset for next dimension
          resetState();
        }
      };

      const handlePointerMove = (e: any) => {
        const state = stateRef.current;
        if (state.state !== 'POINT1_SET' || !previewFeatureRef.current) return;

        const cursor: Coordinate = e.coordinate;
        // Update preview geometry to cursor
        previewFeatureRef.current.setGeometry(new LineString([state.p1!, cursor]));
      };

      map.on('click', handleClick);
      map.on('pointermove', handlePointerMove);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          resetState();
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        map.un('click', handleClick);
        map.un('pointermove', handlePointerMove);
        document.removeEventListener('keydown', handleKeyDown);

        if (markerRef.current) {
          map.removeOverlay(markerRef.current);
          markerRef.current = null;
        }
        resetState();

        const vp = map.getViewport();
        if (vp) vp.style.cursor = '';
      };
    } else {
      // Cleanup when deactivated
      if (markerRef.current) {
        map.removeOverlay(markerRef.current);
        markerRef.current = null;
      }
      resetState();
    }
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction, resetState]);
};
