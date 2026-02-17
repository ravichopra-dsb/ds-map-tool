import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map, Layers, Eye, EyeOff } from 'lucide-react';
import { useToolStore } from '@/stores/useToolStore';

export type MapViewType = 'osm' | 'satellite';

interface MapViewToggleProps {
  currentView: MapViewType;
  onViewChange: (view: MapViewType) => void;
}

export function MapViewToggle({ currentView, onViewChange }: MapViewToggleProps) {
  const { resolutionScalingEnabled, toggleResolutionScaling } = useToolStore();

  return (
    <>
    <Card className="absolute bottom-2 right-2 z-10 p-1 shadow-lg flex items-center gap-1">
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
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleResolutionScaling}
        title={resolutionScalingEnabled ? "Disable resolution scaling" : "Enable resolution scaling"}
        className={`absolute bottom-2 right-55 z-10 size-10 rounded-lg shadow-lg bg-white ${!resolutionScalingEnabled ? 'text-muted-foreground' : ''}`}
      >
        {!resolutionScalingEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </Button>
    </>
  );
}