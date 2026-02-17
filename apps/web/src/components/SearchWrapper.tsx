import { forwardRef } from 'react';
import SearchPanel from './SearchPanel';
import type Map from 'ol/Map';
import type { SearchResult } from './SearchPanel';

export interface SearchWrapperRef {
  searchLocation: (query: string) => void;
  clearSearchResults: () => void;
  clearInput: () => void;
  getInputValue: () => string;
  focusInput: () => void;
}

export interface SearchWrapperProps {
  map: Map;
  onLocationSelected?: (coordinate: [number, number], result: SearchResult) => void;
  className?: string;
}

export const SearchWrapper = forwardRef<SearchWrapperRef, SearchWrapperProps>(
  ({ map, onLocationSelected, className }, ref) => {
    return (
      <SearchPanel
        map={map}
        onLocationSelected={onLocationSelected}
        className={className}
        ref={ref}
      />
    );
  }
);

SearchWrapper.displayName = 'SearchWrapper';

export default SearchWrapper;