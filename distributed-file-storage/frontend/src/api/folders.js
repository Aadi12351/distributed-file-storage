import api from "./axios";

/* ==========================================================
   LIST FOLDERS
========================================================== */

export async function getFolders() {
  const response = await api.get("/folders");
  return response.data;
}


/* ==========================================================
   CREATE FOLDER
========================================================== */

export async function createFolder(name, parentFolderId = null) {
  const response = await api.post("/folders", {
    name,
    parent_folder_id: parentFolderId,
  });

  return response.data;
}


/* ==========================================================
   RENAME FOLDER
========================================================== */

export async function renameFolder(folderId, newName) {
  const response = await api.patch(
    `/folders/${folderId}/rename`,
    {
      new_name: newName,
    }
  );

  return response.data;
}


/* ==========================================================
   DELETE FOLDER
========================================================== */

export async function deleteFolder(folderId) {
  const response = await api.delete(
    `/folders/${folderId}`
  );

  return response.data;
}


/* ==========================================================
   MOVE FOLDER
========================================================== */

export async function moveFolder(
  folderId,
  parentFolderId = null
) {
  const response = await api.patch(
    `/folders/${folderId}/move`,
    {
      parent_folder_id: parentFolderId,
    }
  );

  return response.data;
}


/* ==========================================================
   GET FOLDER CONTENTS
========================================================== */

export async function getFolderContents(folderId) {
  const response = await api.get(
    `/folders/${folderId}/contents`
  );

  return response.data;
}


/* ==========================================================
   GET FOLDER TREE
========================================================== */

export async function getFolderTree(folderId) {
  const response = await api.get(
    `/folders/${folderId}/tree`
  );

  return response.data;
}