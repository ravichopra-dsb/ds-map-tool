import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...'
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
      <Card className="p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      </Card>
    </div>
  );
};