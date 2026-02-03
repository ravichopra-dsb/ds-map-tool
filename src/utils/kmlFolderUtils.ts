import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Folder, FolderStructure } from "@/types/folders";

// ============================================================================
// TYPES
// ============================================================================

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  children: FolderNode[];
  featureIndices: number[]; // Indices into the features array
}

export interface ParsedFolderStructure {
  folders: Record<string, Folder>;
  featureFolderMap: Map<number, string>; // placemark index -> folderId
}

// ============================================================================
// XML UTILITIES
// ============================================================================

/**
 * Pre-process KML text to assign unique IDs to each Placemark.
 * OpenLayers KML parser merges Placemarks with the same id attribute,
 * so we need to ensure each Placemark has a unique ID before parsing.
 */
export function assignUniquePlacemarkIds(kmlText: string): string {
  let placemarkIndex = 0;

  // Replace each <Placemark ...> or <Placemark> with a unique ID
  return kmlText.replace(/<Placemark(\s[^>]*)?>/gi, (_match, attributes) => {
    const uniqueId = `pm_${Date.now()}_${placemarkIndex++}`;

    // Check if there's already an id attribute
    if (attributes && /\sid=["'][^"']*["']/i.test(attributes)) {
      // Replace existing id with unique one
      const newAttributes = attributes.replace(
        /\sid=["'][^"']*["']/i,
        ` id="${uniqueId}"`
      );
      return `<Placemark${newAttributes}>`;
    } else if (attributes) {
      // Add id to existing attributes
      return `<Placemark${attributes} id="${uniqueId}">`;
    } else {
      // No attributes, add id
      return `<Placemark id="${uniqueId}">`;
    }
  });
}

/**
 * Escape special XML characters
 */
export const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * Extract document name from KML DOM
 */
const getDocumentName = (doc: Document): string => {
  const nameEl = doc.querySelector("Document > name");
  return nameEl?.textContent || "map-export";
};

// ============================================================================
// FOLDER TREE BUILDING
// ============================================================================

/**
 * Build hierarchical folder tree from flat folder structure
 * Groups features by their folderId
 */
export function buildFolderTree(
  folders: Record<string, Folder>,
  features: Feature<Geometry>[]
): {
  rootFolders: FolderNode[];
  unassignedFeatureIndices: number[];
} {
  // 1. Create folder nodes
  const folderNodes: Map<string, FolderNode> = new Map();

  Object.values(folders).forEach((folder) => {
    folderNodes.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      order: folder.order,
      children: [],
      featureIndices: [],
    });
  });

  // 2. Assign features to folders by index
  const unassignedFeatureIndices: number[] = [];

  features.forEach((feature, index) => {
    const folderId = feature.get("folderId");
    if (folderId && folderNodes.has(folderId)) {
      folderNodes.get(folderId)!.featureIndices.push(index);
    } else {
      unassignedFeatureIndices.push(index);
    }
  });

  // 3. Build parent-child relationships
  const rootFolders: FolderNode[] = [];

  folderNodes.forEach((node) => {
    if (node.parentId && folderNodes.has(node.parentId)) {
      folderNodes.get(node.parentId)!.children.push(node);
    } else {
      rootFolders.push(node);
    }
  });

  // 4. Sort by order
  const sortByOrder = (a: FolderNode, b: FolderNode) => a.order - b.order;
  rootFolders.sort(sortByOrder);
  folderNodes.forEach((node) => node.children.sort(sortByOrder));

  return { rootFolders, unassignedFeatureIndices };
}

// ============================================================================
// KML FOLDER GENERATION
// ============================================================================

/**
 * Generate KML Folder XML element recursively
 */
function generateKmlFolderXml(
  folderNode: FolderNode,
  placemarkXmlByIndex: Map<number, string>,
  indent: string = "    "
): string {
  let xml = `${indent}<Folder>\n`;
  xml += `${indent}  <name>${escapeXml(folderNode.name)}</name>\n`;

  // Add Placemarks for features in this folder
  folderNode.featureIndices.forEach((featureIndex) => {
    const placemarkXml = placemarkXmlByIndex.get(featureIndex);
    if (placemarkXml) {
      // Indent the placemark XML properly
      const indentedPlacemark = placemarkXml
        .split("\n")
        .map((line) => (line.trim() ? `${indent}  ${line}` : ""))
        .filter((line) => line)
        .join("\n");
      xml += indentedPlacemark + "\n";
    }
  });

  // Recursively add child folders
  folderNode.children.forEach((child) => {
    xml += generateKmlFolderXml(child, placemarkXmlByIndex, indent + "  ");
  });

  xml += `${indent}</Folder>\n`;
  return xml;
}

/**
 * Restructure flat KML string to hierarchical KML with Folder elements
 */
