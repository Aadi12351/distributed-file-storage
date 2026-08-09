import api from "./axios";

/* ==========================================================
   LIST FILES
========================================================== */

export async function getFiles() {
  const response = await api.get("/files");
  return response.data;
}


/* ==========================================================
   GET SINGLE FILE
========================================================== */

export async function getFile(fileId) {
  const response = await api.get(`/files/${fileId}`);
  return response.data;
}


/* ==========================================================
   UPLOAD FILE
========================================================== */

export async function uploadFile(file, onUploadProgress) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/files/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      onUploadProgress,
    }
  );

  return response.data;
}


/* ==========================================================
   DOWNLOAD FILE
========================================================== */

export async function downloadFile(fileId) {
  const response = await api.get(
    `/files/${fileId}/download`,
    {
      responseType: "blob",
    }
  );

  return response;
}


/* ==========================================================
   DELETE FILE
========================================================== */

export async function deleteFile(fileId) {
  const response = await api.delete(
    `/files/${fileId}`
  );

  return response.data;
}


/* ==========================================================
   RENAME FILE
========================================================== */

export async function renameFile(fileId, newName) {
  const response = await api.patch(
    `/files/${fileId}/rename`,
    {
      new_name: newName,
    }
  );

  return response.data;
}


/* ==========================================================
   MOVE FILE
========================================================== */

export async function moveFile(fileId, folderId) {
  const response = await api.patch(
    `/files/${fileId}/move`,
    {
      folder_id: folderId,
    }
  );

  return response.data;
}


/* ==========================================================
   FILE METADATA
========================================================== */

export async function getFileMetadata(fileId) {
  const response = await api.get(
    `/files/${fileId}/metadata`
  );

  return response.data;
}


/* ==========================================================
   PREVIEW FILE
========================================================== */

export async function previewFile(fileId) {
  const response = await api.get(
    `/files/${fileId}/preview`,
    {
      responseType: "blob",
    }
  );

  return response;
}


/* ==========================================================
   CREATE VERSION
========================================================== */

export async function createFileVersion(fileId) {
  const response = await api.post(
    `/files/${fileId}/versions`
  );

  return response.data;
}


/* ==========================================================
   LIST VERSIONS
========================================================== */

export async function getFileVersions(fileId) {
  const response = await api.get(
    `/files/${fileId}/versions`
  );

  return response.data;
}


/* ==========================================================
   GET SINGLE VERSION
========================================================== */

export async function getFileVersion(
  fileId,
  versionId
) {
  const response = await api.get(
    `/files/${fileId}/versions/${versionId}`
  );

  return response.data;
}


/* ==========================================================
   DOWNLOAD VERSION
========================================================== */

export async function downloadFileVersion(
  fileId,
  versionId
) {
  const response = await api.get(
    `/files/${fileId}/versions/${versionId}/download`,
    {
      responseType: "blob",
    }
  );

  return response;
}


/* ==========================================================
   RESTORE VERSION
========================================================== */

export async function restoreFileVersion(
  fileId,
  versionId
) {
  const response = await api.post(
    `/files/${fileId}/versions/${versionId}/restore`
  );

  return response.data;
}


/* ==========================================================
   REPLACE FILE
========================================================== */

export async function replaceFile(
  fileId,
  file
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.put(
    `/files/${fileId}/replace`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}