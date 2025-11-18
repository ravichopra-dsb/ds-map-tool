import React, { useEffect, useRef } from "react";
import { Modify, Select } from "ol/interaction";
import { Collection } from "ol";
import { click } from "ol/events/condition";
import Transform from "ol-ext/interaction/Transform";
import type Map from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import {
  isSelectableFeature,
  isEditableFeature,
} from "@/utils/featureTypeUtils";
import { recalculateMeasureDistances } from "@/utils/interactionUtils";

export interface MapInteractionsProps {
  map: Map | null;
  vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>> | null;
  activeTool: string;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
}

export const MapInteractions: React.FC<MapInteractionsProps> = ({
  map,
  vectorLayer,
  activeTool,
  onFeatureSelect,
}) => {
  const selectInteractionRef = useRef<Select | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const transformInteractionRef = useRef<Transform | null>(null);
  const transformSelectInteractionRef = useRef<Select | null>(null);
  const transformFeaturesRef = useRef<Collection<Feature<Geometry>> | null>(
    null
  );

  // Initialize select and modify interactions
  useEffect(() => {
    if (!map || !vectorLayer) return;

    // ✅ Select + Modify interactions with feature type filtering
    const selectInteraction = new Select({
      condition: click,
      layers: [vectorLayer],
      filter: isSelectableFeature,
    });

    // Create a separate collection for editable features
    const editableFeatures = new Collection<Feature<Geometry>>();
    const modifyInteraction = new Modify({
      features: editableFeatures,
    });

    // Add modify event handling for distance recalculation
    modifyInteraction.on("modifyend", (event) => {
      const features = event.features.getArray();

      // Filter for measure features and recalculate distances
      const measureFeatures = features.filter((feature) =>
        feature.get("isMeasure")
      );
      if (measureFeatures.length > 0) {
        recalculateMeasureDistances(measureFeatures);
      }
    });

    map.addInteraction(selectInteraction);
    map.addInteraction(modifyInteraction);

    selectInteraction.on("select", (e) => {
      onFeatureSelect(e.selected[0] || null);

      // Clear editable features collection
      editableFeatures.clear();

      // Add only editable features to the modify collection
      e.selected.forEach((feature) => {
        if (isEditableFeature(feature as Feature<Geometry>)) {
          editableFeatures.push(feature as Feature<Geometry>);
        }
      });
    });

    selectInteractionRef.current = selectInteraction;
    modifyInteractionRef.current = modifyInteraction;

    return () => {
      if (selectInteractionRef.current) {
        map.removeInteraction(selectInteractionRef.current);
      }
      if (modifyInteractionRef.current) {
        map.removeInteraction(modifyInteractionRef.current);
      }
    };
  }, [map, vectorLayer, onFeatureSelect]);

  // Handle transform tool activation/deactivation
  useEffect(() => {
    if (!map || !vectorLayer) return;

    if (activeTool === "transform") {
      // Deactivate modify interaction to prevent vertex editing during transform
      if (modifyInteractionRef.current) {
        modifyInteractionRef.current.setActive(false);
      }

      // Create dedicated feature collection for transform
      transformFeaturesRef.current = new Collection<Feature<Geometry>>();

      // Create transform selection interaction to add features to transform collection
      const transformSelectInteraction = new Select({
        condition: click,
        layers: [vectorLayer],
        style: null,
      });

      // When transform selection happens, add features to transform collection
      transformSelectInteraction.on("select", (e) => {
        // Clear previous selection
        transformFeaturesRef.current?.clear();

        // Add newly selected features to transform collection
        e.selected.forEach((feature) => {
          transformFeaturesRef.current?.push(feature);
        });
      });

      // Add selection interaction to map
      map.addInteraction(transformSelectInteraction);
      transformSelectInteractionRef.current = transformSelectInteraction;

      // Create transform interaction with proper configuration
      const newTransformInteraction = new Transform({
        features: transformFeaturesRef.current, // Use dedicated collection
        layers: [vectorLayer], // Restrict to vector layer
        translate: true, // Enable move/translate
        translateFeature: true, // Enable direct feature translation
        rotate: true, // Enable rotation
        scale: true, // Enable scaling
        stretch: true, // Enable stretching
        keepAspectRatio: (e) => e.originalEvent.shiftKey, // Hold Shift for aspect ratio
        hitTolerance: 3, // Better hit tolerance for selection
        filter: (feature) => {
          const isMeasure = feature.get("isMeasure");

          // Disable rotate / scale / stretch if it's a measure feature
          if (isMeasure) {
            newTransformInteraction.set("rotate", false);
            newTransformInteraction.set("scale", false);
            newTransformInteraction.set("stretch", false);
          } else {
            newTransformInteraction.set("rotate", true);
            newTransformInteraction.set("scale", true);
            newTransformInteraction.set("stretch", true);
          }

          // Only allow transformation of editable features
          return true;
        },
      });

      // Add and activate transform interaction
      map.addInteraction(newTransformInteraction as any);
      transformInteractionRef.current = newTransformInteraction;
      newTransformInteraction.setActive(true);
    } else {
      // Remove transform interaction when switching away from transform tool
      if (transformInteractionRef.current) {
        transformInteractionRef.current.setActive(false);
        if (
          map
            .getInteractions()
            .getArray()
            .includes(transformInteractionRef.current as any)
        ) {
          map.removeInteraction(transformInteractionRef.current as any);
        }
        transformInteractionRef.current = null;
      }

      // Remove transform selection interaction when switching away from transform tool
      if (transformSelectInteractionRef.current) {
        if (
          map
            .getInteractions()
            .getArray()
            .includes(transformSelectInteractionRef.current)
        ) {
          map.removeInteraction(transformSelectInteractionRef.current);
        }
        transformSelectInteractionRef.current = null;
      }

      // Clear transform features collection when switching away from transform tool
      if (transformFeaturesRef.current) {
        transformFeaturesRef.current.clear();
        transformFeaturesRef.current = null;
      }

      // Reactivate modify interaction when switching away from transform tool
      if (modifyInteractionRef.current) {
        modifyInteractionRef.current.setActive(true);
      }
    }

    return () => {
      // Cleanup transform interactions
      if (transformInteractionRef.current) {
        map.removeInteraction(transformInteractionRef.current as any);
      }
      if (transformSelectInteractionRef.current) {
        map.removeInteraction(transformSelectInteractionRef.current);
      }
    };
  }, [activeTool, map, vectorLayer]);

  // Handle select interaction activation/deactivation - only enable for select and transform tools
  useEffect(() => {
    if (!map || !selectInteractionRef.current) return;

    if (activeTool === "select" || activeTool === "transform") {
      // Enable selection only for select and transform tools
      selectInteractionRef.current.setActive(true);
    } else {
      // Disable selection for all other tools (drawing, navigation, icon tools, etc.)
      selectInteractionRef.current.setActive(false);
    }
  }, [activeTool, map]);

  return null; // This component doesn't render anything
};

export default MapInteractions;
