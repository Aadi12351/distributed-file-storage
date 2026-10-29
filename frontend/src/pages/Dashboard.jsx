import {
  FileText,
  Folder,
  HardDrive,
  MoreHorizontal,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Upload,
  Download,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { getDashboardStats } from "../api/dashboard";

import {
  getFiles,
  uploadFile,
  downloadFile,
  renameFile,
  deleteFile,
} from "../api/files";

export default function Dashboard() {
  // =====================================================
  // DASHBOARD STATE
  // =====================================================

  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  // =====================================================
  // RENAME STATE
  // =====================================================

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // =====================================================
  // DELETE STATE
  // =====================================================

  const [deleteTarget, setDeleteTarget] = useState(null);

  // =====================================================
  // ACTION STATE
  // =====================================================

  const [actionLoading, setActionLoading] = useState(false);

  // =====================================================
  // FILE MENU
  // =====================================================

  const [openMenuId, setOpenMenuId] = useState(null);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [dashboardData, filesData] = await Promise.all([
        getDashboardStats(),
        getFiles(),
      ]);

      console.log("DASHBOARD:", dashboardData);
      console.log("FILES:", filesData);

      setStats(dashboardData);

      const normalizedFiles = Array.isArray(filesData)
        ? filesData
        : filesData?.files ||
          filesData?.items ||
          [];

      setFiles(normalizedFiles);
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // REFRESH
  // =====================================================

  async function refreshDashboard() {
    try {
      const [dashboardData, filesData] = await Promise.all([
        getDashboardStats(),
        getFiles(),
      ]);

      setStats(dashboardData);

      const normalizedFiles = Array.isArray(filesData)
        ? filesData
        : filesData?.files ||
          filesData?.items ||
          [];

      setFiles(normalizedFiles);
    } catch (err) {
      console.error("Refresh error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to refresh dashboard."
      );
    }
  }

  // =====================================================
  // UPLOAD
  // =====================================================

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileUpload(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      await uploadFile(selectedFile);

      await refreshDashboard();
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to upload file."
      );
    } finally {
      setUploading(false);

      // Allows selecting the same file again
      event.target.value = "";
    }
  }

  // =====================================================
  // DOWNLOAD
  // =====================================================

  async function handleDownload(file) {
    try {
      setOpenMenuId(null);
      setError("");

      const fileId = getFileId(file);

      if (!fileId) {
        throw new Error("File ID not found.");
      }

      const response = await downloadFile(fileId);

      const blob =
        response?.data instanceof Blob
          ? response.data
          : response instanceof Blob
          ? response
          : null;

      if (!blob) {
        throw new Error("Invalid download response.");
      }

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

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

  // =====================================================
  // OPEN RENAME MODAL
  // =====================================================

  function handleRename(file) {
    setOpenMenuId(null);

    setRenameTarget(file);
    setRenameValue(getFileName(file));
  }

  // =====================================================
  // CONFIRM RENAME
  // =====================================================

  async function handleRenameConfirm() {
    if (!renameTarget) {
      return;
    }

    const newName = renameValue.trim();

    if (!newName) {
      return;
    }

    const oldName = getFileName(renameTarget);

    if (newName === oldName) {
      closeRenameModal();
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const fileId = getFileId(renameTarget);

      if (!fileId) {
        throw new Error("File ID not found.");
      }

      console.log("RENAMING FILE:", {
        fileId,
        oldName,
        newName,
      });

      await renameFile(fileId, newName);

      closeRenameModal();

      await refreshDashboard();
    } catch (err) {
      console.error("Rename error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to rename file."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // =====================================================
  // CLOSE RENAME MODAL
  // =====================================================

  function closeRenameModal() {
    setRenameTarget(null);
    setRenameValue("");
  }

  // =====================================================
  // OPEN DELETE MODAL
  // =====================================================

  function handleDelete(file) {
    setOpenMenuId(null);

    setDeleteTarget(file);
  }

  // =====================================================
  // CONFIRM DELETE
  // =====================================================

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const fileId = getFileId(deleteTarget);

      if (!fileId) {
        throw new Error("File ID not found.");
      }

      await deleteFile(fileId);

      setDeleteTarget(null);

      await refreshDashboard();
    } catch (err) {
      console.error("Delete error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to move file to trash."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // INITIAL ERROR
  // =====================================================

  if (error && !stats) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-center">
          <p className="text-sm font-medium text-red-600">
            {error}
          </p>

          <button
            onClick={loadDashboard}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN DASHBOARD
  // =====================================================

  return (
    <div className="space-y-10">

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            {error}
          </p>

          <button
            onClick={() => setError("")}
            className="rounded-lg p-1 text-red-400 hover:bg-red-100"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <section>
        <div className="flex items-end justify-between">

          <div>
            <p className="text-sm font-medium text-slate-400">
              Welcome back
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Your Drive
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your files, folders and shared documents.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={18} />

              {uploading
                ? "Uploading..."
                : "Upload File"}
            </button>
          </div>
        </div>
      </section>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">

        <StatCard
          icon={<FileText size={21} />}
          title="Total Files"
          value={stats?.total_files ?? 0}
          description="Files stored"
        />

        <StatCard
          icon={<Folder size={21} />}
          title="Folders"
          value={stats?.total_folders ?? 0}
          description="Organized folders"
        />

        <StatCard
          icon={<HardDrive size={21} />}
          title="Storage Used"
          value={stats?.storage_used ?? "0 B"}
          description="Currently used"
        />

      </section>

      {/* =================================================
          RECENT FILES
      ================================================= */}

      <section>

        <div className="mb-4 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Files
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Your recently modified files
            </p>
          </div>

          <button
            onClick={refreshDashboard}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Refresh
          </button>

        </div>

        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">

          {files.length === 0 ? (
            <EmptyFiles />
          ) : (
            files.slice(0, 8).map((file) => (
              <FileRow
                key={getFileId(file)}
                file={file}
                menuOpen={
                  openMenuId === getFileId(file)
                }
                onMenuToggle={() =>
                  setOpenMenuId(
                    openMenuId === getFileId(file)
                      ? null
                      : getFileId(file)
                  )
                }
                onDownload={handleDownload}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))
          )}

        </div>

      </section>

      {/* =================================================
          RENAME MODAL
      ================================================= */}

      {renameTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
          onClick={() =>
            !actionLoading &&
            closeRenameModal()
          }
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Rename
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter a new name for this file.
              </p>
            </div>

            <div className="px-6 py-5">

              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(event) =>
                  setRenameValue(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleRenameConfirm();
                  }

                  if (event.key === "Escape") {
                    closeRenameModal();
                  }
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">

              <button
                type="button"
                onClick={closeRenameModal}
                disabled={actionLoading}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRenameConfirm}
                disabled={
                  actionLoading ||
                  !renameValue.trim()
                }
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Saving..."
                  : "Save"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
          onClick={() =>
            !actionLoading &&
            setDeleteTarget(null)
          }
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="px-6 pt-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 size={21} />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Move to trash?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Are you sure you want to move{" "}
                <span className="font-semibold text-slate-700">
                  {getFileName(deleteTarget)}
                </span>{" "}
                to the trash?
              </p>

            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={actionLoading}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Moving..."
                  : "Move to trash"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// =======================================================
// STAT CARD
// =======================================================

function StatCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
        {icon}
      </div>

      <p className="text-sm font-medium text-slate-400">
        {title}
      </p>

      <div className="mt-2 flex items-baseline gap-2">

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>

        <span className="text-sm text-slate-400">
          {description}
        </span>

      </div>

    </div>
  );
}

// =======================================================
// FILE ROW
// =======================================================

function FileRow({
  file,
  menuOpen,
  onMenuToggle,
  onDownload,
  onRename,
  onDelete,
}) {
  const fileName = getFileName(file);
  const fileSize = getFileSize(file);
  const fileDate = getFileDate(file);
  const fileType = getFileType(file);

  return (
    <div className="relative flex min-h-[76px] items-center gap-4 border-b border-slate-100 px-5 py-3 last:border-b-0 hover:bg-slate-50">

      {/* Icon */}

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        <FileIcon fileName={fileName} />
      </div>

      {/* Name */}

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-semibold text-slate-800">
          {fileName}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {fileType} · {fileSize}
        </p>

      </div>

      {/* Date */}

      <span className="hidden shrink-0 text-xs text-slate-400 md:block">
        {fileDate}
      </span>

      {/* More */}

      <div className="relative">

        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          title="More options"
        >
          <MoreHorizontal size={19} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">

            <button
              onClick={() => onDownload(file)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={17} />
              Download
            </button>

            <button
              onClick={() => onRename(file)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={17} />
              Rename
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={() => onDelete(file)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
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

// =======================================================
// EMPTY FILES
// =======================================================

function EmptyFiles() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <File size={25} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        No files yet
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-400">
        Upload a file to start building your FileVault.
      </p>

    </div>
  );
}

// =======================================================
// FILE ICON
// =======================================================

function FileIcon({ fileName }) {
  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
      extension
    )
  ) {
    return <FileImage size={21} />;
  }

  if (
    ["xls", "xlsx", "csv"].includes(extension)
  ) {
    return <FileSpreadsheet size={21} />;
  }

  if (
    ["zip", "rar", "7z", "tar", "gz"].includes(
      extension
    )
  ) {
    return <FileArchive size={21} />;
  }

  return <FileText size={21} />;
}

// =======================================================
// HELPERS
// =======================================================

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
    file?.size ??
    file?.file_size ??
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
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
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
  const name = getFileName(file);

  const extension = name
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}