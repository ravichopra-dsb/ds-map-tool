interface DragBoxInstructionProps {
  isActive: boolean;
}

export function DragBoxInstruction({ isActive }: DragBoxInstructionProps) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Instruction box */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-3 max-w-2xl border-2 border-blue-500">
          <p className="text-gray-600 dark:text-gray-300">
            Click and drag on the map to select the area you want to export to PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
