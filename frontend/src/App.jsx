import PreviewViewer from "./components/PreviewViewer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Home,
  HardDrive,
  Clock,
  Star,
  Users,
  Trash2,
  Cloud,
  Search,
  Plus,
  Upload,
  FolderPlus,
  Folder,
  FileText,
  Image,
  File,
  MoreVertical,
  Grid2X2,
  List,
  ChevronRight,
  X,
  ArrowDownToLine,
  Copy,
  Move,
  Pencil,
  Share2,
  RotateCcw,
  LogOut,
  Check,
  RefreshCw,
  Info,
  Menu,
  Settings,
  CircleHelp,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import api from "./api/axios";
import { emptyFilters } from "./lib/searchFilters";
import { useAuth } from "./context/AuthContext";
import {
  SettingsPanel,
  AccountPanel,
  AdvancedSearchPanel,
  SupportPanel,
} from "./components/WorkspacePanels";
const views = [
  ["home", "Home", Home],
  ["drive", "My Drive", HardDrive],
  ["shared", "Shared links", Users],
  ["recent", "Recent", Clock],
  ["starred", "Starred", Star],
  ["trash", "Trash", Trash2],
  ["storage", "Storage", Cloud],
];
const bytes = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : n < 1073741824
        ? `${(n / 1048576).toFixed(1)} MB`
        : `${(n / 1073741824).toFixed(2)} GB`;
const message = (e) =>
  typeof e.response?.data?.detail === "string"
    ? e.response.data.detail
    : e.response?.data?.detail?.[0]?.msg || e.message || "Please try again.";
