import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  Upload,
  Plus,
  MoreHorizontal,
  Download,
  Pencil,
  Trash2,
  Move,
  Eye,
  Info,
  RefreshCw,
  ChevronRight,
  Home,
  X,
  HardDrive,
  Calendar,
  Database,
  ArrowLeft,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";

import {
  getFiles,
  uploadFile,
  downloadFile,
  renameFile,
  moveFile,
  previewFile,
  getFileMetadata,
} from "../api/files";


// ============================================================
// MAIN
// ============================================================

export default function MyDrive() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);

  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderContents, setFolderContents] = useState(null);

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [openMenu, setOpenMenu] = useState(null);

  // ----------------------------------------------------------
  // RENAME
  // ----------------------------------------------------------

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // ----------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ----------------------------------------------------------
  // MOVE
  // ----------------------------------------------------------

  const [moveTarget, setMoveTarget] = useState(null);
  const [moveFolderId, setMoveFolderId] = useState("");

  // ----------------------------------------------------------
  // DETAILS
  // ----------------------------------------------------------

  const [detailsTarget, setDetailsTarget] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ----------------------------------------------------------
  // PREVIEW
  // ----------------------------------------------------------

  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // ----------------------------------------------------------
  // CREATE FOLDER
  // ----------------------------------------------------------

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // ----------------------------------------------------------
  // FOLDER RENAME
  // ----------------------------------------------------------

  const [folderRenameTarget, setFolderRenameTarget] = useState(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");

  // ----------------------------------------------------------
  // FOLDER DELETE
  // ----------------------------------------------------------

  const [folderDeleteTarget, setFolderDeleteTarget] = useState(null);

  // ----------------------------------------------------------
  // FOLDER MOVE
  // ----------------------------------------------------------

  const [folderMoveTarget, setFolderMoveTarget] = useState(null);
  const [folderMoveId, setFolderMoveId] = useState("");

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadRoot();
  }, []);

  // ==========================================================
  // LOAD ROOT
  // ==========================================================

  async function loadRoot() {
    try {
      setLoading(true);
      setError("");

      const [foldersResponse, filesResponse] = await Promise.all([
        api.get("/folders"),
        getFiles(),
      ]);

      const allFolders = normalizeArray(foldersResponse.data);
      const allFiles = normalizeArray(filesResponse);

      setFolders(
        allFolders.filter(
          (folder) =>
            folder.parent_folder_id === null ||
            folder.parent_folder_id === undefined
        )
      );

      setFiles(
        allFiles.filter(
          (file) =>
            file.folder_id === null ||
            file.folder_id === undefined
        )
      );

      setCurrentFolder(null);
      setFolderContents(null);
    } catch (err) {
      console.error("My Drive error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load My Drive."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // OPEN FOLDER
  // ==========================================================

  async function openFolder(folder) {
    try {
      setLoading(true);
      setError("");
      setOpenMenu(null);

      const response = await api.get(
        `/folders/${getFolderId(folder)}/contents`
      );

      const data = response.data;

      setCurrentFolder(folder);
      setFolderContents(data);

      setFolders(
        normalizeArray(data?.folders)
      );

      setFiles(
        normalizeArray(data?.files)
      );
    } catch (err) {
      console.error("Open folder error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to open folder."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // GO ROOT
  // ==========================================================

  async function goRoot() {
    setOpenMenu(null);
    await loadRoot();
  }

  // ==========================================================
  // REFRESH
  // ==========================================================

  async function refresh() {
    try {
      setRefreshing(true);

      if (currentFolder) {
        await openFolder(currentFolder);
      } else {
        await loadRoot();
      }
    } finally {
      setRefreshing(false);
    }
  }

  // ==========================================================
  // CREATE FOLDER
  // ==========================================================

  async function createFolder() {
    const name = newFolderName.trim();

    if (!name) {
      return;
    }

    try {
      setError("");

      await api.post("/folders", {
        name,
        parent_folder_id: currentFolder
          ? getFolderId(currentFolder)
          : null,
      });

      setCreateFolderOpen(false);
      setNewFolderName("");

      await refresh();
    } catch (err) {
      console.error("Create folder error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to create folder."
      );
    }
  }

  // ==========================================================
  // UPLOAD
  // ==========================================================

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleUpload(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();

      formData.append("file", selectedFile);

      if (currentFolder) {
        formData.append(
          "folder_id",
          String(getFolderId(currentFolder))
        );
      }

      await api.post(
        "/files/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      await refresh();
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to upload file."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }

  // ==========================================================
  // DOWNLOAD FILE
  // ==========================================================

  async function handleDownload(file) {
    try {
      setOpenMenu(null);
      setError("");

      const id = getFileId(file);

      const response = await downloadFile(id);

      const blob =
        response?.data instanceof Blob
          ? response.data
          : response instanceof Blob
          ? response
          : null;

      if (!blob) {
        throw new Error(
          "Invalid download response."
        );
      }

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = getFileName(file);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to download file."
      );
    }
  }

  // ==========================================================
  // PREVIEW FILE
  // ==========================================================

  async function handlePreview(file) {
    try {
      setOpenMenu(null);
      setPreviewTarget(file);
      setPreviewLoading(true);
      setPreviewUrl("");

      const response =
        await previewFile(getFileId(file));

      const blob =
        response?.data instanceof Blob
          ? response.data
          : response instanceof Blob
          ? response
          : null;

      if (!blob) {
        throw new Error(
          "Unable to preview this file."
        );
      }

      const url =
        window.URL.createObjectURL(blob);

      setPreviewUrl(url);
    } catch (err) {
      console.error("Preview error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to preview file."
      );

      setPreviewTarget(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  // ==========================================================
  // CLOSE PREVIEW
  // ==========================================================

  function closePreview() {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setPreviewTarget(null);
  }

  // ==========================================================
  // FILE DETAILS
  // ==========================================================

  async function handleDetails(file) {
    try {
      setOpenMenu(null);

      setDetailsTarget(file);
      setDetailsLoading(true);
      setDetailsData(null);

      const data =
        await getFileMetadata(
          getFileId(file)
        );

      setDetailsData(data);
    } catch (err) {
      console.error(
        "Metadata error:",
        err
      );

      setDetailsData(file);
    } finally {
      setDetailsLoading(false);
    }
  }

  // ==========================================================
  // RENAME FILE
  // ==========================================================

  function openFileRename(file) {
    setOpenMenu(null);

    setRenameTarget(file);
    setRenameValue(
      getFileName(file)
    );
  }

  async function confirmFileRename() {
    if (!renameTarget) {
      return;
    }

    const newName =
      renameValue.trim();

    if (!newName) {
      return;
    }

    try {
      setError("");

      await renameFile(
        getFileId(renameTarget),
        newName
      );

      setRenameTarget(null);
      setRenameValue("");

      await refresh();
    } catch (err) {
      console.error(
        "Rename error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to rename file."
      );
    }
  }

  // ==========================================================
  // MOVE FILE
  // ==========================================================

  function openFileMove(file) {
    setOpenMenu(null);

    setMoveTarget(file);
    setMoveFolderId(
      file.folder_id
        ? String(file.folder_id)
        : ""
    );
  }

  async function confirmFileMove() {
    if (!moveTarget) {
      return;
    }

    try {
      setError("");

      const folderId =
        moveFolderId === ""
          ? null
          : Number(moveFolderId);

      await moveFile(
        getFileId(moveTarget),
        folderId
      );

      setMoveTarget(null);
      setMoveFolderId("");

      await refresh();
    } catch (err) {
      console.error(
        "Move file error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to move file."
      );
    }
  }

  // ==========================================================
  // MOVE FILE TO TRASH
  // ==========================================================

  async function moveFileToTrash(file) {
    try {
      setOpenMenu(null);
      setError("");

      await api.patch(
        `/trash/files/${getFileId(file)}`
      );

      await refresh();
    } catch (err) {
      console.error(
        "Trash error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to move file to trash."
      );
    }
  }

  // ==========================================================
  // RENAME FOLDER
  // ==========================================================

  function openFolderRename(folder) {
    setOpenMenu(null);

    setFolderRenameTarget(folder);
    setFolderRenameValue(
      getFolderName(folder)
    );
  }

  async function confirmFolderRename() {
    if (!folderRenameTarget) {
      return;
    }

    const name =
      folderRenameValue.trim();

    if (!name) {
      return;
    }

    try {
      await api.patch(
        `/folders/${getFolderId(
          folderRenameTarget
        )}/rename`,
        {
          new_name: name,
        }
      );

      setFolderRenameTarget(null);
      setFolderRenameValue("");

      await refresh();
    } catch (err) {
      console.error(
        "Folder rename error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to rename folder."
      );
    }
  }

  // ==========================================================
  // DELETE FOLDER
  // ==========================================================

  async function confirmFolderDelete() {
    if (!folderDeleteTarget) {
      return;
    }

    try {
      await api.delete(
        `/folders/${getFolderId(
          folderDeleteTarget
        )}`
      );

      setFolderDeleteTarget(null);

      await refresh();
    } catch (err) {
      console.error(
        "Folder delete error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to delete folder."
      );
    }
  }

  // ==========================================================
  // MOVE FOLDER
  // ==========================================================

  function openFolderMove(folder) {
    setOpenMenu(null);

    setFolderMoveTarget(folder);
    setFolderMoveId(
      folder.parent_folder_id
        ? String(folder.parent_folder_id)
        : ""
    );
  }

  async function confirmFolderMove() {
    if (!folderMoveTarget) {
      return;
    }

    try {
      await api.patch(
        `/folders/${getFolderId(
          folderMoveTarget
        )}/move`,
        {
          parent_folder_id:
            folderMoveId === ""
              ? null
              : Number(folderMoveId),
        }
      );

      setFolderMoveTarget(null);
      setFolderMoveId("");

      await refresh();
    } catch (err) {
      console.error(
        "Folder move error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to move folder."
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading My Drive...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="space-y-7">

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            {error}
          </p>

          <button
            onClick={() => setError("")}
            className="rounded-lg p-1 text-red-500 hover:bg-red-100"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ==================================================
          HEADER
      ================================================== */}

      <section>
        <div className="flex items-end justify-between gap-6">

          <div>

            <p className="text-sm font-medium text-slate-400">
              My Drive
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {currentFolder
                ? getFolderName(currentFolder)
                : "My Drive"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Store, organize and manage your files.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setCreateFolderOpen(true)
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Plus size={18} />

              New Folder
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />

            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={18} />

              {uploading
                ? "Uploading..."
                : "Upload"}
            </button>

          </div>

        </div>
      </section>

      {/* ==================================================
          BREADCRUMB
      ================================================== */}

      <div className="flex items-center gap-2 text-sm">

        <button
          onClick={goRoot}
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100 ${
            !currentFolder
              ? "font-semibold text-slate-800"
              : "text-slate-500"
          }`}
        >
          <Home size={17} />

          My Drive
        </button>

        {currentFolder && (
          <>
            <ChevronRight
              size={16}
              className="text-slate-300"
            />

            <span className="font-semibold text-slate-800">
              {getFolderName(currentFolder)}
            </span>
          </>
        )}

      </div>

      {/* ==================================================
          TOOLBAR
      ================================================== */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">

          {currentFolder && (
            <button
              onClick={goRoot}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={17} />

              My Drive
            </button>
          )}

        </div>

        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw
            size={18}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />
        </button>

      </div>

      {/* ==================================================
          FOLDERS
      ================================================== */}

      {folders.length > 0 && (
        <section>

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-lg font-bold text-slate-900">
              Folders
            </h2>

            <span className="text-sm text-slate-400">
              {folders.length}
            </span>

          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {folders.map((folder) => (
              <FolderCard
                key={getFolderId(folder)}
                folder={folder}
                menuOpen={
                  openMenu ===
                  `folder-${getFolderId(folder)}`
                }
                onOpen={() =>
                  openFolder(folder)
                }
                onMenu={() =>
                  setOpenMenu(
                    openMenu ===
                      `folder-${getFolderId(folder)}`
                      ? null
                      : `folder-${getFolderId(folder)}`
                  )
                }
                onRename={() =>
                  openFolderRename(folder)
                }
                onMove={() =>
                  openFolderMove(folder)
                }
                onDelete={() =>
                  setFolderDeleteTarget(folder)
                }
              />
            ))}

          </div>

        </section>
      )}

      {/* ==================================================
          FILES
      ================================================== */}

      <section>

        <div className="mb-3 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Files
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {files.length}{" "}
              {files.length === 1
                ? "file"
                : "files"}
            </p>
          </div>

        </div>

        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">

          {files.length === 0 ? (
            <EmptyFiles />
          ) : (
            files.map((file) => (
              <FileRow
                key={getFileId(file)}
                file={file}
                menuOpen={
                  openMenu ===
                  `file-${getFileId(file)}`
                }
                onMenu={() =>
                  setOpenMenu(
                    openMenu ===
                      `file-${getFileId(file)}`
                      ? null
                      : `file-${getFileId(file)}`
                  )
                }
                onPreview={handlePreview}
                onDetails={handleDetails}
                onDownload={handleDownload}
                onRename={openFileRename}
                onMove={openFileMove}
                onTrash={moveFileToTrash}
              />
            ))
          )}

        </div>

      </section>

      {/* ==================================================
          CREATE FOLDER MODAL
      ================================================== */}

      {createFolderOpen && (
        <Modal
          title="New folder"
          onClose={() =>
            setCreateFolderOpen(false)
          }
        >

          <input
            autoFocus
            value={newFolderName}
            onChange={(e) =>
              setNewFolderName(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createFolder();
              }
            }}
            placeholder="Folder name"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
          />

          <ModalActions
            onCancel={() =>
              setCreateFolderOpen(false)
            }
            onConfirm={createFolder}
            confirmText="Create"
          />

        </Modal>
      )}

      {/* ==================================================
          FILE RENAME MODAL
      ================================================== */}

      {renameTarget && (
        <Modal
          title="Rename file"
          onClose={() => {
            setRenameTarget(null);
            setRenameValue("");
          }}
        >

          <input
            autoFocus
            value={renameValue}
            onChange={(e) =>
              setRenameValue(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmFileRename();
              }
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
          />

          <ModalActions
            onCancel={() => {
              setRenameTarget(null);
              setRenameValue("");
            }}
            onConfirm={confirmFileRename}
            confirmText="Save"
          />

        </Modal>
      )}

      {/* ==================================================
          FOLDER RENAME
      ================================================== */}

      {folderRenameTarget && (
        <Modal
          title="Rename folder"
          onClose={() => {
            setFolderRenameTarget(null);
            setFolderRenameValue("");
          }}
        >

          <input
            autoFocus
            value={folderRenameValue}
            onChange={(e) =>
              setFolderRenameValue(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmFolderRename();
              }
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
          />

          <ModalActions
            onCancel={() => {
              setFolderRenameTarget(null);
              setFolderRenameValue("");
            }}
            onConfirm={confirmFolderRename}
            confirmText="Save"
          />

        </Modal>
      )}

      {/* ==================================================
          FILE MOVE
      ================================================== */}

      {moveTarget && (
        <Modal
          title="Move file"
          onClose={() => {
            setMoveTarget(null);
            setMoveFolderId("");
          }}
        >

          <MoveFolderSelect
            folders={folders}
            value={moveFolderId}
            onChange={setMoveFolderId}
          />

          <ModalActions
            onCancel={() => {
              setMoveTarget(null);
              setMoveFolderId("");
            }}
            onConfirm={confirmFileMove}
            confirmText="Move"
          />

        </Modal>
      )}

      {/* ==================================================
          FOLDER MOVE
      ================================================== */}

      {folderMoveTarget && (
        <Modal
          title="Move folder"
          onClose={() => {
            setFolderMoveTarget(null);
            setFolderMoveId("");
          }}
        >

          <MoveFolderSelect
            folders={folders.filter(
              (folder) =>
                getFolderId(folder) !==
                getFolderId(
                  folderMoveTarget
                )
            )}
            value={folderMoveId}
            onChange={setFolderMoveId}
          />

          <ModalActions
            onCancel={() => {
              setFolderMoveTarget(null);
              setFolderMoveId("");
            }}
            onConfirm={confirmFolderMove}
            confirmText="Move"
          />

        </Modal>
      )}

      {/* ==================================================
          DELETE FOLDER
      ================================================== */}

      {folderDeleteTarget && (
        <Modal
          title="Delete folder?"
          onClose={() =>
            setFolderDeleteTarget(null)
          }
        >

          <p className="text-sm leading-6 text-slate-500">
            Are you sure you want to delete{" "}
            <strong className="text-slate-700">
              {getFolderName(
                folderDeleteTarget
              )}
            </strong>
            ?
          </p>

          <ModalActions
            onCancel={() =>
              setFolderDeleteTarget(null)
            }
            onConfirm={confirmFolderDelete}
            confirmText="Delete"
            danger
          />

        </Modal>
      )}

      {/* ==================================================
          DETAILS
      ================================================== */}

      {detailsTarget && (
        <Modal
          title="File details"
          onClose={() => {
            setDetailsTarget(null);
            setDetailsData(null);
          }}
        >

          {detailsLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading details...
            </div>
          ) : (
            <DetailsContent
              file={detailsData || detailsTarget}
            />
          )}

        </Modal>
      )}

      {/* ==================================================
          PREVIEW
      ================================================== */}

      {previewTarget && (
        <PreviewModal
          file={previewTarget}
          url={previewUrl}
          loading={previewLoading}
          onClose={closePreview}
        />
      )}

    </div>
  );
}


// ============================================================
// FOLDER CARD
// ============================================================

function FolderCard({
  folder,
  menuOpen,
  onOpen,
  onMenu,
  onRename,
  onMove,
  onDelete,
}) {
  return (
    <div className="relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300 hover:shadow">

      <button
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
          <Folder size={23} />
        </div>

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold text-slate-900">
            {getFolderName(folder)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Folder
          </p>

        </div>

      </button>

      <div className="relative">

        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <MoreHorizontal size={19} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 z-40 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">

            <button
              onClick={onOpen}
              className="MenuItem"
            >
              <FolderOpen size={17} />
              Open
            </button>

            <button
              onClick={onRename}
              className="MenuItem"
            >
              <Pencil size={17} />
              Rename
            </button>

            <button
              onClick={onMove}
              className="MenuItem"
            >
              <Move size={17} />
              Move
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={onDelete}
              className="MenuItem text-red-600 hover:bg-red-50"
            >
              <Trash2 size={17} />
              Delete
            </button>

          </div>
        )}

      </div>

    </div>
  );
}


// ============================================================
// FILE ROW
// ============================================================

function FileRow({
  file,
  menuOpen,
  onMenu,
  onPreview,
  onDetails,
  onDownload,
  onRename,
  onMove,
  onTrash,
}) {
  const name = getFileName(file);

  return (
    <div className="relative flex min-h-[76px] items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-b-0 hover:bg-slate-50">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        <FileIcon fileName={name} />
      </div>

      <button
        onClick={() => onPreview(file)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-semibold text-slate-800">
          {name}
        </p>

        <p className="mt-1 truncate text-xs text-slate-400">
          {getFileType(file)} ·{" "}
          {getFileSize(file)}
        </p>
      </button>

      <span className="hidden shrink-0 text-xs text-slate-400 md:block">
        {getFileDate(file)}
      </span>

      <div className="relative">

        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <MoreHorizontal size={19} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">

            <button
              onClick={() => onPreview(file)}
              className="MenuItem"
            >
              <Eye size={17} />
              Preview
            </button>

            <button
              onClick={() => onDetails(file)}
              className="MenuItem"
            >
              <Info size={17} />
              Properties
            </button>

            <button
              onClick={() => onDownload(file)}
              className="MenuItem"
            >
              <Download size={17} />
              Download
            </button>

            <button
              onClick={() => onRename(file)}
              className="MenuItem"
            >
              <Pencil size={17} />
              Rename
            </button>

            <button
              onClick={() => onMove(file)}
              className="MenuItem"
            >
              <Move size={17} />
              Move
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={() => onTrash(file)}
              className="MenuItem text-red-600 hover:bg-red-50"
            >
              <Trash2 size={17} />
              Move to trash
            </button>

          </div>
        )}

      </div>

    </div>
  );
}


// ============================================================
// MOVE SELECT
// ============================================================

function MoveFolderSelect({
  folders,
  value,
  onChange,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-700">
        Destination folder
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
      >

        <option value="">
          My Drive
        </option>

        {folders.map((folder) => (
          <option
            key={getFolderId(folder)}
            value={getFolderId(folder)}
          >
            {getFolderName(folder)}
          </option>
        ))}

      </select>

    </div>
  );
}


// ============================================================
// DETAILS
// ============================================================

function DetailsContent({ file }) {
  return (
    <div className="space-y-4">

      <DetailRow
        icon={<FileText size={18} />}
        label="Name"
        value={getFileName(file)}
      />

      <DetailRow
        icon={<Database size={18} />}
        label="Size"
        value={getFileSize(file)}
      />

      <DetailRow
        icon={<HardDrive size={18} />}
        label="Type"
        value={
          file?.content_type ||
          getFileType(file)
        }
      />

      <DetailRow
        icon={<Calendar size={18} />}
        label="Created"
        value={
          formatDateTime(
            file?.created_at
          )
        }
      />

      <DetailRow
        icon={<Calendar size={18} />}
        label="Updated"
        value={
          formatDateTime(
            file?.updated_at
          )
        }
      />

      {file?.folder_id !== undefined && (
        <DetailRow
          icon={<Folder size={18} />}
          label="Folder ID"
          value={
            file.folder_id === null
              ? "My Drive"
              : String(file.folder_id)
          }
        />
      )}

    </div>
  );
}


// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">

      <div className="text-slate-500">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-all text-sm font-medium text-slate-800">
          {value || "—"}
        </p>

      </div>

    </div>
  );
}


// ============================================================
// PREVIEW MODAL
// ============================================================

function PreviewModal({
  file,
  url,
  loading,
  onClose,
}) {
  const type =
    file?.content_type || "";

  const name =
    getFileName(file);

  const isImage =
    type.startsWith("image/");

  const isPdf =
    type === "application/pdf" ||
    name.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >

      <div
        className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">

          <div className="flex min-w-0 items-center gap-3">

            <FileIcon
              fileName={name}
            />

            <p className="truncate text-sm font-semibold text-slate-800">
              {name}
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>

        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-6">

          {loading ? (
            <div className="text-sm text-slate-500">
              Loading preview...
            </div>
          ) : !url ? (
            <div className="text-sm text-slate-500">
              Preview unavailable.
            </div>
          ) : isImage ? (
            <img
              src={url}
              alt={name}
              className="max-h-full max-w-full rounded-lg object-contain shadow"
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title={name}
              className="h-full w-full rounded-lg bg-white"
            />
          ) : (
            <div className="rounded-2xl bg-white px-8 py-10 text-center shadow">

              <FileText
                size={42}
                className="mx-auto text-slate-400"
              />

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Preview is not available for this file type.
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Download the file to open it.
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}


// ============================================================
// MODAL
// ============================================================

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >

      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>

        </div>

        <div className="px-6 py-5">
          {children}
        </div>

      </div>

    </div>
  );
}


// ============================================================
// MODAL ACTIONS
// ============================================================

function ModalActions({
  onCancel,
  onConfirm,
  confirmText,
  danger = false,
}) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">

      <button
        onClick={onCancel}
        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        Cancel
      </button>

      <button
        onClick={onConfirm}
        className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
          danger
            ? "bg-red-600 hover:bg-red-700"
            : "bg-slate-900 hover:bg-slate-800"
        }`}
      >
        {confirmText}
      </button>

    </div>
  );
}


// ============================================================
// EMPTY FILES
// ============================================================

function EmptyFiles() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <File size={25} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        No files in this folder
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-400">
        Upload a file to start using this folder.
      </p>

    </div>
  );
}


// ============================================================
// FILE ICON
// ============================================================

function FileIcon({ fileName }) {
  const extension =
    fileName
      ?.split(".")
      .pop()
      ?.toLowerCase();

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
    ].includes(extension)
  ) {
    return <FileImage size={21} />;
  }

  if (
    [
      "xls",
      "xlsx",
      "csv",
    ].includes(extension)
  ) {
    return (
      <FileSpreadsheet size={21} />
    );
  }

  if (
    [
      "zip",
      "rar",
      "7z",
      "tar",
      "gz",
    ].includes(extension)
  ) {
    return (
      <FileArchive size={21} />
    );
  }

  return <FileText size={21} />;
}


// ============================================================
// HELPERS
// ============================================================

function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.files)) {
    return data.files;
  }

  if (Array.isArray(data?.folders)) {
    return data.folders;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}


function getFileId(file) {
  return (
    file?.id ??
    file?.file_id ??
    file?.uuid
  );
}


function getFileName(file) {
  return (
    file?.original_filename ??
    file?.filename ??
    file?.file_name ??
    file?.name ??
    "Unnamed file"
  );
}


function getFileSize(file) {
  const size =
    file?.file_size ??
    file?.size ??
    file?.filesize ??
    0;

  if (typeof size === "string") {
    return size;
  }

  if (!size) {
    return "0 B";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  if (
    size <
    1024 * 1024 * 1024
  ) {
    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    size /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}


function getFileType(file) {
  const contentType =
    file?.content_type;

  if (contentType) {
    return contentType;
  }

  const name =
    getFileName(file);

  const extension =
    name
      .split(".")
      .pop()
      ?.toUpperCase();

  return extension || "FILE";
}


function getFileDate(file) {
  const value =
    file?.updated_at ??
    file?.created_at ??
    file?.uploaded_at ??
    file?.date;

  if (!value) {
    return "Recently";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function getFolderId(folder) {
  return (
    folder?.id ??
    folder?.folder_id
  );
}


function getFolderName(folder) {
  return (
    folder?.name ??
    folder?.folder_name ??
    "Unnamed folder"
  );
}