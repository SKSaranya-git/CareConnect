/**
 * Gateway-aligned API calls (paths match API Gateway routing).
 */
import { http } from "./http";

export const gateway = {
  auth: {
    register: (body) => http.post("/api/auth/register", body),
    login: (body) => http.post("/api/auth/login", body),
    me: () => http.get("/api/auth/me")
  },
  patients: {
    getMe: () => http.get("/api/patients/me"),
    putMe: (body) => http.put("/api/patients/me", body),
    listReports: () => http.get("/api/patients/me/reports"),
    uploadReport: (body) => http.post("/api/patients/me/reports", body),
    listPrescriptions: () => http.get("/api/patients/me/prescriptions"),
    addPrescription: (patientUserId, body) =>
      http.post(`/api/patients/${patientUserId}/prescriptions`, body),
    patientReports: (patientUserId) => http.get(`/api/patients/${patientUserId}/reports`)
  },
  doctors: {
    list: (params) => http.get("/api/doctors", { params }),
    getMe: () => http.get("/api/doctors/me"),
    putMe: (body) => http.put("/api/doctors/me", body),
    putAvailability: (body) => http.put("/api/doctors/me/availability", body)
  },
  appointments: {
    create: (body) => http.post("/api/appointments", body),
    mine: () => http.get("/api/appointments/me"),
    updateStatus: (id, body) => http.patch(`/api/appointments/${id}/status`, body),
    updatePaymentStatus: (id, body) => http.patch(`/api/appointments/${id}/payment-status`, body),
    reschedule: (id, body) => http.patch(`/api/appointments/${id}/reschedule`, body)
  },
  telemedicine: {
    createSession: (body) => http.post("/api/telemedicine/sessions", body),
    getByAppointment: (appointmentId) => http.get(`/api/telemedicine/sessions/${appointmentId}`),
    endSession: (appointmentId) => http.patch(`/api/telemedicine/sessions/${appointmentId}/end`)
  },
  payments: {
    list: (params) => http.get("/api/payments", { params }),
    checkout: (body) => http.post("/api/payments/checkout", body),
    updateStatus: (paymentId, body) => http.patch(`/api/payments/${paymentId}/status`, body),
    byAppointment: (appointmentId) => http.get(`/api/payments/appointment/${appointmentId}`)
  },
  notifications: {
    mine: () => http.get("/api/notifications/me"),
    all: () => http.get("/api/notifications/all"),
    email: (body) => http.post("/api/notifications/email", body),
    sms: (body) => http.post("/api/notifications/sms", body)
  },
  ai: {
    symptomChecker: (body) => http.post("/api/ai/symptom-checker", body)
  },
  admin: {
    users: () => http.get("/api/admin/users"),
    pendingDoctors: () => http.get("/api/admin/doctors/pending"),
    verifyDoctor: (userId, isVerified) =>
      http.patch(`/api/admin/doctors/${userId}/verify`, { isVerified })
  }
};
