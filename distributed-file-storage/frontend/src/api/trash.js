import api from "./axios";

/* ==========================================================
   GET TRASH
========================================================== */

export async function getTrash() {
  const response = await api.get("/trash");
  return response.data;
}

/* ==========================================================
   RESTORE FILE
========================================================== */

export async function restoreFile(fileId) {
  const response = await api.patch(
    `/trash/files/${fileId}/restore`
  );

  return response.data;
}

/* ==========================================================
   MOVE FILE TO TRASH
========================================================== */

export async function moveFileToTrash(fileId) {
  const response = await api.patch(
    `/trash/files/${fileId}`
  );

  return response.data;
}