const key = (i) => `${i.kind}:${i.id}`;
function Brand() {
  return (
    <div className="brand">
      <Cloud size={32} />
      <span>My Drive · CI/CD Test</span>
    </div>
  );
}
function ItemIcon({ item, size = 22 }) {
  const Icon =
    item.kind === "folder"
      ? Folder
      : item.content_type?.startsWith("image/")
        ? Image
        : item.content_type?.includes("text") ||
            /\.(pdf|docx|xlsx)$/i.test(item.name)
          ? FileText
          : File;
  return (
    <Icon
      size={size}
      className={item.kind === "folder" ? "folder-icon" : "file-icon"}
    />
  );
}
function AuthScreen() {
  const { login } = useAuth();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const d = new FormData(e.currentTarget);
    try {
      if (register)
        await api.post("/auth/register", {
          full_name: d.get("name").trim(),
          email: d.get("email"),
          password: d.get("password"),
        });
      await login(d.get("email"), d.get("password"), d.get("otp") || "");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-intro">
          <Brand />
          <h1>
            Your files.
            <br />
            Always within reach.
          </h1>
          <p>
            A little more organized.
            <br />A lot more room for what matters.
          </p>
          <div className="auth-art">
            <Folder size={96} />
            <div>
              <FileText />
              <span>Everything in one place</span>
              <Check />
            </div>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <p>
            {register
              ? "Make space for your next big idea."
              : "Sign in to continue to File Drive."}
          </p>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {register && (
            <label>
              Full name
              <input
                name="name"
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={register ? 8 : 1}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              placeholder={
                register ? "At least 8 characters" : "Enter your password"
              }
            />
          </label>
          {!register && (
            <label>
              Authenticator or recovery code (if enabled)
              <input
                name="otp"
                maxLength={32}
                autoComplete="one-time-code"
                placeholder="Code from your authenticator"
              />
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ChevronRight size={18} />
          </button>
          <div className="auth-switch">
            {register ? "Already have an account?" : "New to File Drive?"}{" "}
            <button
              type="button"
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create account"}
            </button>
          </div>
        </form>
      </div>
      <p className="auth-footer">File Drive · Your personal file workspace</p>
    </div>
  );
}
export default function App() {
  const { user, loading, logout } = useAuth();
  useEffect(() => {
    window.addEventListener("auth-expired", logout);
    return () => window.removeEventListener("auth-expired", logout);
  }, [logout]);
  if (loading)
    return (
      <div className="empty-state">
        <Cloud size={48} />
        <p>Opening your workspace…</p>
      </div>
    );
  return user ? <Workspace user={user} logout={logout} /> : <AuthScreen />;
}
function Workspace({ user, logout }) {
  const { setUser } = useAuth();
  const [panel, setPanel] = useState(null),
    [filters, setFilters] = useState({ ...emptyFilters }),
    [filtersActive, setFiltersActive] = useState(false),
    [ascending, setAscending] = useState(true);
  const closePanel = useCallback(() => setPanel(null), []);
  useEffect(() => {
    api
      .get("/account")
      .then((r) => setUser(r.data))
      .catch(() => {});
  }, [setUser]);
  useEffect(() => {
    const theme = user.settings?.theme || "light";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [user.settings?.theme]);
  const [view, setView] = useState(user.settings?.default_view || "home"),
    [parent, setParent] = useState(null),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [data, setData] = useState({
      items: [],
      folders: [],
      breadcrumb: [],
      used_bytes: 0,
    }),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [grid, setGrid] = useState(
      user.settings?.layout
        ? user.settings.layout === "grid"
        : localStorage.getItem("drive-layout") === "grid",
    ),
    [sort, setSort] = useState("name"),
    [selected, setSelected] = useState([]),
    [menu, setMenu] = useState(null),
    [newMenu, setNewMenu] = useState(false),
    [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState(null),
    [shareDays, setShareDays] = useState("7"),
    [value, setValue] = useState(""),
    [destination, setDestination] = useState(""),
    [preview, setPreview] = useState(null),
    [progress, setProgress] = useState(null),
    [shares, setShares] = useState([]),
    [versions, setVersions] = useState([]);
  const input = useRef(null),
    folderInput = useRef(null),
    replacementInput = useRef(null),
    request = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim() !== search) {
        setLoading(true);
        setSearch(query.trim());
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, search]);
  useEffect(() => {
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const load = useCallback(
    (signal) => {
      const id = ++request.current;
      return api
        .get("/drive/items", {
          signal,
          params: {
            view: filtersActive ? (filters.in_trash ? "trash" : "home") : view,
            parent_id: filtersActive ? undefined : parent,
            q: search,
            advanced: filtersActive,
            file_type: filtersActive ? filters.file_type : "any",
            content_q: filtersActive ? filters.content_q : undefined,
            location_id:
              filtersActive && filters.location_id
                ? Number(filters.location_id)
                : undefined,
            starred_only: filtersActive ? filters.starred_only : false,
            modified_after:
              filtersActive && filters.modified_after
                ? filters.modified_after
                : undefined,
            modified_before:
              filtersActive && filters.modified_before
                ? filters.modified_before
                : undefined,
          },
        })
        .then((r) => {
          if (!signal?.aborted && id === request.current) {
            setData(r.data);
            setSelected([]);
          }
        })
        .catch((e) => {
          if (!signal?.aborted && id === request.current) setError(message(e));
        })
        .finally(() => {
          if (!signal?.aborted && id === request.current) setLoading(false);
        });
    },
    [view, parent, search, filters, filtersActive],
  );
  function refresh() {
    setLoading(true);
    return load();
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    const close = () => {
      setMenu(null);
      setNewMenu(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  function navigate(v, p = null) {
    setLoading(true);
    setFiltersActive(false);
    setFilters({ ...emptyFilters });
    setView(v);
    setParent(p);
    setQuery("");
    setSearch("");
    setError("");
    setMobile(false);
  }
  function dialog(action, items = []) {
    setMenu(null);
    setNewMenu(false);
    setValue(action === "rename" ? items[0].name : "");
    setDestination(parent == null ? "" : String(parent));
    setModal({ action, items });
  }
  async function perform(fn, text) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await fn();
      setToast(text);
      setModal(null);
      await refresh();
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const mutate = (item, action, payload = {}) =>
    api.post(`/drive/${item.kind}/${item.id}/${action}`, payload);
  async function download(item) {
    try {
      const r = await api.get(`/files/${item.id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data),
        a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(message(e));
    }
  }
  async function open(item) {
    if (item.kind === "folder") {
      navigate("drive", item.id);
      return;
    }
    setPreview({ item });
  }
  async function upload(files) {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    const folders = new Map();
    let count = 0;
    try {
      for (const file of files) {
        let dest = parent,
          path = "";
        for (const name of file.webkitRelativePath
          ? file.webkitRelativePath.split("/").slice(0, -1)
          : []) {
          path += "/" + name;
          if (!folders.has(path)) {
            const r = await api.post("/drive/folders", {
              name,
              parent_id: dest,
            });
            folders.set(path, r.data.id);
          }
          dest = folders.get(path);
        }
        const form = new FormData();
        form.append("file", file);
        if (dest != null) form.append("folder_id", dest);
        setProgress({
          name: file.name,
          current: count + 1,
          total: files.length,
          percent: 0,
        });
        await api.post("/files/upload", form, {
          adapter: "xhr",
          onUploadProgress: (e) =>
            setProgress({
              name: file.name,
              current: count + 1,
              total: files.length,
              percent: Math.round((100 * e.loaded) / (e.total || e.loaded)),
            }),
        });
        count++;
      }
      setToast(`${count} files uploaded`);
    } catch (e) {
      setError(`${count} files uploaded. ${message(e)}`);
    } finally {
      setProgress(null);
      setBusy(false);
      await refresh();
    }
  }
  async function submit(e) {
    e.preventDefault();
    const { action, items } = modal;
    if (action === "share") {
      let link = "";
      const ok = await perform(async () => {
        const r = await api.post(`/share/files/${items[0].id}`, {
          permission: "download",
          expires_at:
            shareDays === "never"
              ? null
              : new Date(
                  Date.now() + Number(shareDays) * 86400000,
                ).toISOString(),
        });
        link = `${api.defaults.baseURL.startsWith("/") ? window.location.origin + api.defaults.baseURL : api.defaults.baseURL}/share/${r.data.token}/download`;
        const s = await api.get("/share");
        setShares(s.data);
      }, "Share link created");
      if (ok) {
        setValue(link);
        setModal({ action: "links", items });
      }
      return;
    }
    await perform(async () => {
      if (action === "create")
        await api.post("/drive/folders", {
          name: value.trim(),
          parent_id: parent,
        });
      else
        for (const item of selectedRoots(items, data.folders, data.items))
          await mutate(item, action, {
            name: action === "rename" ? value.trim() : undefined,
            parent_id: destination === "" ? null : Number(destination),
          });
    }, { create: "Folder created", rename: "Name updated", move: "Items moved", copy: "Copy created", trash: "Moved to trash", restore: "Items restored", delete: "Permanently deleted" }[action]);
  }
  function invalidFolder(id) {
    return modal?.items.some((item) => {
      if (item.kind !== "folder") return false;
      let f = data.folders.find((x) => x.id === id);
      const seen = new Set();
      while (f && !seen.has(f.id)) {
        if (f.id === item.id) return true;
        seen.add(f.id);
        f = data.folders.find((x) => x.id === f.parent_id);
      }
      return false;
    });
  }
  function actions(item) {
    return trashView
      ? [
          ["restore", "Restore", RotateCcw],
          ["delete", "Delete forever", Trash2],
        ]
      : [
          [
            "open",
            item.kind === "folder" ? "Open folder" : "Preview",
            FileText,
          ],
          ...(item.kind === "file"
            ? [
                ["download", "Download", ArrowDownToLine],
                ["share", "Share", Share2],
                ["versions", "Manage versions", Clock],
              ]
            : []),
          ["rename", "Rename", Pencil],
          ["copy", "Make a copy", Copy],
          ["move", "Move to", Move],
          [
            "star",
            item.starred ? "Remove from starred" : "Add to starred",
            Star,
          ],
          ["details", "File information", Info],
          ["trash", "Move to trash", Trash2],
        ];
  }
  function act(action, item) {
    setMenu(null);
    if (action === "open") open(item);
    else if (action === "download") download(item);
    else if (action === "star")
      perform(
        () => mutate(item, "star", { starred: !item.starred }),
        item.starred ? "Removed from starred" : "Added to starred",
      );
    else if (action === "versions") {
      setVersions([]);
      dialog("versions", [item]);
      api
        .get(`/files/${item.id}/versions`)
        .then((r) => setVersions(r.data))
        .catch((e) => setError(message(e)));
    } else dialog(action, [item]);
  }
  const trashView = filtersActive ? filters.in_trash : view === "trash";
  const chosen = data.items.filter((i) => selected.includes(key(i))),
    sorted = [...data.items].sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === "folder" ? -1 : 1) ||
        (ascending ? 1 : -1) *
          (sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "size"
              ? a.size - b.size
              : sort === "modified"
                ? new Date(a.modified_at || a.created_at) -
                  new Date(b.modified_at || b.created_at)
                : new Date(a.created_at) - new Date(b.created_at)),
    );
  return (
    <div
      className="workspace"
      data-density={user.settings?.density || "comfortable"}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (view !== "trash" && !(filtersActive && filters.in_trash))
          upload([...e.dataTransfer.files]);
      }}
    >
      <header className="topbar">
        <button
          className="icon-button mobile-toggle"
          aria-label="Toggle sidebar"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
        <Brand />
        <div className="search-box">
          <Search size={22} />
          <input
            aria-label="Search files"
            placeholder="Search in Drive"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={18} />
            </button>
          )}
          <button
            className="icon-button advanced-search-button"
            aria-label="Advanced search"
            title="Advanced search"
            onClick={() => setPanel("search")}
          >
            <SlidersHorizontal size={22} />
          </button>
        </div>
        <div className="header-tools">
          <button
            className="icon-button"
            aria-label="Help and support"
            title="Help and support"
            onClick={() => setPanel("support")}
          >
            <CircleHelp size={23} />
          </button>
          <button
            className="icon-button"
            aria-label="Settings"
            title="Settings"
            onClick={() => setPanel("settings")}
          >
            <Settings size={23} />
          </button>
        </div>
        <div className="account">
          <span>{user.full_name}</span>
          <button
            className="avatar"
            title={user.email}
            aria-label="Manage your account"
            onClick={() => setPanel("account")}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="Your profile picture" />
            ) : (
              user.full_name?.[0]?.toUpperCase() || "U"
            )}
          </button>
        </div>
      </header>
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="new-wrap">
          <button
            className="new-button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setNewMenu(!newMenu);
            }}
          >
            <Plus size={27} />
            New
          </button>
          {newMenu && (
            <div className="dropdown new-dropdown">
              <button onClick={() => dialog("create")}>
                <FolderPlus size={19} />
                New folder
              </button>
              <hr />
              <button onClick={() => input.current.click()}>
                <Upload size={19} />
                File upload
              </button>
              <button onClick={() => folderInput.current.click()}>
                <Folder size={19} />
                Folder upload
              </button>
            </div>
          )}
        </div>
        <nav>
          {views.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "drive" && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="storage-summary">
          <div className="storage-track">
            <span
              style={{
                width: `${Math.min(100, (data.used_bytes / 16106127360) * 100)}%`,
              }}
            />
          </div>
          <p>{bytes(data.used_bytes)} used</p>
          <small>Stored on your server</small>
        </div>
        <div className="sidebar-bottom">
          <Cloud size={16} />
          Your personal workspace
        </div>
      </aside>
      <main className="drive-content">
        <div className="content-heading">
          <div>
            {view === "home" && !search && !filtersActive ? (
              <>
                <p className="eyebrow">YOUR WORKSPACE, ORGANIZED</p>
                <h1>Welcome, {user.full_name.split(" ")[0]}</h1>
                <p className="subtitle">
                  Everything you need, right where you left it.
                </p>
              </>
            ) : (
              <h1>
                {filtersActive
                  ? "Search results"
                  : search
                    ? `Search results for “${search}”`
                    : views.find((v) => v[0] === view)?.[1]}
              </h1>
            )}
          </div>
          <button
            className="icon-button"
            title="Refresh files"
            disabled={loading}
            onClick={refresh}
          >
            <RefreshCw size={20} className={loading ? "spinning" : ""} />
          </button>
        </div>
        {view === "home" && !search && !filtersActive && (
          <div className="quick-cards">
            <button onClick={() => input.current.click()}>
              <span className="quick-icon blue">
                <Upload />
              </span>
              <div>
                <strong>Upload a file</strong>
                <p>Bring your work together</p>
              </div>
              <Plus size={19} />
            </button>
            <button onClick={() => dialog("create")}>
              <span className="quick-icon yellow">
                <FolderPlus />
              </span>
              <div>
                <strong>Create a folder</strong>
                <p>A fresh space for your ideas</p>
              </div>
              <Plus size={19} />
            </button>
            <button onClick={() => navigate("starred")}>
              <span className="quick-icon purple">
                <Star />
              </span>
              <div>
                <strong>Your favorites</strong>
                <p>The things that matter most</p>
              </div>
              <ChevronRight size={19} />
            </button>
          </div>
        )}
        {view === "drive" && !search && !filtersActive && (
          <div className="breadcrumbs">
            <button onClick={() => navigate("drive")}>My Drive</button>
            {data.breadcrumb.map((f) => (
              <span key={f.id}>
                <ChevronRight size={17} />
                <button onClick={() => navigate("drive", f.id)}>
                  {f.name}
                </button>
              </span>
            ))}
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        <div className="filter-summary">
          {filtersActive && (
            <>
              <span>
                <SlidersHorizontal size={15} />
                Advanced search applied
              </span>
              <button
                onClick={() => {
                  setFiltersActive(false);
                  setFilters({ ...emptyFilters });
                  setQuery("");
                  setSearch("");
                }}
              >
                Clear filters
              </button>
            </>
          )}
        </div>
        <div className="file-toolbar">
          <div>
            {selected.length ? (
              <div className="selection-actions">
                <button
                  className="icon-button"
                  aria-label="Clear selection"
                  onClick={() => setSelected([])}
                >
                  <X size={17} />
                </button>
                <strong>{selected.length} selected</strong>
                {(trashView
                  ? [
                      ["restore", "Restore", RotateCcw],
                      ["delete", "Delete forever", Trash2],
                    ]
                  : [
                      ["move", "Move", Move],
                      ["copy", "Copy", Copy],
                      ["trash", "Trash", Trash2],
                    ]
                ).map(([a, l, I]) => (
                  <button key={a} onClick={() => dialog(a, chosen)}>
                    <I size={16} />
                    {l}
                  </button>
                ))}
              </div>
            ) : (
              <h2>
                {view === "home"
                  ? "All your files"
                  : trashView
                    ? "Items in trash"
                    : "Files and folders"}{" "}
                <span>{data.items.length}</span>
              </h2>
            )}
          </div>
          <div className="view-controls">
            <select
              aria-label="Sort files"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setAscending(e.target.value === "name");
              }}
            >
              <option value="name">Name</option>
              <option value="modified">Date modified</option>
              <option value="date">Date created</option>
              <option value="size">File size</option>
            </select>
            <button
              className="icon-button sort-direction"
              aria-label={ascending ? "Sort descending" : "Sort ascending"}
              title={ascending ? "Ascending" : "Descending"}
              onClick={() => setAscending(!ascending)}
            >
              {ascending ? <ArrowUp size={17} /> : <ArrowDown size={17} />}
            </button>
            <div className="view-toggle">
              <button
                className={!grid ? "selected" : ""}
                aria-label="List view"
                onClick={() => {
                  setGrid(false);
                  localStorage.setItem("drive-layout", "list");
                }}
              >
                <List size={19} />
              </button>
              <button
                className={grid ? "selected" : ""}
                aria-label="Grid view"
                onClick={() => {
                  setGrid(true);
                  localStorage.setItem("drive-layout", "grid");
                }}
              >
                <Grid2X2 size={18} />
              </button>
            </div>
          </div>
        </div>
        {trashView && (
          <p className="trash-note">
            Items stay here until you restore them or delete them forever.
          </p>
        )}
        {loading ? (
          <div className="empty-state">
            <RefreshCw className="spinning" />
            <p>Loading your files…</p>
          </div>
        ) : !sorted.length ? (
          <div className="empty-state">
            <div className="empty-graphic">
              {search ? (
                <Search size={45} />
              ) : trashView ? (
                <Trash2 size={45} />
              ) : (
                <Folder size={50} />
              )}
            </div>
            <h2>
              {search
                ? "No matching files"
                : trashView
                  ? "Your trash is empty"
                  : view === "starred"
                    ? "Keep your favorites close"
                    : "A little space for something great"}
            </h2>
            <p>
              {search
                ? "Try another name or keyword."
                : view === "starred"
                  ? "Star a file or folder to find it here."
                  : trashView
                    ? "Trashed files and folders will appear here."
                    : "Upload files or create a folder to get started."}
            </p>
            {!search && ["home", "drive"].includes(view) && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => input.current.click()}
              >
                <Upload size={17} />
                Upload files
              </button>
            )}
          </div>
        ) : (
          <div className={grid ? "file-grid" : "file-list"}>
            {!grid && (
              <div className="list-header">
                <input
                  type="checkbox"
                  aria-label="Select all files"
                  checked={selected.length === sorted.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? sorted.map(key) : [])
                  }
                />
                <span>Name</span>
                <span>Owner</span>
                <span>Date {trashView ? "deleted" : "modified"}</span>
                <span>File size</span>
                <span />
              </div>
            )}
            {sorted.map((item) => (
              <div
                key={key(item)}
                className={`file-row ${selected.includes(key(item)) ? "row-selected" : ""}`}
                onDoubleClick={() => !trashView && open(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu(key(item));
                }}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${item.name}`}
                  checked={selected.includes(key(item))}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, key(item)]
                        : selected.filter((k) => k !== key(item)),
                    )
                  }
                />
                {grid && (
                  <div
                    className="file-thumbnail"
                    onClick={() => !trashView && open(item)}
                  >
                    <ItemIcon item={item} size={62} />
                  </div>
                )}
                <button
                  className="file-name"
                  onClick={() => !trashView && open(item)}
                >
                  <ItemIcon item={item} />
                  <span title={item.name}>{item.name}</span>
                  {item.starred && <Star size={14} fill="currentColor" />}
                </button>
                <span className="file-owner">
                  <span className="tiny-avatar">{user.full_name[0]}</span>me
                </span>
                <span className="file-date">
                  {new Date(
                    item.deleted_at || item.modified_at || item.created_at,
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="file-size">
                  {item.kind === "folder" ? "—" : bytes(item.size)}
                </span>
                <div className="row-menu">
                  <button
                    className="icon-button"
                    aria-label={`Actions for ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(menu === key(item) ? null : key(item));
                    }}
                  >
                    <MoreVertical size={19} />
                  </button>
                  {menu === key(item) && (
                    <div
                      className="dropdown"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(item).map(([a, l, I]) => (
                        <button
                          key={a}
                          disabled={busy}
                          className={
                            ["trash", "delete"].includes(a) ? "danger" : ""
                          }
                          onClick={() => act(a, item)}
                        >
                          <I size={17} />
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="drop-hint">
          Drag and drop files to upload · Double-click a folder to open it
        </p>
      </main>
      <input
        ref={replacementInput}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const form = new FormData();
            form.append("file", file);
            perform(
              () => api.put(`/files/${modal.items[0].id}/replace`, form),
              "New version uploaded",
            );
          }
          e.target.value = "";
        }}
      />
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          upload([...e.target.files]);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        webkitdirectory=""
        hidden
        onChange={(e) => {
          upload([...e.target.files]);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={19} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {progress && (
        <div className="upload-progress">
          <strong>
            Uploading {progress.current} of {progress.total}
          </strong>
          <p>{progress.name}</p>
          <div className="storage-track">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}
      {panel === "settings" && (
        <SettingsPanel
          user={user}
          close={closePanel}
          onSaved={(profile) => {
            setUser(profile);
            setGrid(profile.settings.layout === "grid");
            setToast("Settings saved");
          }}
        />
      )}
      {panel === "account" && (
        <AccountPanel
          user={user}
          close={closePanel}
          onUpdated={setUser}
          logout={logout}
        />
      )}
      {panel === "search" && (
        <AdvancedSearchPanel
          user={user}
          folders={data.folders}
          filters={{ ...filters, item_name: query }}
          close={closePanel}
          onSearch={(draft) => {
            setLoading(true);
            setFilters(draft);
            setFiltersActive(true);
            setQuery(draft.item_name);
            setSearch(draft.item_name.trim());
          }}
        />
      )}
      {panel === "support" && <SupportPanel close={closePanel} />}
      {modal && (
        <div className="modal-overlay" onClick={() => !busy && setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.action}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close dialog"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <X size={22} />
            </button>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {modal.action === "account" ? (
              <>
                <div className="large-avatar">{user.full_name[0]}</div>
                <h2>{user.full_name}</h2>
                <p>{user.email}</p>
                <button className="secondary" onClick={logout}>
                  <LogOut size={18} />
                  Sign out
                </button>
              </>
            ) : modal.action === "details" ? (
              <>
                <h2>File information</h2>
                <ItemIcon item={modal.items[0]} size={42} />
                <h3>{modal.items[0].name}</h3>
                <dl>
                  <dt>Type</dt>
                  <dd>{modal.items[0].content_type}</dd>
                  <dt>Size</dt>
                  <dd>{bytes(modal.items[0].size)}</dd>
                  <dt>Owner</dt>
                  <dd>{user.email}</dd>
                  <dt>Created</dt>
                  <dd>
                    {new Date(modal.items[0].created_at).toLocaleString()}
                  </dd>
                </dl>
              </>
            ) : modal.action === "unsupported" ? (
              <>
                <h2>Preview unavailable</h2>
                <p>Download {modal.items[0].name} to open it on your device.</p>
                <button
                  className="primary"
                  onClick={() => download(modal.items[0])}
                >
                  <ArrowDownToLine size={18} />
                  Download
                </button>
              </>
            ) : modal.action === "versions" ? (
              <>
                <h2>Manage versions</h2>
                <p>{modal.items[0].name}</p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => replacementInput.current.click()}
                >
                  <Upload size={18} />
                  Upload new version
                </button>
                <p className="version-help">
                  The current file is saved as a version before it is replaced.
                </p>
                {versions.length ? (
                  versions.map((v) => (
                    <div className="share-row" key={v.id}>
                      <span>
                        Version {v.version_number} · {bytes(v.file_size)}
                      </span>
                      <button
                        disabled={busy}
                        onClick={() =>
                          perform(
                            () =>
                              api.post(
                                `/files/${modal.items[0].id}/versions/${v.id}/restore`,
                              ),
                            "Version restored",
                          )
                        }
                      >
                        Restore
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No saved versions yet.</p>
                )}
              </>
            ) : modal.action === "links" ? (
              <>
                <h2>Share link</h2>
                <p>Anyone with this link can download this file.</p>
                <input
                  readOnly
                  value={value}
                  aria-label="Share link"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(value);
                      setToast("Link copied");
                    } catch {
                      setError("Select the link above and copy it.");
                    }
                  }}
                >
                  <Copy size={18} />
                  Copy link
                </button>
                {Array.isArray(shares) &&
                  shares
                    .filter((s) => s.file_id === modal.items[0].id)
                    .map((s) => (
                      <div className="share-row" key={s.share_id}>
                        <span>Active link #{s.share_id}</span>
                        <button
                          onClick={async () => {
                            try {
                              await api.delete(`/share/${s.share_id}`);
                              setShares(
                                shares.filter((x) => x.share_id !== s.share_id),
                              );
                              setToast("Link revoked");
                            } catch (e) {
                              setError(message(e));
                            }
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
              </>
            ) : (
              <form onSubmit={submit}>
                <h2>
                  {
                    {
                      create: "New folder",
                      rename: "Rename",
                      copy: "Make a copy",
                      move: "Move to",
                      trash: "Move to trash?",
                      restore: "Restore items?",
                      delete: "Delete forever?",
                      share: "Share file",
                    }[modal.action]
                  }
                </h2>
                {["create", "rename"].includes(modal.action) && (
                  <label>
                    Name
                    <input
                      autoFocus
                      required
                      maxLength={255}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Untitled folder"
                    />
                  </label>
                )}
                {["move", "copy"].includes(modal.action) && (
                  <>
                    <p>
                      Choose a destination for{" "}
                      {modal.items.length === 1
                        ? modal.items[0].name
                        : `${modal.items.length} items`}
                      .
                    </p>
                    <label>
                      Destination
                      <select
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      >
                        <option value="">My Drive</option>
                        {data.folders
                          .filter((f) => !invalidFolder(f.id))
                          .map((f) => (
                            <option value={f.id} key={f.id}>
                              {folderPath(f, data.folders)}
                            </option>
                          ))}
                      </select>
                    </label>
                  </>
                )}
                {["trash", "restore", "delete"].includes(modal.action) && (
                  <p>
                    {modal.items.length} items
                    {modal.items.some((i) => i.kind === "folder")
                      ? " and their folder contents"
                      : ""}{" "}
                    will be{" "}
                    {modal.action === "delete"
                      ? "permanently deleted. This cannot be undone."
                      : modal.action === "restore"
                        ? "restored to your drive."
                        : "moved to trash. You can restore them later."}
                  </p>
                )}
                {modal.action === "share" && (
                  <div>
                    <p>
                      Create a link that lets anyone with the link download{" "}
                      <strong>{modal.items[0].name}</strong>. You can revoke it
                      later.
                    </p>
                    <label>
                      Link expires
                      <select
                        value={shareDays}
                        onChange={(e) => setShareDays(e.target.value)}
                      >
                        <option value="1">After 1 day</option>
                        <option value="7">After 7 days</option>
                        <option value="30">After 30 days</option>
                        <option value="never">Never (until revoked)</option>
                      </select>
                    </label>
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className={`primary ${modal.action === "delete" ? "delete-button" : ""}`}
                    disabled={
                      busy ||
                      (["create", "rename"].includes(modal.action) &&
                        !value.trim())
                    }
                  >
                    {busy
                      ? "Working…"
                      : {
                          create: "Create",
                          rename: "Save",
                          copy: "Copy",
                          move: "Move",
                          trash: "Move to trash",
                          restore: "Restore",
                          delete: "Delete forever",
                          share: "Create link",
                        }[modal.action]}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      {preview && (
        <PreviewViewer
          key={preview.item.id}
          item={preview.item}
          files={sorted.filter((i) => i.kind === "file")}
          onClose={() => setPreview(null)}
          onNavigate={open}
          onDownload={download}
        />
      )}
    </div>
  );
}
function folderPath(folder, folders) {
  const names = [folder.name],
    seen = new Set([folder.id]);
  let f = folders.find((x) => x.id === folder.parent_id);
  while (f && !seen.has(f.id)) {
    names.unshift(f.name);
    seen.add(f.id);
    f = folders.find((x) => x.id === f.parent_id);
  }
  return names.join(" / ");
}

function selectedRoots(items, folders, allItems) {
  const selectedFolders = new Set(
    items.filter((i) => i.kind === "folder").map((i) => i.id),
  );
  const map = new Map(
    [...folders, ...allItems.filter((i) => i.kind === "folder")].map((f) => [
      f.id,
      f,
    ]),
  );
  return items.filter((item) => {
    let parent = item.parent_id;
    const seen = new Set();
    while (parent != null && !seen.has(parent)) {
      if (selectedFolders.has(parent)) return false;
      seen.add(parent);
      parent = map.get(parent)?.parent_id;
    }
    return true;
  });
}
