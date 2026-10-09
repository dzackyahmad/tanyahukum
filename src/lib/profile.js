import { clearProcessCache } from "./processCache";

// ==============================
// GET PROFILE
// ==============================
export async function getProfile() {
  const res = await fetch("/api/profile", {
    method: "GET",
    credentials: "include", // 🔥 WAJIB
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil data profile");
  }

  return data;
}

// ==============================
// UPDATE PROFILE (PATCH)
// ==============================
export async function updateProfile({
  name,
  email,
  currentPassword,
  newPassword,
  avatarUrl,
  personalContext,
}) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    credentials: "include", // 🔥 WAJIB
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      currentPassword,
      newPassword,
      avatarUrl,
      personalContext,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Gagal update profile");
  }

  return data;
}

// ==============================
// UPLOAD AVATAR
// ==============================
export async function uploadAvatar(file) {
  if (!file) throw new Error("File tidak ditemukan");

  const formData = new FormData();
  // Ensure the key matches backend's formData.get("file")
  // Adding filename explicitly for better compatibility
  formData.append("file", file, file.name);

  const res = await fetch("/api/profile/upload", {
    method: "POST",
    credentials: "include",
    // IMPORTANT: Do NOT set Content-Type header when sending FormData
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    // Surface the actual error from backend (e.g., "Upload gagal.", "Maks 2MB", etc.)
    throw new Error(data.error || `Upload failed with status ${res.status}`);
  }

  return data;
}

// ==============================
// LOGOUT
// ==============================
export async function logout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {}

  // 🔥 clear local state
  localStorage.removeItem("user");
  localStorage.removeItem("active_conversation_id");
  localStorage.removeItem("conversations");
  clearProcessCache();

  // 🔥 trigger global update
  window.dispatchEvent(new Event("auth-change"));

  // 🔥 stay di chatbot (no redirect ke login)
  window.location.href = "/chatbot";
}

// ==============================
// DELETE ACCOUNT
// ==============================
export async function deleteAccount() {
  const res = await fetch("/api/profile", {
    method: "DELETE",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Gagal menghapus akun");
  }

  // Clear local state after deletion
  localStorage.removeItem("user");
  localStorage.removeItem("active_conversation_id");
  localStorage.removeItem("conversations");
  clearProcessCache();

  // 🔥 trigger global update
  window.dispatchEvent(new Event("auth-change"));

  // 🔥 stay di chatbot (no redirect ke login yang mungkin tidak ada)
  window.location.href = "/chatbot";
  
  return data;
}