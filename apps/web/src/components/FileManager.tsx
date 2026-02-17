import JSZip from "jszip";
import { Feature } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import type { Geometry } from "ol/geom";
import type Map from "ol/Map";
import { Vector as VectorSource } from "ol/source";
import React from "react";

export interface FileManagerProps {
  map: Map | null;
  vectorSource: VectorSource<Feature<Geometry>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const useFileHandler = (
  map: Map | null,
  vectorSource: VectorSource<Feature<Geometry>>,
) => {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = e.target?.result;
      if (!data) return;

      let features: Feature<Geometry>[] = [];

      try {
        if (name.endsWith(".geojson") || name.endsWith(".json")) {
          const json = JSON.parse(data as string);
          features = new GeoJSON().readFeatures(json, {
            featureProjection: "EPSG:3857",
          });
        } else if (name.endsWith(".kml")) {
          features = new KML({ extractStyles: false }).readFeatures(data, {
            featureProjection: "EPSG:3857",
          });
        } else if (name.endsWith(".kmz")) {
          const zip = await JSZip.loadAsync(file);
          const kmlFile = Object.keys(zip.files).find((f) =>
            f.toLowerCase().endsWith(".kml"),
          );
          if (kmlFile) {
            const kmlText = await zip.file(kmlFile)?.async("text");
            if (kmlText) {
              features = new KML({ extractStyles: false }).readFeatures(
                kmlText,
                {
                  featureProjection: "EPSG:3857",
                },
              );
            }
          }
        }

        if (features.length === 0) {
          alert("No valid features found in the file.");
          return;
        }

        vectorSource.clear();
        vectorSource.addFeatures(features);

        const extent = vectorSource.getExtent();
        if (extent) {
          map?.getView().fit(extent, {
            duration: 1000,
            padding: [50, 50, 50, 50],
          });
        } else {
          console.log("No extent found");
        }
      } catch (err) {
        alert("Invalid or unsupported file format.");
      }
    };

    if (name.endsWith(".kmz")) {
      // JSZip reads blob directly, no need to use FileReader
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  return { handleFileChange };
};

// This component is now simplified as the file input is handled in MapEditor
const FileManagerComponent: React.FC<FileManagerProps> = () => {
  return null; // Component doesn't render anything, file input is in MapEditor
};

export default FileManagerComponent;
