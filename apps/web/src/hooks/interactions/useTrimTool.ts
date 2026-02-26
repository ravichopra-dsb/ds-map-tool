import { useEffect, useRef, useCallback } from "react";
import type { Select, Modify } from "ol/interaction";
import type Map from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import type { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import type { Geometry } from "ol/geom";
import {
  isTrimmableFeature,
  findAllIntersections,
  computeTrim,
  applyTrim,
  parameterizeAlongLine,
  getTrimmedIntervalCoords,
} from "@/utils/trimUtils";

interface UseTrimToolOptions {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  isActive: boolean;
  selectInteraction?: Select | null;
  modifyInteraction?: Modify | null;
}

export const useTrimTool = ({
  map,
  vectorLayer,
  isActive,
  selectInteraction,
  modifyInteraction,
}: UseTrimToolOptions): void => {
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
      // Disable select and modify during trim, clear any existing selection
      selectInteraction?.setActive(false);
      selectInteraction?.getFeatures().clear();
      modifyInteraction?.setActive(false);

      const vectorSource = vectorLayer.getSource();
      if (!vectorSource) return;

      // Set crosshair cursor
      const viewport = map.getViewport();
      if (viewport) viewport.style.cursor = "crosshair";

      // Create a canvas overlay for the trim preview
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

      // POINTERMOVE: compute and draw trim preview
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
            if (isTrimmableFeature(feat)) {
              hitFeature = feat;
              return true;
            }
          },
          { hitTolerance: 10 }
        );

        if (!hitFeature) return;
        const targetFeature = hitFeature as Feature<Geometry>;

        const intersections = findAllIntersections(targetFeature, vectorSource);
        if (intersections.length === 0) return;

        const geom = targetFeature.getGeometry() as LineString;
        const coords = geom.getCoordinates();
        const clickParam = parameterizeAlongLine(coords, coord);
        const result = computeTrim(coords, intersections, clickParam);

        if (!result) return;

        // Get the world coordinates of the trimmed segment
        const trimmedCoords = getTrimmedIntervalCoords(
          coords,
          result.trimmedInterval.start,
          result.trimmedInterval.end
        );

        // Convert to pixel coordinates and draw
        const pixels = trimmedCoords
          .map((wc) => map.getPixelFromCoordinate(wc))
          .filter((p): p is [number, number] => p !== null);

        if (pixels.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(pixels[0][0], pixels[0][1]);
          for (let i = 1; i < pixels.length; i++) {
            ctx.lineTo(pixels[i][0], pixels[i][1]);
          }
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      };

      // CLICK: perform the actual trim
      const handleClick = (e: any) => {
        const pixel: [number, number] = e.pixel;
        const coord = e.coordinate;

        let hitFeature: Feature<Geometry> | null = null;
        map.forEachFeatureAtPixel(
          pixel,
          (f) => {
            const feat = f as Feature<Geometry>;
            if (isTrimmableFeature(feat)) {
              hitFeature = feat;
              return true;
            }
          },
          { hitTolerance: 10 }
        );

        if (!hitFeature) return;
        const targetFeature = hitFeature as Feature<Geometry>;

        const intersections = findAllIntersections(targetFeature, vectorSource);
        if (intersections.length === 0) return;

        const geom = targetFeature.getGeometry() as LineString;
        const coords = geom.getCoordinates();
        const clickParam = parameterizeAlongLine(coords, coord);
        const result = computeTrim(coords, intersections, clickParam);

        if (!result) return;

        applyTrim(vectorSource, targetFeature, result);
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
  }, [isActive, map, vectorLayer, selectInteraction, modifyInteraction, clearPreview]);
};
