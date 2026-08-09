import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  MoreVertical,
  Download,
  Pencil,
  Trash2,
  Upload,
  RefreshCw,
  List,
  Grid2X2,
  ChevronRight,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import {
  getFiles,
  uploadFile,
  downloadFile,
  renameFile,
} from "../api/files";

import {
  moveFileToTrash,
} from "../api/trash";

import api from "../api/axios";


export default function MyDrive() {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState(
    localStorage.getItem("drive_view") || "list"
  );

  const [openMenu, setOpenMenu] = useState(null);

  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);


  /* =====================================================
     LOAD ROOT DRIVE
  ===================================================== */

  async function loadDrive() {
    try {
      setLoading(true);
      setError("");

      const [filesData, foldersData] =
        await Promise.all([
          getFiles(),
          getFolders(),
        ]);

      setFiles(
        Array.isArray(filesData)
          ? filesData
          : []
      );

      setFolders(
        Array.isArray(foldersData)
          ? foldersData
          : []
      );

      setCurrentFolder(null);
      setFolderPath([]);

    } catch (err) {
      console.error(
        "Drive loading error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load your drive."
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadDrive();
  }, []);


  /* =====================================================
     VIEW
  ===================================================== */

  function changeView(mode) {
    setViewMode(mode);

    localStorage.setItem(
      "drive_view",
      mode
    );
  }


  /* =====================================================
     UPLOAD
  ===================================================== */

  function openUpload() {
    fileInputRef.current?.click();
  }


  async function handleUpload(event) {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      await uploadFile(selectedFile);

      await loadDrive();

    } catch (err) {
      console.error(
        "Upload error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to upload file."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }


  /* =====================================================
     DOWNLOAD
  ===================================================== */

  async function handleDownload(file) {
    try {
      setOpenMenu(null);
      setError("");

      const response =
        await downloadFile(
          getFileId(file)
        );

      const blob = new Blob(
        [response.data],
        {
          type:
            response.headers?.[
              "content-type"
            ] ||
            "application/octet-stream",
        }
      );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        getFileName(file);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );

    } catch (err) {
      console.error(
        "Download error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to download file."
      );
    }
  }


  /* =====================================================
     RENAME
  ===================================================== */

  async function handleRename(file) {
    setOpenMenu(null);

    const oldName =
      getFileName(file);

    const newName =
      window.prompt(
        "Enter new file name:",
        oldName
      );

    if (
      !newName ||
      !newName.trim()
    ) {
      return;
    }

    if (
      newName.trim() ===
      oldName
    ) {
      return;
    }

    try {
      setError("");

      await renameFile(
        getFileId(file),
        newName.trim()
      );

      await refreshCurrentLocation();

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


  /* =====================================================
     MOVE FILE TO TRASH
     
     IMPORTANT:
     We DO NOT call DELETE /files/{id}.
     
     We call:
     PATCH /trash/files/{id}
  ===================================================== */

  async function handleMoveToTrash(file) {
    setOpenMenu(null);

    const fileName =
      getFileName(file);

    const confirmed =
      window.confirm(
        `Move "${fileName}" to trash?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await moveFileToTrash(
        getFileId(file)
      );

      await refreshCurrentLocation();

    } catch (err) {
      console.error(
        "Move to trash error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to move file to trash."
      );
    }
  }


  /* =====================================================
     REFRESH CURRENT LOCATION
  ===================================================== */

  async function refreshCurrentLocation() {
    if (!currentFolder) {
      await loadDrive();
      return;
    }

    await openFolder(
      currentFolder,
      false
    );
  }


  /* =====================================================
     OPEN FOLDER
  ===================================================== */

  async function openFolder(
    folder,
    addToPath = true
  ) {
    try {
      setLoading(true);
      setError("");

      const folderId =
        getFolderId(folder);

      const response =
        await api.get(
          `/folders/${folderId}/contents`
        );

      const data =
        response.data || {};

      setCurrentFolder(folder);

      if (addToPath) {
        setFolderPath(
          (previous) => [
            ...previous,
            folder,
          ]
        );
      }

      setFiles(
        Array.isArray(data.files)
          ? data.files
          : []
      );

      setFolders(
        Array.isArray(
          data.folders
        )
          ? data.folders
          : []
      );

    } catch (err) {
      console.error(
        "Folder error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to open folder."
      );
    } finally {
      setLoading(false);
    }
  }


  /* =====================================================
     ROOT
  ===================================================== */

  async function goToRoot() {
    await loadDrive();
  }


  /* =====================================================
     BREADCRUMB
  ===================================================== */

  async function goToBreadcrumb(
    index
  ) {
    if (index === -1) {
      await goToRoot();
      return;
    }

    const folder =
      folderPath[index];

    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          `/folders/${getFolderId(
            folder
          )}/contents`
        );

      const data =
        response.data || {};

      setCurrentFolder(folder);

      setFolderPath(
        folderPath.slice(
          0,
          index + 1
        )
      );

      setFiles(
        Array.isArray(data.files)
          ? data.files
          : []
      );

      setFolders(
        Array.isArray(
          data.folders
        )
          ? data.folders
          : []
      );

    } catch (err) {
      console.error(
        "Breadcrumb error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to open folder."
      );
    } finally {
      setLoading(false);
    }
  }


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading your drive...
        </p>
      </div>
    );
  }


  /* =====================================================
     UI
  ===================================================== */

  return (
    <div
      className="space-y-5"
      onClick={() =>
        setOpenMenu(null)
      }
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <section>

        <div className="flex items-center justify-between gap-4">

          <div>

            <p className="text-xs font-medium text-slate-400">
              {currentFolder
                ? "Folder"
                : "My Drive"}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {currentFolder
                ? getFolderName(
                    currentFolder
                  )
                : "My Drive"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Store, organize and manage your files.
            </p>

          </div>


          <div>

            <button
              onClick={openUpload}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={17} />

              {uploading
                ? "Uploading..."
                : "Upload"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />

          </div>

        </div>

      </section>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
            className="font-semibold"
          >
            ×
          </button>

        </div>
      )}


      {/* =================================================
          BREADCRUMB + TOOLBAR
      ================================================= */}

      <div className="flex items-center justify-between gap-4">

        <div className="flex min-w-0 items-center gap-1 text-sm">

          <button
            onClick={() =>
              goToRoot()
            }
            className="rounded-lg px-2 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            My Drive
          </button>


          {folderPath.map(
            (folder, index) => (
              <div
                key={
                  getFolderId(
                    folder
                  ) || index
                }
                className="flex items-center gap-1"
              >

                <ChevronRight
                  size={15}
                  className="text-slate-300"
                />

                <button
                  onClick={() =>
                    goToBreadcrumb(
                      index
                    )
                  }
                  className="max-w-[180px] truncate rounded-lg px-2 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {getFolderName(
                    folder
                  )}
                </button>

              </div>
            )
          )}

        </div>


        <div className="flex shrink-0 items-center gap-2">

          <button
            onClick={
              refreshCurrentLocation
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>


          <div className="flex overflow-hidden rounded-full border border-slate-300 bg-white">

            <button
              onClick={() =>
                changeView("list")
              }
              className={`flex h-9 w-10 items-center justify-center transition ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              title="List view"
            >
              <List size={17} />
            </button>


            <button
              onClick={() =>
                changeView("grid")
              }
              className={`flex h-9 w-10 items-center justify-center transition ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              title="Grid view"
            >
              <Grid2X2 size={16} />
            </button>

          </div>

        </div>

      </div>


      {/* =================================================
          FOLDERS
      ================================================= */}

      {folders.length > 0 && (
        <section className="space-y-3">

          <div className="flex items-center justify-between">

            <h2 className="text-base font-semibold text-slate-900">
              Folders
            </h2>

            <span className="text-xs text-slate-400">
              {folders.length}
            </span>

          </div>


          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">

            {folders.map(
              (folder) => (
                <FolderCard
                  key={getFolderId(
                    folder
                  )}
                  folder={folder}
                  onOpen={() =>
                    openFolder(
                      folder
                    )
                  }
                />
              )
            )}

          </div>

        </section>
      )}


      {/* =================================================
          FILES
      ================================================= */}

      <section className="space-y-3">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-base font-semibold text-slate-900">
              Files
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {files.length}{" "}
              {files.length === 1
                ? "file"
                : "files"}
            </p>

          </div>

        </div>


        {files.length === 0 ? (

          <EmptyState
            onUpload={openUpload}
          />

        ) : viewMode === "list" ? (

          <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">

            {files.map(
              (file) => (
                <FileListRow
                  key={getFileId(
                    file
                  )}
                  file={file}
                  openMenu={
                    openMenu
                  }
                  setOpenMenu={
                    setOpenMenu
                  }
                  onDownload={
                    handleDownload
                  }
                  onRename={
                    handleRename
                  }
                  onDelete={
                    handleMoveToTrash
                  }
                />
              )
            )}

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">

            {files.map(
              (file) => (
                <FileGridCard
                  key={getFileId(
                    file
                  )}
                  file={file}
                  openMenu={
                    openMenu
                  }
                  setOpenMenu={
                    setOpenMenu
                  }
                  onDownload={
                    handleDownload
                  }
                  onRename={
                    handleRename
                  }
                  onDelete={
                    handleMoveToTrash
                  }
                />
              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}


/* =========================================================
   FOLDER CARD
========================================================= */

function FolderCard({
  folder,
  onOpen,
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
        <Folder size={20} />
      </div>

      <div className="min-w-0">

        <p className="truncate text-sm font-semibold text-slate-800">
          {getFolderName(
            folder
          )}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          Folder
        </p>

      </div>

    </button>
  );
}


/* =========================================================
   LIST ROW
========================================================= */

function FileListRow({
  file,
  openMenu,
  setOpenMenu,
  onDownload,
  onRename,
  onDelete,
}) {
  return (
    <div className="group flex min-h-[68px] items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-b-0 hover:bg-slate-50">

      <FileIcon file={file} />

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-semibold text-slate-800">
          {getFileName(file)}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-400">
          {getFileType(file)}
          {" · "}
          {formatBytes(
            getFileSize(file)
          )}
        </p>

      </div>


      <span className="hidden shrink-0 text-xs text-slate-400 md:block">
        {formatDate(
          file.updated_at ||
            file.created_at ||
            file.uploaded_at
        )}
      </span>


      <FileMenu
        file={file}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        onDownload={onDownload}
        onRename={onRename}
        onDelete={onDelete}
      />

    </div>
  );
}


/* =========================================================
   GRID CARD
========================================================= */

function FileGridCard({
  file,
  openMenu,
  setOpenMenu,
  onDownload,
  onRename,
  onDelete,
}) {
  return (
    <div className="group relative overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">

      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-t-xl bg-slate-50">

        <FileIcon
          file={file}
          large
        />

      </div>


      <div className="flex items-center gap-2 p-3">

        <div className="min-w-0 flex-1">

          <p className="truncate text-sm font-semibold text-slate-800">
            {getFileName(file)}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-400">
            {formatBytes(
              getFileSize(file)
            )}
          </p>

        </div>


        <FileMenu
          file={file}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onDownload={onDownload}
          onRename={onRename}
          onDelete={onDelete}
        />

      </div>

    </div>
  );
}


/* =========================================================
   FILE MENU
========================================================= */

function FileMenu({
  file,
  openMenu,
  setOpenMenu,
  onDownload,
  onRename,
  onDelete,
}) {
  const id = getFileId(file);

  const isOpen =
    openMenu === id;

  return (
    <div
      className="relative shrink-0"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      <button
        onClick={() =>
          setOpenMenu(
            isOpen ? null : id
          )
        }
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        title="More options"
      >
        <MoreVertical size={17} />
      </button>


      {isOpen && (
        <div
          className="absolute right-0 top-9 z-[100] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <MenuButton
            icon={
              <Download size={16} />
            }
            label="Download"
            onClick={() =>
              onDownload(file)
            }
          />

          <MenuButton
            icon={
              <Pencil size={16} />
            }
            label="Rename"
            onClick={() =>
              onRename(file)
            }
          />

          <div className="my-1 border-t border-slate-100" />

          <MenuButton
            danger
            icon={
              <Trash2 size={16} />
            }
            label="Move to trash"
            onClick={() =>
              onDelete(file)
            }
          />

        </div>
      )}

    </div>
  );
}


/* =========================================================
   MENU BUTTON
========================================================= */

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}


/* =========================================================
   FILE ICON
========================================================= */

function FileIcon({
  file,
  large = false,
}) {
  const type = (
    getFileType(file) || ""
  ).toLowerCase();

  let Icon = File;

  if (
    type.includes("pdf") ||
    type.includes("text")
  ) {
    Icon = FileText;
  } else if (
    type.includes("excel") ||
    type.includes("sheet") ||
    type.includes("xlsx") ||
    type.includes("csv")
  ) {
    Icon = FileSpreadsheet;
  } else if (
    type.includes("image") ||
    type.includes("png") ||
    type.includes("jpg") ||
    type.includes("jpeg")
  ) {
    Icon = FileImage;
  } else if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("archive")
  ) {
    Icon = FileArchive;
  }


  if (large) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-sm">
        <Icon
          size={38}
          className="text-slate-500"
        />
      </div>
    );
  }


  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
      <Icon size={20} />
    </div>
  );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  onUpload,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
        <FileText size={25} />
      </div>

      <h3 className="text-sm font-semibold text-slate-800">
        No files here
      </h3>

      <p className="mt-1 text-xs text-slate-400">
        Upload a file to get started.
      </p>

      <button
        onClick={onUpload}
        className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        <Upload size={16} />
        Upload file
      </button>

    </div>
  );
}


/* =========================================================
   FOLDERS API
========================================================= */

async function getFolders() {
  const response =
    await api.get("/folders");

  return response.data;
}


/* =========================================================
   HELPERS
========================================================= */

function getFileId(file) {
  return (
    file?.id ??
    file?.file_id ??
    file?.fileId
  );
}


function getFolderId(folder) {
  return (
    folder?.id ??
    folder?.folder_id ??
    folder?.folderId
  );
}


function getFileName(file) {
  return (
    file?.original_filename ||
    file?.name ||
    file?.filename ||
    file?.file_name ||
    "Unnamed file"
  );
}


function getFolderName(folder) {
  return (
    folder?.name ||
    folder?.folder_name ||
    "Unnamed folder"
  );
}


function getFileType(file) {
  return (
    file?.content_type ||
    file?.mime_type ||
    file?.file_type ||
    getExtension(file) ||
    "File"
  );
}


function getFileSize(file) {
  return (
    file?.size ??
    file?.file_size ??
    file?.size_bytes ??
    0
  );
}


function getExtension(file) {
  const name =
    getFileName(file);

  if (!name.includes(".")) {
    return "";
  }

  return name
    .split(".")
    .pop()
    .toUpperCase();
}


function formatBytes(bytes) {
  const value =
    Number(bytes);

  if (
    !value ||
    value <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(value) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const size =
    value /
    Math.pow(
      1024,
      index
    );

  return `${size.toFixed(
    size >= 10 ? 0 : 1
  )} ${units[index]}`;
}


function formatDate(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
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