import {
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  RotateCcw,
  MoreVertical,
  RefreshCw,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  getTrash,
  restoreFile,
} from "../api/trash";

export default function Trash() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTrash() {
    try {
      setLoading(true);
      setError("");

      const data = await getTrash();

      console.log("TRASH FROM BACKEND:", data);

      setFiles(data?.files || []);
      setFolders(data?.folders || []);
    } catch (err) {
      console.error("TRASH API ERROR:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load Trash."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrash();
  }, []);

  async function handleRestore(fileId) {
    try {
      await restoreFile(fileId);

      // Immediately remove it from Trash UI
      setFiles((currentFiles) =>
        currentFiles.filter(
          (file) => file.id !== fileId
        )
      );
    } catch (err) {
      console.error("RESTORE ERROR:", err);

      alert(
        err.response?.data?.detail ||
          "Unable to restore file."
      );
    }
  }

  const totalItems =
    files.length + folders.length;

  return (
    <div className="min-h-full">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="mb-8">

        <div className="flex items-start justify-between">

          <div>

            <p className="text-sm font-medium text-slate-400">
              Storage
            </p>

            <div className="mt-1 flex items-center gap-3">

              <Trash2
                size={28}
                className="text-slate-700"
              />

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Trash
              </h1>

            </div>

            <p className="mt-2 text-sm text-slate-500">
              Files you've moved to trash.
            </p>

          </div>

          {/* Refresh */}

          <button
            onClick={loadTrash}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              size={19}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>

        </div>

      </section>


      {/* =====================================================
          COUNT
      ===================================================== */}

      <div className="mb-5 flex items-center justify-between">

        <p className="text-sm font-semibold text-slate-800">
          {totalItems}{" "}
          {totalItems === 1 ? "item" : "items"}
        </p>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">

          <RefreshCw
            size={25}
            className="mx-auto animate-spin text-slate-400"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading Trash...
          </p>

        </div>
      )}


      {/* =====================================================
          EMPTY
      ===================================================== */}

      {!loading && !error && totalItems === 0 && (
        <div className="flex min-h-[430px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">

          <div className="text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">

              <Trash2
                size={30}
                className="text-slate-400"
              />

            </div>

            <h2 className="mt-5 text-base font-semibold text-slate-800">
              Trash is empty
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Files you delete will appear here.
            </p>

          </div>

        </div>
      )}


      {/* =====================================================
          CONTENT
      ===================================================== */}

      {!loading && totalItems > 0 && (

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

          {/* Folders */}

          {folders.map((folder) => (
            <FolderRow
              key={`folder-${folder.id}`}
              folder={folder}
            />
          ))}


          {/* Files */}

          {files.map((file) => (
            <FileRow
              key={`file-${file.id}`}
              file={file}
              onRestore={handleRestore}
            />
          ))}

        </div>

      )}

    </div>
  );
}


/* ==========================================================
   FILE ROW
========================================================== */

function FileRow({
  file,
  onRestore,
}) {
  const icon = getFileIcon(
    file.content_type
  );

  const size = formatFileSize(
    file.file_size
  );

  const deletedDate =
    file.deleted_at
      ? new Date(
          file.deleted_at
        ).toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )
      : "Recently";


  return (
    <div className="group flex min-h-[82px] items-center gap-4 border-b border-slate-100 px-5 transition hover:bg-slate-50">

      {/* Icon */}

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        {icon}
      </div>


      {/* File information */}

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-semibold text-slate-800">
          {file.original_filename}
        </p>

        <p className="mt-1 truncate text-xs text-slate-400">
          {file.content_type || "File"}
          {" · "}
          {size}
        </p>

      </div>


      {/* Deleted date */}

      <div className="hidden text-right sm:block">

        <p className="text-xs text-slate-400">
          Deleted
        </p>

        <p className="mt-1 text-xs font-medium text-slate-500">
          {deletedDate}
        </p>

      </div>


      {/* Restore */}

      <button
        onClick={() =>
          onRestore(file.id)
        }
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        title="Restore"
      >
        <RotateCcw size={17} />

        <span className="hidden md:inline">
          Restore
        </span>
      </button>


      {/* More */}

      <button
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        title="More options"
      >
        <MoreVertical size={18} />
      </button>

    </div>
  );
}


/* ==========================================================
   FOLDER ROW
========================================================== */

function FolderRow({ folder }) {
  return (
    <div className="flex min-h-[82px] items-center gap-4 border-b border-slate-100 px-5 transition hover:bg-slate-50">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-600">

        <Trash2 size={21} />

      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-semibold text-slate-800">
          {folder.name}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Folder
        </p>

      </div>

    </div>
  );
}


/* ==========================================================
   FILE ICON
========================================================== */

function getFileIcon(contentType) {

  if (!contentType) {
    return <File size={21} />;
  }

  if (contentType.includes("pdf")) {
    return <FileText size={21} />;
  }

  if (
    contentType.includes("image")
  ) {
    return <FileImage size={21} />;
  }

  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel")
  ) {
    return <FileSpreadsheet size={21} />;
  }

  if (
    contentType.includes("zip") ||
    contentType.includes("rar") ||
    contentType.includes("archive")
  ) {
    return <FileArchive size={21} />;
  }

  return <FileText size={21} />;
}


/* ==========================================================
   FORMAT FILE SIZE
========================================================== */

function formatFileSize(bytes) {

  if (!bytes || bytes === 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  const size =
    bytes /
    Math.pow(1024, index);

  return `${size.toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
}