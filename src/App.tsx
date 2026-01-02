import { createBrowserRouter } from "react-router";
import MapEditor from "./pages/MapEditor";
import LayoutEditor from "./pages/LayoutEditor";
import LayoutsList from "./pages/LayoutsList";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: MapEditor },
      { path: "layouts", Component: LayoutsList },
      { path: "layout", Component: LayoutEditor },
      { path: "layout/:layoutId", Component: LayoutEditor },
    ],
  },
]);
