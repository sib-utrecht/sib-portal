import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../dashboard";
import { LoginForm } from "../components/login-form";
import ActivitiesPage from "../app/activities/page";
import NewActivityPage from "../app/activities/new/page";
import ActivityPage from "../app/activities/[id]/activity-page-client";
import EditActivityPage from "../app/activities/[id]/edit/edit-page-client";
import { AdminDashboard } from "../components/admin-dashboard";
import { RequireAuth } from "../components/require-auth";
import { RequireAdmin } from "../components/require-admin";
import StoragePage from "../app/admin/storage/page";
import SettingsPage from "../app/settings/page";
import PhotoPermissionsPage from "../app/photo-permissions/page";
import TwoFAPage from "../app/2fa/page";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">Loading...</div>
);

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        }
      />
      <Route
        path="/login"
        element={
          <Suspense fallback={<Loading />}>
            <LoginForm />
          </Suspense>
        }
      />
      <Route path="/activities" element={<ActivitiesPage />} />
      <Route path="/activities/new" element={<NewActivityPage />} />
      <Route path="/activities/:id" element={<ActivityPage />} />
      <Route path="/activities/:id/edit" element={<EditActivityPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route path="/admin/storage" element={<StoragePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/photo-permissions" element={<PhotoPermissionsPage />} />
      <Route path="/2fa" element={<TwoFAPage />} />
    </Routes>
  );
}
