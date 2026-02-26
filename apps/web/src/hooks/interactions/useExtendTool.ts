import { useEffect, useRef, useCallback } from "react";
import type { Select, Modify } from "ol/interaction";
import type Map from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import type { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import type { Geometry } from "ol/geom";
import { useToolStore } from "@/stores/useToolStore";
import {
  isExtendableFeature,
  findClosestEndpoint,
  computeExtend,
  applyExtend,
} from "@/utils/extendUtils";

interface UseExtendToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

export const useExtendTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseExtendToolOptions): void => {
  const previewLayerRef = useRef<HTMLCanvasElement | null>(null);

  const clearPreview = useCallback(() => {
    const canvas = previewLayerRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (isActive) {
      // Disable select and modify during extend, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      // Set crosshair cursor
      const viewport = map.getViewport();
      if (viewport) viewport.style.cursor = "crosshair";

      // Create a canvas overlay for the extend preview
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        pointer-events: none;
        width: 100%; height: 100%;
      `;
      canvas.width = viewport?.offsetWidth ?? 800;
      canvas.height = viewport?.offsetHeight ?? 600;
      viewport?.appendChild(canvas);
      previewLayerRef.current = canvas;

      // Resize canvas when viewport changes
      const resizeObserver = new ResizeObserver(() => {
        if (viewport) {
          canvas.width = viewport.offsetWidth;
          canvas.height = viewport.offsetHeight;
        }
      });
      if (viewport) resizeObserver.observe(viewport);

      // POINTERMOVE: compute and draw extend preview
      const handlePointerMove = (e: any) => {
        const pixel: [number, number] = e.pixel;
        const coord = e.coordinate;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let hitFeature: Feature<Geometry> | null = null;
        map.forEachFeatureAtPixel(
          pixel,
          (f) => {
            const feat = f as Feature<Geometry>;
            if (isExtendableFeature(feat)) {
              hitFeature = feat;
              return true;
            }
          },
          { hitTolerance: 10 }
        );

        if (!hitFeature) return;
        const targetFeature = hitFeature as Feature<Geometry>;

        const geom = targetFeature.getGeometry() as LineString;
        const coords = geom.getCoordinates();

        // Determine which endpoint is closer to the cursor
        const endpoint = findClosestEndpoint(coords, coord);

        // Compute the extend
        const result = computeExtend(targetFeature, endpoint, vectorSource);
        if (!result) return;

        // Draw preview: dashed line from endpoint to intersection point
        const endpointCoord =
          endpoint === "start" ? coords[0] : coords[coords.length - 1];
        const previewPixels = [endpointCoord, result.intersectionPoint]
          .map((wc) => map.getPixelFromCoordinate(wc))
          .filter((p): p is [number, number] => p !== null);

        if (previewPixels.length === 2) {
          ctx.beginPath();
          ctx.moveTo(previewPixels[0][0], previewPixels[0][1]);
          ctx.lineTo(previewPixels[1][0], previewPixels[1][1]);
          ctx.strokeStyle = "#00ff88";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw a small circle at the intersection point
          ctx.beginPath();
          ctx.arc(previewPixels[1][0], previewPixels[1][1], 4, 0, Math.PI * 2);
          ctx.fillStyle = "#00ff88";
          ctx.fill();
        }
      };

      // CLICK: perform the actual extend
      const handleClick = (e: any) => {
        const pixel: [number, number] = e.pixel;
        const coord = e.coordinate;

        let hitFeature: Feature<Geometry> | null = null;
        map.forEachFeatureAtPixel(
          pixel,
          (f) => {
            const feat = f as Feature<Geometry>;
            if (isExtendableFeature(feat)) {
              hitFeature = feat;
              return true;
            }
          },
          { hitTolerance: 10 }
        );

        if (!hitFeature) return;
        const targetFeature = hitFeature as Feature<Geometry>;

        const geom = targetFeature.getGeometry() as LineString;
        const coords = geom.getCoordinates();
        const endpoint = findClosestEndpoint(coords, coord);

        const result = computeExtend(targetFeature, endpoint, vectorSource);
        if (!result) return;

        const undoRedo = useToolStore.getState().undoRedoInteraction;
        applyExtend(vectorSource, targetFeature, result, undoRedo);
        clearPreview();
      };

      // ESCAPE: clear preview
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") clearPreview();
      };

      map.on("pointermove", handlePointerMove);
      map.on("click", handleClick);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        map.un("pointermove", handlePointerMove);
        map.un("click", handleClick);
        document.removeEventListener("keydown", handleKeyDown);
        resizeObserver.disconnect();

        canvas.remove();
        previewLayerRef.current = null;
        clearPreview();

        const vp = map.getViewport();
        if (vp) vp.style.cursor = "";
      };
    } else {
      // Cleanup when deactivated
      const canvas = previewLayerRef.current;
      if (canvas) {
        canvas.remove();
        previewLayerRef.current = null;
      }
      clearPreview();
    }
  }, [
    isActive,
    map,
    vectorLayer,
    selectInteraction,
    modifyInteraction,
    clearPreview,
  ]);
};
