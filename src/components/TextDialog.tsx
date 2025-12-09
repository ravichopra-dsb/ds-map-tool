import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useRef, useState, useEffect } from "react";

interface TextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  coordinate: number[];
  initialText?: string;
  isEditing?: boolean;
}

export function TextDialog({ isOpen, onClose, onSubmit, coordinate, initialText, isEditing = false }: TextDialogProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Set initial text when dialog opens for editing
  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialText) {
        setText(initialText);
      } else {
        setText("");
      }
      // Auto-focus input when dialog opens
      if (inputRef.current) {
        inputRef.current.focus();
        // Select all text for editing
        if (isEditing && initialText) {
          inputRef.current.select();
        }
      }
    }
  }, [isOpen, isEditing, initialText]);

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onSubmit(trimmedText);
      setText("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-4 top-20 w-80 h-112 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? "Edit Text" : "Enter Text"}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p- space-y-6">
          <Card className="border-none shadow-none rounded-none">
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Text Content
                </Label>
                <Input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter your text here..."
                  onKeyDown={handleKeyDown}
                  className="mt-1"
                />
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                Position: {coordinate[0].toFixed(2)}, {coordinate[1].toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex items-center gap-2"
            >
              {isEditing ? "Update Text" : "Add Text"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}