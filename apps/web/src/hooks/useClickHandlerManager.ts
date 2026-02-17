import { useRef, useEffect } from "react";
import { Map as OlMap } from "ol";

/**
 * Click handler configuration interface
 */
export interface ClickHandlerConfig {
  toolId: string;
  handlerKey: string;
  onClick: (coordinate: number[], vectorSource: any) => void;
}

/**
 * Hook for managing click handlers for different tools
 * Provides automatic cleanup when switching tools
 */
export const useClickHandlerManager = () => {
  const activeHandlersRef = useRef<Map<string, any>>(new Map());

  /**
   * Register a click handler for a specific tool
   * @param map - OpenLayers map instance
   * @param config - Click handler configuration
   * @param vectorSource - Vector source for the tool
   */
  const registerClickHandler = (
    map: OlMap,
    config: ClickHandlerConfig,
    vectorSource: any
  ) => {
    if (!map) return;

    // Remove any existing handler with the same key
    removeClickHandler(map, config.handlerKey);

    // Create new click handler
    const clickHandler = (event: any) => {
      const coordinate = event.coordinate;
      config.onClick(coordinate, vectorSource);
    };

    // Register the handler
    map.on("click", clickHandler);

    // Store handler reference for cleanup
    activeHandlersRef.current.set(config.handlerKey, clickHandler);

    // Also store on map instance for compatibility with existing code
    (map as any)[config.handlerKey] = clickHandler;
  };

  /**
   * Remove a specific click handler
   * @param map - OpenLayers map instance
   * @param handlerKey - Key of the handler to remove
   */
  const removeClickHandler = (map: OlMap, handlerKey: string) => {
    if (!map) return;

    const existingHandler = activeHandlersRef.current.get(handlerKey);
    if (existingHandler) {
      map.un("click", existingHandler);
      activeHandlersRef.current.delete(handlerKey);

      // Remove from map instance for compatibility
      delete (map as any)[handlerKey];
    }
  };

  /**
   * Remove all registered click handlers
   * @param map - OpenLayers map instance
   */
  const removeAllClickHandlers = (map: OlMap) => {
    if (!map) return;

    activeHandlersRef.current.forEach((handler: any, key: string) => {
      map.un("click", handler);
      delete (map as any)[key];
    });

    activeHandlersRef.current.clear();
  };

  /**
   * Get all active handler keys
   * @returns Array of active handler keys
   */
  const getActiveHandlers = (): string[] => {
    return Array.from(activeHandlersRef.current.keys());
  };

  /**
   * Check if a handler is currently active
   * @param handlerKey - Key to check
   * @returns True if handler is active
   */
  const isHandlerActive = (handlerKey: string): boolean => {
    return activeHandlersRef.current.has(handlerKey);
  };

  /**
   * Cleanup all handlers on unmount
   */
  useEffect(() => {
    return () => {
      activeHandlersRef.current.clear();
    };
  }, []);

  return {
    registerClickHandler,
    removeClickHandler,
    removeAllClickHandlers,
    getActiveHandlers,
    isHandlerActive,
  };
};

/**
 * Default click handler configurations for common tools
 */
export const DEFAULT_CLICK_HANDLERS = {
  triangle: {
    toolId: "triangle",
    handlerKey: "triangleClickHandler",
  },
  pit: {
    toolId: "pit",
    handlerKey: "PitClickHandler",
  },
  gp: {
    toolId: "gp",
    handlerKey: "GpClickHandler",
  },
  junction: {
    toolId: "junction",
    handlerKey: "JuctionPointClickHandler",
  },
  tower: {
    toolId: "tower",
    handlerKey: "TowerClickHandler",
  },
} as const;