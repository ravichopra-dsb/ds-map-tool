// hooks/useMapProjects.ts
import { useState, useEffect, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import SuperJSON from 'superjson';

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SerializedMapData {
  features: any;
  mapState?: {
    center: [number, number];
    zoom: number;
    viewMode: "osm" | "satellite";
  };
  folderStructure?: {
    folders: Record<string, any>;
  };
}

interface MapStateRow {
  id: number;
  serialized_data: string;
}

export const useMapProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentDb, setCurrentDb] = useState<PGlite | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjectsList = useCallback(async () => {
    try {
      const stored = localStorage.getItem('mapProjects');
      const projectsList = stored ? JSON.parse(stored) : [];
      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Failed to load projects list:', error);
      return [];
    }
  }, []);

  const saveProjectsList = useCallback(async (projectsList: Project[]) => {
    try {
      localStorage.setItem('mapProjects', JSON.stringify(projectsList));
      setProjects(projectsList);
    } catch (error) {
      console.error('Failed to save projects list:', error);
    }
  }, []);

  const createProject = async (name: string) => {
    try {
      const projectId = crypto.randomUUID();

      const db = new PGlite(`idb://project_${projectId}`, {
        extensions: { live }
      });

      await db.ready;

      // Initialize table on creation
      await db.query(`
        CREATE TABLE IF NOT EXISTS map_state (
          id INTEGER PRIMARY KEY,
          serialized_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const newProject: Project = {
        id: projectId,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedProjects = [...projects, newProject];
      await saveProjectsList(updatedProjects);

      console.log(`Created isolated DB for project: ${projectId}`);
      return projectId;
    } catch (error) {
      console.error('Failed to create project:', error);
      return null;
    }
  };

  // ✅ FIXED: Ensure table exists when loading
  const loadProject = async (projectId: string): Promise<PGlite | null> => {
    try {
      setIsLoading(true);
      console.log(`Loading project: ${projectId}`);

      const db = new PGlite(`idb://project_${projectId}`, {
        extensions: { live }
      });

      await db.ready;

      // Ensure map_state table exists
      await db.query(`
        CREATE TABLE IF NOT EXISTS map_state (
          id INTEGER PRIMARY KEY,
          serialized_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log(`Verified map_state table for project: ${projectId}`);

      setCurrentProjectId(projectId);
      setCurrentDb(db);

      console.log(`Successfully loaded isolated DB for project: ${projectId}`);
      setIsLoading(false);

      return db;
    } catch (error) {
      console.error('Failed to load project:', error);
      setIsLoading(false);
      return null;
    }
  };

  const saveMapState = async (mapData: SerializedMapData): Promise<boolean> => {
    if (!currentDb || !currentProjectId) {
      console.error('No database or project ID available');
      return false;
    }

    console.log(`Saving map state to project: ${currentProjectId}`);

    try {
      const serialized = JSON.stringify(SuperJSON.serialize(mapData));

      // ✅ Use UPSERT to avoid race conditions and data recreation
      // This atomically inserts if row doesn't exist, or updates if it does
      await currentDb.query(
        `INSERT INTO map_state (id, serialized_data, created_at, updated_at)
         VALUES (1, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET serialized_data = $1, updated_at = CURRENT_TIMESTAMP`,
        [serialized]
      );

      const updated = projects.map(p =>
        p.id === currentProjectId
          ? { ...p, updated_at: new Date().toISOString() }
          : p
      );
      await saveProjectsList(updated);

      console.log(`Saved to isolated DB: ${currentProjectId}`);
      return true;
    } catch (error) {
      console.error('Failed to save map state:', error);
      return false;
    }
  };

  const loadMapState = async (): Promise<SerializedMapData | null> => {
    if (!currentDb || !currentProjectId) {
      console.error('No database or project ID available');
      return null;
    }

    try {
      console.log(`Loading map state from project: ${currentProjectId}`);

      const result = await currentDb.query(
        'SELECT serialized_data FROM map_state WHERE id = 1'
      );

      if (result.rows.length === 0) {
        console.log('No saved state in this project');
        return null;
      }

      const row = result.rows[0] as unknown as MapStateRow;
      const mapData = SuperJSON.deserialize(
        JSON.parse(row.serialized_data)
      ) as SerializedMapData;

      console.log(`Loaded map state from isolated DB: ${currentProjectId}`);
      return mapData;
    } catch (error) {
      console.error('Failed to load map state:', error);
      return null;
    }
  };

  const updateProject = async (projectId: string, newName: string): Promise<boolean> => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        console.error('Project not found:', projectId);
        return false;
      }

      if (!newName.trim()) {
        console.error('Project name cannot be empty');
        return false;
      }

      const updatedProjects = projects.map(p =>
        p.id === projectId
          ? { ...p, name: newName.trim(), updated_at: new Date().toISOString() }
          : p
      );
      await saveProjectsList(updatedProjects);

      // Dispatch storage event to notify components
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "mapProjects",
          newValue: localStorage.getItem("mapProjects"),
        })
      );

      console.log(`Updated project ${projectId} name to: ${newName.trim()}`);
      return true;
    } catch (error) {
      console.error('Failed to update project:', error);
      return false;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      // 1. Update in-memory list + localStorage
      const updated = projects.filter((p) => p.id !== projectId);
      await saveProjectsList(updated);

      // 2. If this project is currently loaded, cleanly close PgLite
      console.log("currentProjectId", currentProjectId);
      console.log("projectId", projectId);
      console.log("currentDb : ", currentDb)
      
      if (currentProjectId === projectId) {
        await currentDb?.close();     // <- IMPORTANT
        console.log("currentDb : ", currentDb)
        setCurrentProjectId(null);
        setCurrentDb(null);
      }

      // 3. Delete the IndexedDB database
      const dbName = `/pglite/project_${projectId}`;
      await new Promise<boolean>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName);

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
        req.onblocked = () => {
          console.warn(`Deletion of ${dbName} is blocked. Close other tabs.`);
          resolve(false);
        };
      });

      // 4. Notify components
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "mapProjects",
          newValue: localStorage.getItem("mapProjects"),
        })
      );

      console.log(`Deleted project: ${projectId}`);
      return true;

    } catch (err) {
      console.error("Failed to delete project:", err);
      return false;
    }
  };

  useEffect(() => {
    loadProjectsList();
  }, [loadProjectsList]);

  // useMapProjects.ts - Add this useEffect
  useEffect(() => {
    // Listen for storage changes (from other tabs or same tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mapProjects') {
        console.log('Projects list changed, refreshing...');
        loadProjectsList();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadProjectsList]);


  return {
    projects,
    currentProjectId,
    currentDb,
    createProject,
    loadProject,
    saveMapState,
    loadMapState,
    updateProject,
    deleteProject,
    isLoading,
  };
};