export function restructureKmlWithFolders(
  flatKmlString: string,
  folders: Record<string, Folder>,
  features: Feature<Geometry>[]
): string {
  // 1. Parse the flat KML
  const parser = new DOMParser();
  const doc = parser.parseFromString(flatKmlString, "text/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    console.warn("KML parse error, returning original string");
    return flatKmlString;
  }

  // 2. Extract all Placemark elements and map by index
  const placemarks = doc.querySelectorAll("Placemark");
  const placemarkXmlByIndex = new Map<number, string>();

  placemarks.forEach((placemark, index) => {
    // Get outer HTML of placemark
    const serializer = new XMLSerializer();
    placemarkXmlByIndex.set(index, serializer.serializeToString(placemark));
  });

  // 3. Extract all Style elements
  const styles = doc.querySelectorAll("Style");
  const stylesXml = Array.from(styles)
    .map((s) => {
      const serializer = new XMLSerializer();
      return "    " + serializer.serializeToString(s);
    })
    .join("\n");

  // 4. Build folder tree
  const { rootFolders, unassignedFeatureIndices } = buildFolderTree(
    folders,
    features
  );

  // 5. Build new Document content
  const documentName = getDocumentName(doc);
  let newContent = "";

  // Add styles first
  if (stylesXml) {
    newContent += stylesXml + "\n";
  }

  // Add folder hierarchy
  rootFolders.forEach((folder) => {
    newContent += generateKmlFolderXml(folder, placemarkXmlByIndex, "    ");
  });

  // Add unassigned features at root level
  unassignedFeatureIndices.forEach((featureIndex) => {
    const placemarkXml = placemarkXmlByIndex.get(featureIndex);
    if (placemarkXml) {
      const indentedPlacemark = placemarkXml
        .split("\n")
        .map((line) => (line.trim() ? `    ${line}` : ""))
        .filter((line) => line)
        .join("\n");
      newContent += indentedPlacemark + "\n";
    }
  });

  // 6. Reconstruct KML
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(documentName)}</name>
${newContent}  </Document>
</kml>`;
}

// ============================================================================
// KML FOLDER PARSING (IMPORT)
// ============================================================================

/**
 * Parse folder structure from KML text
 * Returns folder hierarchy and mapping of placemark indices to folder IDs
 */
export function parseKmlFolders(kmlText: string): ParsedFolderStructure {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "text/xml");

  const folders: Record<string, Folder> = {};
  const featureFolderMap = new Map<number, string>();
  let placemarkIndex = 0;
  let folderOrder = 0;

  function processElement(element: Element, parentFolderId: string | null) {
    const children = Array.from(element.children);

    children.forEach((child) => {
      if (child.tagName === "Folder") {
        // Get folder name
        const nameEl = child.querySelector(":scope > name");
        const folderName = nameEl?.textContent || "Unnamed Folder";
        const folderId = `folder_import_${Date.now()}_${folderOrder}`;
        folderOrder++;

        folders[folderId] = {
          id: folderId,
          name: folderName,
          parentId: parentFolderId,
          isExpanded: true,
          order: folderOrder,
          createdAt: new Date().toISOString(),
        };

        // Process nested content
        processElement(child, folderId);
      } else if (child.tagName === "Placemark") {
        // Map this placemark to current folder
        if (parentFolderId) {
          featureFolderMap.set(placemarkIndex, parentFolderId);
        }
        placemarkIndex++;
      }
    });
  }

  const documentEl = doc.querySelector("Document");
  if (documentEl) {
    processElement(documentEl, null);
  }

  return { folders, featureFolderMap };
}

// ============================================================================
// GEOJSON FOLDER UTILITIES
// ============================================================================

/**
 * Interface for exported GeoJSON with folder structure
 */
export interface ExportedGeoJSON {
  type: "FeatureCollection";
  features: unknown[];
  dsMapTool?: {
    version: string;
    folderStructure: FolderStructure;
  };
}

/**
 * Create exported GeoJSON with folder structure
 */
export function createExportedGeoJSON(
  featureCollection: { type: string; features: unknown[] },
  folderStructure?: FolderStructure
): ExportedGeoJSON {
  return {
    type: "FeatureCollection",
    features: featureCollection.features || [],
    dsMapTool: {
      version: "1.0",
      folderStructure: folderStructure || { folders: {} },
    },
  };
}

/**
 * Extract folder structure from imported GeoJSON
 */
export function extractFolderStructureFromGeoJSON(
  json: unknown
): FolderStructure | null {
  if (
    typeof json === "object" &&
    json !== null &&
    "dsMapTool" in json &&
    typeof (json as { dsMapTool?: unknown }).dsMapTool === "object"
  ) {
    const dsMapTool = (json as { dsMapTool: { folderStructure?: unknown } })
      .dsMapTool;
    if (dsMapTool?.folderStructure) {
      return dsMapTool.folderStructure as FolderStructure;
    }
  }
  return null;
}
