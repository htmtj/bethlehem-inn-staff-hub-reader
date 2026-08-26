import { Route, Routes, useLocation } from "react-router-dom";
import { AdminPage } from "./admin/AdminPage";
import { AppShell } from "./components/AppShell";
import { DepartmentPage } from "./pages/DepartmentPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { HomePage } from "./pages/HomePage";
import { NewsDetailPage } from "./pages/NewsDetailPage";
import { NewsPage } from "./pages/NewsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { UpcomingPage } from "./pages/UpcomingPage";

export default function App() {
  const location = useLocation();

  if (location.pathname === "/admin" || location.pathname.startsWith("/admin/")) {
    return <AdminPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<NewsPage />} path="/news" />
        <Route element={<NewsDetailPage />} path="/news/:slug" />
        <Route element={<UpcomingPage />} path="/upcoming" />
        <Route element={<DepartmentsPage />} path="/departments" />
        <Route element={<DepartmentPage />} path="/departments/:departmentId" />
        <Route element={<ResourcesPage />} path="/resources" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </AppShell>
  );
}
