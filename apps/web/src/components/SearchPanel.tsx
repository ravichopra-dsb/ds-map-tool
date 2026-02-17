import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import SearchNominatim from "ol-ext/control/SearchNominatim";
import type Map from "ol/Map";
import { Search, X, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getZoomForSearchResult,
  formatSearchResultName,
  getSearchResultDescription,
  convertSearchCoordinate,
} from "@/utils/searchUtils";

export interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
  boundingbox: [number, number, number, number];
  class?: string;
  type?: string;
  importance?: number;
  osm_id?: number;
  osm_type?: string;
  place_id?: number;
  licence?: string;
  icon?: string;
  address?: Record<string, any>;
}

export interface SearchPanelProps {
  map: Map;
  onLocationSelected?: (
    coordinate: [number, number],
    result: SearchResult
  ) => void;
  className?: string;
}

export interface SearchPanelRef {
  searchLocation: (query: string) => void;
  clearSearchResults: () => void;
  clearInput: () => void;
  getInputValue: () => string;
  focusInput: () => void;
}

export const SearchPanel = forwardRef<SearchPanelRef, SearchPanelProps>(
  ({ map, onLocationSelected, className = "" }, ref) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showCoordInput, setShowCoordInput] = useState(false);
    const [coordX, setCoordX] = useState("");
    const [coordY, setCoordY] = useState("");

    const searchControlRef = useRef<SearchNominatim | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Initialize search control
    useEffect(() => {
      if (!map) return;

      // Create hidden search control for backend functionality
      const searchControl = new SearchNominatim({
        title: "Search location",
        placeholder: "Search for a place...",
        reverseTitle: "Click on the map to get address",
        collapsed: true,
        typing: -1, // Disabled to respect Nominatim policy
        minLength: 3,
        maxItems: 10,
        maxHistory: 0, // Disable history since we handle it ourselves
        centerOnSelect: false, // We'll handle this manually
        zoomOnSelect: false, // We'll handle this manually
        url: "https://nominatim.openstreetmap.org/search",
      });

      // Hide the original ol-ext control after it's rendered
      // We'll use CSS to hide the ol-ext control elements
      const style = document.createElement("style");
      style.textContent = ".ol-search { display: none !important; }";
      document.head.appendChild(style);

      // Handle search selection from ol-ext
      searchControl.on("select", (event: any) => {
        const { coordinate, search } = event;

        // Animate to the location with appropriate zoom
        const zoom = getZoomForSearchResult(search);
        map.getView().animate({
          center: coordinate,
          zoom: zoom,
          duration: 1000,
        });

        // Clear custom state
        setQuery("");
        setResults([]);
        setShowResults(false);
        setSelectedIndex(-1);

        // Call custom callback
        if (onLocationSelected) {
          onLocationSelected(coordinate, search);
        }
      });

      // Add control to map
      map.addControl(searchControl as any);
      searchControlRef.current = searchControl;

      return () => {
        if (searchControlRef.current) {
          map.removeControl(searchControlRef.current as any);
        }
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [map, onLocationSelected]);

    // Perform search using the ol-ext control
    const performSearch = useCallback(async (searchQuery: string) => {
      if (!searchControlRef.current || searchQuery.length < 3) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);

      // Cancel any previous search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        // Use the ol-ext control's autocomplete functionality
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=10&addressdetails=1`,
          {
            signal: abortControllerRef.current.signal,
            headers: {
              "User-Agent": "ds-map-tool/1.0",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data: SearchResult[] = await response.json();

        // Set ol-ext control input to sync with it (this keeps it hidden but functional)
        searchControlRef.current.setInput(searchQuery, false);

        setResults(data);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search error:", error);
          setResults([]);
          setShowResults(false);
        }
      } finally {
        setIsLoading(false);
      }
    }, []);

    // Handle input changes with debouncing
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedIndex(-1);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search with 500ms delay to respect Nominatim policy
        if (value.length >= 3 || value.length === 0) {
          searchTimeoutRef.current = setTimeout(() => {
            performSearch(value);
          }, 500);
        }
      },
      [performSearch]
    );

    // Clear search
    const handleClear = useCallback(() => {
      setQuery("");
      setResults([]);
      setShowResults(false);
      setSelectedIndex(-1);
      if (searchControlRef.current) {
        searchControlRef.current.setInput("", false);
      }
    }, []);

    // Handle result selection
    const handleResultSelect = useCallback(
      (result: SearchResult) => {
        // Convert to map projection
        const mapCoordinate = convertSearchCoordinate(
          result.lon,
          result.lat,
          map
        );

        // Animate to the location with appropriate zoom
        const zoom = getZoomForSearchResult(result);
        map.getView().animate({
          center: mapCoordinate,
          zoom: zoom,
          duration: 1000,
        });

        // Clear custom state
        setQuery("");
        setResults([]);
        setShowResults(false);
        setSelectedIndex(-1);
        setIsFocused(false);

        // Call custom callback
        if (onLocationSelected) {
          onLocationSelected(mapCoordinate, result);
        }
      },
      [map, onLocationSelected]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!showResults || results.length === 0) return;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < results.length - 1 ? prev + 1 : prev
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
            break;
          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < results.length) {
              handleResultSelect(results[selectedIndex]);
            }
            break;
          case "Escape":
            e.preventDefault();
            handleClear();
            setShowCoordInput(false);
            setIsFocused(false);
            inputRef.current?.blur();
            break;
        }
      },
      [showResults, results, selectedIndex, handleResultSelect, handleClear]
    );

    // Handle input focus
    const handleInputFocus = useCallback(() => {
      setIsFocused(true);
      if (query.length >= 3 && results.length > 0) {
        setShowResults(true);
      }
    }, [query.length, results.length]);

    // Handle input blur
    const handleInputBlur = useCallback(() => {
      // Delay hiding results to allow for result clicks
      setTimeout(() => {
        if (!isFocused) {
          setShowResults(false);
        }
      }, 200);
    }, [isFocused]);

    // Handle click outside to close panel
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
          handleClear();
          setShowCoordInput(false);
        }
      };

      // Only add listener when search is active
      if (query || showResults || showCoordInput) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [query, showResults, showCoordInput, handleClear]);

    // Toggle coordinate input mode
    const handleToggleCoordInput = useCallback(() => {
      setShowCoordInput((prev) => !prev);
      setCoordX("");
      setCoordY("");
    }, []);

    // Handle coordinate search
    const handleCoordSearch = useCallback(() => {
      const x = parseFloat(coordX);
      const y = parseFloat(coordY);

      if (isNaN(x) || isNaN(y)) {
        return;
      }

      // Convert coordinates to map projection (assuming input is in WGS84/EPSG:4326)
      const mapCoordinate = convertSearchCoordinate(x, y, map);

      // Animate to the location
      map.getView().animate({
        center: mapCoordinate,
        zoom: Math.max(map.getView().getZoom() || 10, 14),
        duration: 1000,
      });

      // Clear coordinate inputs
      setCoordX("");
      setCoordY("");
      setShowCoordInput(false);
    }, [coordX, coordY, map]);

    // Handle coordinate input key press
    const handleCoordKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleCoordSearch();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowCoordInput(false);
          setCoordX("");
          setCoordY("");
        }
      },
      [handleCoordSearch]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        searchLocation: (searchQuery: string) => {
          setQuery(searchQuery);
          performSearch(searchQuery);
        },
        clearSearchResults: () => {
          if (searchControlRef.current) {
            searchControlRef.current.clearHistory();
          }
          setResults([]);
          setShowResults(false);
          setSelectedIndex(-1);
        },
        clearInput: () => {
          handleClear();
        },
        getInputValue: () => query,
        focusInput: () => {
          inputRef.current?.focus();
        },
      }),
      [query, performSearch, handleClear]
    );

    return (
      <div ref={panelRef} className={`absolute top-1 left-1/2 -translate-x-1/2 z-100 w-64 ${className}`}>
        <Card className="bg-white/95 backdrop-blur-sm border-0 p-0">
          <CardContent className="p-0">
            <div className="relative">
              <div className="flex items-center gap-2 p-1 pl-2">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search for a place..."
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 py-1 placeholder:text-gray-500"
                />
                {query ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleClear}
                    className="h-6 w-6 text-gray-500 hover:text-gray-700 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleToggleCoordInput}
                  className={`h-6 w-6 text-gray-500 hover:text-gray-700 shrink-0 text-xs font-medium ${showCoordInput ? "bg-gray-200" : ""}`}
                >
                  x/y
                </Button>
                )}
              </div>

              {/* Coordinate input fields */}
              {showCoordInput && (
                <div className="border-t border-gray-200 p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">X</span>
                    <Input
                      type="number"
                      placeholder="Longitude (e.g., 292.129)"
                      value={coordX}
                      onChange={(e) => setCoordX(e.target.value)}
                      onKeyDown={handleCoordKeyDown}
                      className="h-7 text-sm border-gray-300"
                      step="any"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">Y</span>
                    <Input
                      type="number"
                      placeholder="Latitude (e.g., 24.881)"
                      value={coordY}
                      onChange={(e) => setCoordY(e.target.value)}
                      onKeyDown={handleCoordKeyDown}
                      className="h-7 text-sm border-gray-300"
                      step="any"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCoordSearch}
                    disabled={!coordX || !coordY}
                    className="w-full h-7 text-xs"
                  >
                    Go to Coordinates
                  </Button>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="px-3 pb-2">
                  <div className="text-xs text-gray-500">Searching...</div>
                </div>
              )}

              {/* Search results dropdown */}
              {showResults && results.length > 0 && (
                <div className="border-t border-gray-200">
                  <div className="max-h-60 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={result.place_id || index}
                        className={`
                        px-3 py-2 cursor-pointer flex items-start gap-2 text-sm
                        hover:bg-gray-50 transition-colors
                        ${selectedIndex === index ? "bg-gray-100" : ""}
                        ${
                          index === 0
                            ? "border-t-0"
                            : "border-t border-gray-100"
                        }
                      `}
                        onClick={() => handleResultSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onMouseLeave={() => setSelectedIndex(-1)}
                      >
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {formatSearchResultName(result)}
                          </div>
                          <div className="text-gray-500 text-xs truncate">
                            {getSearchResultDescription(result)}
                          </div>
                          {result.class && (
                            <div className="text-gray-400 text-xs mt-0.5">
                              {result.class} {result.type && `• ${result.type}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results message */}
              {showResults &&
                !isLoading &&
                query.length >= 3 &&
                results.length === 0 && (
                  <div className="border-t border-gray-200 px-3 py-4 text-center">
                    <div className="text-sm text-gray-500">
                      No locations found
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Try a different search term
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

SearchPanel.displayName = "SearchPanel";

export default SearchPanel;
