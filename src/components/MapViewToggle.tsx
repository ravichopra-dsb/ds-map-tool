import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';
import { Map, Layers } from 'lucide-react';

export type MapViewType = 'osm' | 'satellite';

interface MapViewToggleProps {
  currentView: MapViewType;
  onViewChange: (view: MapViewType) => void;
}

export function MapViewToggle({ currentView, onViewChange }: MapViewToggleProps) {
  return (
    <Card className="absolute bottom-2 right-2 z-10 p-1 shadow-lg">
      <ToggleGroup
        type="single"
        value={currentView}
        onValueChange={(value) => {
          if (value === 'osm' || value === 'satellite') {
            onViewChange(value);
          }
        }}
        className="gap-0"
      >
        <ToggleGroupItem
          value="osm"
          aria-label="OSM View"
          className="px-3 py-2 text-sm font-medium"
        >
          <Map className="w-4 h-4 mr-2" />
          OSM
        </ToggleGroupItem>
        <ToggleGroupItem
          value="satellite"
          aria-label="Satellite View"
          className="px-3 py-2 text-sm font-medium"
        >
          <Layers className="w-4 h-4 mr-2" />
          Satellite
        </ToggleGroupItem>
      </ToggleGroup>
    </Card>
  );
}