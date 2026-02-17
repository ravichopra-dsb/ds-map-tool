/**
 * Generates a URL-safe slug from project name
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 */
export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates map URL for a project
 * Returns URL path like /map/{projectId}/{slugifiedName}
 */
export function getMapUrl(projectId: string, projectName: string): string {
  const slug = slugifyProjectName(projectName);
  return `/map/${slug}/${projectId}`;
}
