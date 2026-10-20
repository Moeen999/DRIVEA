import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Drive from "./pages/Drive";
import ProtectedRoutes from "./components/auth/ProtectedRoutes";
import DashboardLayout from "./components/layout/DashboardLayout";
import SharedFile from "./pages/SharedFile";
import Trash from "./pages/Trash";
import SharedWithMe from "./pages/SharedWithMe";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/register" element={<Login mode="register" />} />
        <Route path="s/:token" element={<SharedWithMe />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes />}>
        <Route element={<DashboardLayout/>}>
          <Route path="/" element={<Drive />} />
          <Route path="/drive/:folderId" element={<Drive />} />
          <Route path="/shared" element={<SharedFile />} />
          <Route path="/trash" element={<Trash/>} />
        </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

export default App;
