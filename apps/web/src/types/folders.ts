export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level, string = nested in another folder
  isExpanded: boolean;
  order: number;
  createdAt: string;
}

export interface FolderStructure {
  folders: Record<string, Folder>;
  // featureToFolder mapping is stored on feature properties (folderId)
}
