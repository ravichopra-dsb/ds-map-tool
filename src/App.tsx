import { Route, Routes } from "react-router";
import MapEditor from "./pages/MapEditor";
import LayoutEditor from "./pages/LayoutEditor";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MapEditor />} />
      <Route path="/layout" element={<LayoutEditor />} />
    </Routes>
  )
}

export default App;
