import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import { patientNav, doctorNav, adminNav } from "./navigation/menus";
import Spinner from "./components/ui/Spinner";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import PatientOverview from "./pages/patient/Overview";
import PatientDoctors from "./pages/patient/Doctors";
import PatientBook from "./pages/patient/Book";
import PatientAppointments from "./pages/patient/Appointments";
import PatientVideo from "./pages/patient/Video";
import PatientReports from "./pages/patient/Reports";
import PatientPrescriptions from "./pages/patient/Prescriptions";
import PatientPay from "./pages/patient/Pay";
import PatientAI from "./pages/patient/AI";
import PatientProfile from "./pages/patient/Profile";

import DoctorOverview from "./pages/doctor/Overview";
import DoctorAppointments from "./pages/doctor/Appointments";
import DoctorAvailability from "./pages/doctor/Availability";
import DoctorVideo from "./pages/doctor/Video";
import DoctorRecords from "./pages/doctor/Records";
import DoctorProfile from "./pages/doctor/Profile";

import AdminOverview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/Users";
import AdminDoctors from "./pages/admin/Doctors";
import AdminPayments from "./pages/admin/Payments";
import AdminNotifications from "./pages/admin/Notifications";
import AdminProfile from "./pages/admin/Profile";

function PublicHome() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  if (user?.role === "PATIENT") return <Navigate to="/patient" replace />;
  if (user?.role === "DOCTOR") return <Navigate to="/doctor" replace />;
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;
  return <HomePage />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        path="/patient"
        element={
          <ProtectedRoute roles={["PATIENT"]}>
            <DashboardLayout navItems={patientNav} title="Patient portal" />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientOverview />} />
        <Route path="doctors" element={<PatientDoctors />} />
        <Route path="book" element={<PatientBook />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="video" element={<PatientVideo />} />
        <Route path="reports" element={<PatientReports />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="pay" element={<PatientPay />} />
        <Route path="ai" element={<PatientAI />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      <Route
        path="/doctor"
        element={
          <ProtectedRoute roles={["DOCTOR"]}>
            <DashboardLayout navItems={doctorNav} title="Doctor workspace" />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorOverview />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="availability" element={<DoctorAvailability />} />
        <Route path="video" element={<DoctorVideo />} />
        <Route path="records" element={<DoctorRecords />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <DashboardLayout navItems={adminNav} title="Admin console" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="doctors" element={<AdminDoctors />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
