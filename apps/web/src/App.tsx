import { createBrowserRouter, createHashRouter, redirect } from "react-router";
import MapEditor from "./pages/MapEditor";
import LayoutEditor from "./pages/LayoutEditor";
import LayoutsList from "./pages/LayoutsList";
import JobWelcome from "./pages/JobWelcome";
import { isDesktop } from "./utils/platformUtils";

const routes = [
  {
    path: "/",
    children: [
      { index: true, Component: JobWelcome },
      { path: "map/:projectName/:projectId", Component: MapEditor },
      {
        path: "map",
        loader: () => {
          throw redirect("/");
        },
      },
      { path: "layouts", Component: LayoutsList },
      { path: "layout", Component: LayoutEditor },
      { path: "layout/:layoutId", Component: LayoutEditor },
    ],
  },
];

export const router = isDesktop()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);
