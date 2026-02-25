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
import {
  detectDimensionDirection,
  computeDimLinePosition,
  computeLinearDimLineEndpoints,
} from '@/utils/linearDimensionUtils';
import { useFolderStore } from '@/stores/useFolderStore';

interface UseLinearDimensionToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
  lineColor?: string;
}

type ToolState = 'IDLE' | 'POINT1_SET' | 'POINT2_SET';

interface LinearDimState {
  state: ToolState;
  p1: Coordinate | null;
  p2: Coordinate | null;
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

export const useLinearDimensionTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
  lineColor,
}: UseLinearDimensionToolOptions): void => {
  const stateRef = useRef<LinearDimState>({
    state: 'IDLE',
    p1: null,
    p2: null,
  });
  const marker1Ref = useRef<OlOverlay | null>(null);
  const marker2Ref = useRef<OlOverlay | null>(null);
  const previewFeatureRef = useRef<Feature<Geometry> | null>(null);

  const resetState = useCallback(() => {
    stateRef.current = { state: 'IDLE', p1: null, p2: null };
    marker1Ref.current?.setPosition(undefined);
    marker2Ref.current?.setPosition(undefined);

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

      // Create two marker overlays
      const marker1El = createMarkerElement();
      const marker1 = new OlOverlay({
        element: marker1El,
        positioning: 'center-center',
        stopEvent: false,
      });
      map.addOverlay(marker1);
      marker1Ref.current = marker1;

      const marker2El = createMarkerElement();
      const marker2 = new OlOverlay({
        element: marker2El,
        positioning: 'center-center',
        stopEvent: false,
      });
      map.addOverlay(marker2);
      marker2Ref.current = marker2;

      // Set crosshair cursor
      const viewport = map.getViewport();
      if (viewport) viewport.style.cursor = 'crosshair';

      const handleClick = (e: any) => {
        const coord: Coordinate = e.coordinate;
        const state = stateRef.current;

        if (state.state === 'IDLE') {
          stateRef.current = { state: 'POINT1_SET', p1: coord, p2: null };
          marker1.setPosition(coord);
        } else if (state.state === 'POINT1_SET') {
          stateRef.current = { ...state, state: 'POINT2_SET', p2: coord };
          marker2.setPosition(coord);

          // Create preview feature
          const preview = new Feature({
            geometry: new LineString([state.p1!, coord]),
          });
          preview.set('isLinearDimension', true);
          preview.set('isPreview', true);
          preview.set('lineColor', lineColor || '#ff0c0c');
          preview.set('lineWidth', 0.2);
          preview.set('dimensionDirection', 'horizontal');
          preview.set('dimLinePosition', coord[1]);
          vectorSource.addFeature(preview);
          previewFeatureRef.current = preview;
        } else if (state.state === 'POINT2_SET') {
          const direction = detectDimensionDirection(state.p1!, state.p2!, coord);
          const dimLinePosition = computeDimLinePosition(coord, direction);

          // Check for degenerate case
          const isDegenerate = direction === 'horizontal'
            ? Math.abs(dimLinePosition - state.p1![1]) < 1e-6 &&
              Math.abs(dimLinePosition - state.p2![1]) < 1e-6
            : Math.abs(dimLinePosition - state.p1![0]) < 1e-6 &&
              Math.abs(dimLinePosition - state.p2![0]) < 1e-6;

          if (isDegenerate) {
            resetState();
            return;
          }

          // Remove preview
          if (previewFeatureRef.current) {
            try {
              vectorSource.removeFeature(previewFeatureRef.current as Feature<Geometry>);
            } catch {
              // Already removed
            }
            previewFeatureRef.current = null;
          }

          // Compute dimension line endpoints for viewport culling
          const [dimP1, dimP2] = computeLinearDimLineEndpoints(
            state.p1!, state.p2!, direction, dimLinePosition
          );

          const feature = new Feature({
            geometry: new LineString([state.p1!, state.p2!, dimP1, dimP2]),
          });
          feature.set('isLinearDimension', true);
          feature.set('lineColor', lineColor || '#ff0c0c');
          feature.set('lineWidth', 0.2);
          feature.set('dimensionDirection', direction);
          feature.set('dimLinePosition', dimLinePosition);

          // Assign to active folder
          const activeFolder = useFolderStore.getState().activeFolderId;
          if (activeFolder) {
            feature.set('folderId', activeFolder);
          }

          vectorSource.addFeature(feature);

          // Reset for next dimension
          stateRef.current = { state: 'IDLE', p1: null, p2: null };
          marker1.setPosition(undefined);
          marker2.setPosition(undefined);
        }
      };

      const handlePointerMove = (e: any) => {
        const state = stateRef.current;
        if (state.state !== 'POINT2_SET' || !previewFeatureRef.current) return;

        const cursor: Coordinate = e.coordinate;
        const direction = detectDimensionDirection(state.p1!, state.p2!, cursor);
        const dimLinePosition = computeDimLinePosition(cursor, direction);

        previewFeatureRef.current.set('dimensionDirection', direction);
        previewFeatureRef.current.set('dimLinePosition', dimLinePosition);

        // Update geometry for correct viewport extent
        const [dimP1, dimP2] = computeLinearDimLineEndpoints(
          state.p1!, state.p2!, direction, dimLinePosition
        );
        previewFeatureRef.current.setGeometry(
          new LineString([state.p1!, state.p2!, dimP1, dimP2])
        );
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

        if (marker1Ref.current) {
          map.removeOverlay(marker1Ref.current);
          marker1Ref.current = null;
        }
        if (marker2Ref.current) {
          map.removeOverlay(marker2Ref.current);
          marker2Ref.current = null;
        }
        resetState();

        const vp = map.getViewport();
        if (vp) vp.style.cursor = '';
      };
    } else {
      // Cleanup when deactivated
      if (marker1Ref.current) {
        map.removeOverlay(marker1Ref.current);
        marker1Ref.current = null;
      }
      if (marker2Ref.current) {
        map.removeOverlay(marker2Ref.current);
        marker2Ref.current = null;
      }
      resetState();
    }
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction, lineColor, resetState]);
};
