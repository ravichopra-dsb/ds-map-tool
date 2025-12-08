import React, { useEffect, useRef, useState } from "react";
import { Overlay } from "ol";
import type Map from "ol/Map";
import { X } from "lucide-react";

interface PopupManagerProps {
  map: Map | null;
}

export const PopupManager: React.FC<PopupManagerProps> = ({ map }) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupContent, setPopupContent] = useState<string | null>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!map || !popupRef.current) return;

    if (!popupOverlayRef.current) {
      const popupOverlay = new Overlay({
        element: popupRef.current,
        autoPan: {
          animation: { duration: 250 },
        },
        stopEvent: false,
      });
      map.addOverlay(popupOverlay);
      popupOverlayRef.current = popupOverlay;
    }

    return () => {
      if (popupOverlayRef.current) {
        map.removeOverlay(popupOverlayRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const handleMapClick = (event: any) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat);

      if (feature) {
        const properties = feature.getProperties();
        delete properties.geometry;

        const info =
          Object.keys(properties).length > 0
            ? Object.entries(properties)
                .map(([key, value]) => `<b>${key}:</b> ${value}`)
                .join("<br />")
            : "No additional info";

        setPopupContent(info);
        popupOverlayRef.current?.setPosition(event.coordinate);
      } else {
        setPopupContent(null);
        popupOverlayRef.current?.setPosition(undefined);
      }
    };

    map.on("click", handleMapClick);

    return () => {
      map.un("click", handleMapClick);
    };
  }, [map]);

  const handleClosePopup = () => {
    setPopupContent(null);
    popupOverlayRef.current?.setPosition(undefined);
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50"
      style={{ display: popupContent ? "block" : "none" }}
    >
      {/* Main Popup Container */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-auto h-60 w-96 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Feature Details
          </h3>
          <button
            onClick={handleClosePopup}
            className="flex items-center justify-center w-6 h-6 rounded transition-all duration-150 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
            aria-label="Close popup"
            type="button"
          >
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div
            className="space-y-2 text-xs leading-relaxed text-gray-700 dark:text-gray-300 [&>b]:font-semibold [&>b]:text-teal-600 dark:[&>b]:text-teal-400"
            dangerouslySetInnerHTML={{ __html: popupContent || "" }}
          />
        </div>
      </div>
    </div>
  );
};

export default PopupManager;
