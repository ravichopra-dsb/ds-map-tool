import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import "./index.css";
import { router } from "./App.tsx";
import { RouterProvider } from "react-router";

const initializeApp = async () => {
  try {
    // Create default database that will always exist
    // const defaultDb = await PGlite.create('idb://default_db', {
    //   extensions: { live }
    // })

    // Initialize default project in localStorage
    const initializeDefaultProject = async () => {
      const stored = localStorage.getItem("mapProjects");

      if (!stored) {
        // Create default project entry
        const defaultProject = {
          id: "default-project",
          name: "My First Map",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        localStorage.setItem("mapProjects", JSON.stringify([defaultProject]));

        // Initialize default project's database
        const projectDb = await PGlite.create("idb://project_default-project", {
          extensions: { live },
        });

        await projectDb.query(`
          CREATE TABLE IF NOT EXISTS map_state (
            id INTEGER PRIMARY KEY,
            serialized_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        console.log("Default project initialized");
      }
    };

    await initializeDefaultProject();

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    );

    console.log("App initialized with default database");
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

initializeApp();
