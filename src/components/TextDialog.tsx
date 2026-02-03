import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, Edit2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useRef, useState, useEffect, useCallback } from "react";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import { DEFAULT_TEXT_STYLE } from "@/utils/featureTypeUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

const COLOR_OPTIONS = [
  { name: "Green", color: "#00ff00" },
  { name: "Red", color: "#ff0000" },
  { name: "Yellow", color: "#ffff00" },
  { name: "Cyan", color: "#00ffff" },
  { name: "Blue", color: "#0000ff" },
  { name: "Magenta", color: "#ff00ff" },
  { name: "White", color: "#ffffff" },
  { name: "Black", color: "#000000" },
] as const;

interface TextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    text: string,
    scale?: number,
    rotation?: number,
    opacity?: number,
    fillColor?: string,
    strokeColor?: string,
    textAlign?: "left" | "center" | "right",
  ) => void;
  coordinate: number[];
  initialText?: string;
  initialScale?: number;
  initialRotation?: number;
  initialOpacity?: number;
  initialFillColor?: string;
  initialStrokeColor?: string;
  initialTextAlign?: "left" | "center" | "right";
  isEditing?: boolean;
  editingTextFeature?: Feature<Geometry> | null;
}

export function TextDialog({
  isOpen,
  onClose,
  onSubmit,
  coordinate,
  initialText,
  initialScale,
  initialRotation,
  initialOpacity,
  initialFillColor,
  initialStrokeColor,
  initialTextAlign,
  isEditing = false,
  editingTextFeature,
}: TextDialogProps) {
  const [text, setText] = useState("");
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [fillColor, setFillColor] = useState<string>(
    DEFAULT_TEXT_STYLE.fillColor,
  );
  const [strokeColor, setStrokeColor] = useState<string>(
    DEFAULT_TEXT_STYLE.strokeColor,
  );
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [originalScale, setOriginalScale] = useState(1);
  const [originalRotation, setOriginalRotation] = useState(0);
  const [originalOpacity, setOriginalOpacity] = useState(1);
  const [originalFillColor, setOriginalFillColor] = useState<string>(
    DEFAULT_TEXT_STYLE.fillColor,
  );
  const [originalStrokeColor, setOriginalStrokeColor] = useState<string>(
    DEFAULT_TEXT_STYLE.strokeColor,
  );
  const [originalTextAlign, setOriginalTextAlign] = useState<"left" | "center" | "right">("center");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const handleCancelRef = useRef<() => void>(() => {});

  // Set initial values when dialog opens for editing
  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialText) {
        setText(initialText);
        setScale(Number(initialScale) || 1);
        setRotation(Number(initialRotation) || 0);
        setOpacity(initialOpacity != null ? Number(initialOpacity) : 1);
        setFillColor(initialFillColor || DEFAULT_TEXT_STYLE.fillColor);
        setStrokeColor(initialStrokeColor || DEFAULT_TEXT_STYLE.strokeColor);
        setTextAlign(initialTextAlign || "center");
        setIsEditMode(false);
        // Store original values for cancel operation
        setOriginalText(initialText);
        setOriginalScale(Number(initialScale) || 1);
        setOriginalRotation(Number(initialRotation) || 0);
        setOriginalOpacity(initialOpacity != null ? Number(initialOpacity) : 1);
        setOriginalFillColor(initialFillColor || DEFAULT_TEXT_STYLE.fillColor);
        setOriginalStrokeColor(
          initialStrokeColor || DEFAULT_TEXT_STYLE.strokeColor,
        );
        setOriginalTextAlign(initialTextAlign || "center");
      } else {
        setText("");
        setScale(1);
        setRotation(0);
        setOpacity(1);
        setFillColor(DEFAULT_TEXT_STYLE.fillColor);
        setStrokeColor(DEFAULT_TEXT_STYLE.strokeColor);
        setTextAlign("center");
        setIsEditMode(true); // Start in edit mode for new text
        setOriginalText("");
        setOriginalScale(1);
        setOriginalRotation(0);
        setOriginalOpacity(1);
        setOriginalFillColor(DEFAULT_TEXT_STYLE.fillColor);
        setOriginalStrokeColor(DEFAULT_TEXT_STYLE.strokeColor);
        setOriginalTextAlign("center");
      }
    }
  }, [
    isOpen,
    isEditing,
    initialText,
    initialScale,
    initialRotation,
    initialOpacity,
    initialFillColor,
    initialStrokeColor,
    initialTextAlign,
  ]);

  // Auto-focus input when entering edit mode for new text (after render)
  useEffect(() => {
    if (isOpen && isEditMode && !isEditing) {
      // Use setTimeout to ensure input is rendered before focusing
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isEditMode, isEditing]);

  // Handle click outside to close and deselect
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        // Use ref to always call the latest handleCancel (avoids stale closure)
        handleCancelRef.current();
      }
    };

    // Delay adding listener to avoid immediate trigger from the click that opened the dialog
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Live preview handlers - apply to feature for both new and existing text
  const handleTextChange = (newText: string) => {
    setText(newText);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("text", newText);
      editingTextFeature.changed();
    }
  };

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("textScale", newScale);
      editingTextFeature.changed();
    }
  };

  const handleRotationChange = (newRotation: number) => {
    setRotation(newRotation);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("textRotation", newRotation);
      editingTextFeature.changed();
    }
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("textOpacity", newOpacity);
      editingTextFeature.changed();
    }
  };

  const handleFillColorChange = (newColor: string) => {
    setFillColor(newColor);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("textFillColor", newColor);
      editingTextFeature.changed();
    }
  };

  const handleStrokeColorChange = (newColor: string) => {
    setStrokeColor(newColor);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("textStrokeColor", newColor);
      editingTextFeature.changed();
    }
  };

  const handleTextAlignChange = (newAlign: "left" | "center" | "right") => {
    setTextAlign(newAlign);
    // Apply live changes to feature for preview
    if (editingTextFeature) {
      editingTextFeature.set("textAlign", newAlign);
      editingTextFeature.changed();
    }
  };

  const handleCancel = useCallback(() => {
    // If editing existing text, revert changes to feature
    if (isEditing && editingTextFeature) {
      editingTextFeature.set("text", originalText);
      editingTextFeature.set("textScale", originalScale);
      editingTextFeature.set("textRotation", originalRotation);
      editingTextFeature.set("textOpacity", originalOpacity);
      editingTextFeature.set("textFillColor", originalFillColor);
      editingTextFeature.set("textStrokeColor", originalStrokeColor);
      editingTextFeature.set("textAlign", originalTextAlign);
      editingTextFeature.changed();
    }
    // For new text, the temporary feature will be removed by onClose handler in MapEditor
    setIsEditMode(false);
    onClose();
  }, [
    isEditing,
    editingTextFeature,
    originalText,
    originalScale,
    originalRotation,
    originalOpacity,
    originalFillColor,
    originalStrokeColor,
    originalTextAlign,
    onClose,
  ]);

  // Keep ref updated with latest handleCancel
  useEffect(() => {
    handleCancelRef.current = handleCancel;
  }, [handleCancel]);

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onSubmit(trimmedText, scale, rotation, opacity, fillColor, strokeColor, textAlign);
      setText("");
      setScale(1);
      setRotation(0);
      setOpacity(1);
      setFillColor(DEFAULT_TEXT_STYLE.fillColor);
      setStrokeColor(DEFAULT_TEXT_STYLE.strokeColor);
      setTextAlign("center");
      setIsEditMode(false);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.altKey) {
      // Alt+Enter: insert newline
      e.preventDefault();
      console.log("Alt+Enter key pressed");
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.substring(0, start) + "\n" + text.substring(end);
      handleTextChange(newText);
      // Set cursor position after the newline
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    } else if (e.key === "Enter" && !e.altKey) {
      e.preventDefault();
      console.log("only Enter key pressed");
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="absolute right-4 top-30 w-80 h-112 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xl border-l border-gray-200 dark:border-slate-700 z-50 animate-in fade-in-0 zoom-in-95 duration-200"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? "Edit Text" : "Enter Text"}
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCancel}
            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-0 space-y-6">
          <Card className="border-none shadow-none rounded-none">
            <CardContent className="space-y-3 p-0">
              {/* Style Section */}
              <div>
                {!isEditMode ? (
                  /* Display Mode */
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                        Text:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                        {text || (
                          <span className="italic text-gray-400">Empty</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                        Scale:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {scale.toFixed(1)}x
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                        Rotation:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {rotation}°
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                        Opacity:
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {Math.round(opacity * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                        Fill Color:
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: fillColor }}
                        />
                        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {fillColor.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                        Stroke Color:
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: strokeColor }}
                        />
                        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {strokeColor.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="space-y-4">
                    {/* Text Content Input */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Text
                      </Label>
                      <Textarea
                        ref={inputRef}
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Enter your text here... (Alt+Enter for new line)"
                        onKeyDown={handleKeyDown}
                        className="mt-1 min-h-[60px]"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Text Align
                      </Label>
                      <div className="flex gap-1 mt-1">
                        {(["left", "center", "right"] as const).map((align) => (
                          <Button
                            key={align}
                            variant={
                              textAlign === align
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handleTextAlignChange(align)}
                            className="flex-1 capitalize"
                          >
                            {align}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Scale: {scale.toFixed(1)}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Slider
                          value={[scale]}
                          onValueChange={(value) => handleScaleChange(value[0])}
                          min={0.1}
                          max={3.0}
                          step={0.1}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScaleChange(1)}
                          className="px-2 py-1 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rotation: {rotation}°
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Slider
                          value={[rotation]}
                          onValueChange={(value) =>
                            handleRotationChange(value[0])
                          }
                          min={0}
                          max={360}
                          step={1}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotationChange(0)}
                          className="px-2 py-1 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Opacity: {Math.round(opacity * 100)}%
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Slider
                          value={[opacity]}
                          onValueChange={(value) =>
                            handleOpacityChange(value[0])
                          }
                          min={0}
                          max={1}
                          step={0.05}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpacityChange(1)}
                          className="px-2 py-1 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    {/* Fill Color Picker */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fill Color
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={fillColor}
                          onChange={(e) =>
                            handleFillColorChange(e.target.value)
                          }
                          className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                            >
                              Choose Color
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-48 p-1 bg-white dark:bg-slate-800 rounded-sm shadow-lg z-60">
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                              value={fillColor}
                              onValueChange={(value) =>
                                handleFillColorChange(value)
                              }
                            >
                              {COLOR_OPTIONS.map((colorOption) => (
                                <DropdownMenuRadioItem
                                  key={colorOption.color}
                                  value={colorOption.color}
                                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                                >
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{
                                      backgroundColor: colorOption.color,
                                    }}
                                  />
                                  <span>{colorOption.name}</span>
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleFillColorChange(DEFAULT_TEXT_STYLE.fillColor)
                          }
                          className="px-2 py-1 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    {/* Stroke Color Picker */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Stroke Color
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) =>
                            handleStrokeColorChange(e.target.value)
                          }
                          className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                            >
                              Choose Color
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-48 p-1 bg-white dark:bg-slate-800 rounded-sm shadow-lg z-60">
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                              value={strokeColor}
                              onValueChange={(value) =>
                                handleStrokeColorChange(value)
                              }
                            >
                              {COLOR_OPTIONS.map((colorOption) => (
                                <DropdownMenuRadioItem
                                  key={colorOption.color}
                                  value={colorOption.color}
                                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-900/20"
                                >
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{
                                      backgroundColor: colorOption.color,
                                    }}
                                  />
                                  <span>{colorOption.name}</span>
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleStrokeColorChange(
                              DEFAULT_TEXT_STYLE.strokeColor,
                            )
                          }
                          className="px-2 py-1 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 pt-2">
                Position: {coordinate[0].toFixed(2)}, {coordinate[1].toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-linear-to-r from-gray-50 to-white dark:from-slate-700 dark:to-slate-800">
          <div className="flex gap-2">
            {isEditing && !isEditMode ? (
              /* View mode for existing text - show Edit button */
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  Close
                </Button>
              </>
            ) : (
              /* Edit mode - show Save/Cancel */
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="flex items-center gap-2"
                >
                  <Save className="h-3 w-3" />
                  {isEditing ? "Save" : "Add Text"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
