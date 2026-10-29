import SecurityCenter from "./SecurityCenter";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Check,
  ArrowLeft,
  LifeBuoy,
  Send,
  Settings,
  ShieldCheck,
} from "lucide-react";
import api from "../api/axios";
import { emptyFilters } from "../lib/searchFilters";

const errorMessage = (e) =>
  typeof e.response?.data?.detail === "string"
    ? e.response.data.detail
    : e.response?.data?.detail?.[0]?.msg || e.message || "Please try again.";

function PanelShell({ title, close, children, wide = false }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const handle = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key !== "Tab") return;
      const controls = [
        ...panel.current.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0],
        last = controls.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-overlay" onClick={close}>
      <section
        ref={panel}
        tabIndex={-1}
        className={`modal workspace-panel ${wide ? "wide-panel" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={23} />
        </button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function SettingsPanel({ user, close, onSaved }) {
  const [settings, setSettings] = useState(
    user.settings || {
      theme: "light",
      density: "comfortable",
      default_view: "home",
      layout: "list",
    },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (field, value) =>
    setSettings((s) => ({ ...s, [field]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/account/settings", settings);
      onSaved(r.data);
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PanelShell title="Settings" close={close}>
      <p className="panel-lead">Make your workspace feel right for you.</p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={save}>
        <div className="settings-section">
          <Settings size={21} />
          <h3>Appearance</h3>
        </div>
        <label>
          Theme
          <select
            value={settings.theme}
            onChange={(e) => change("theme", e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Use device theme</option>
          </select>
        </label>
        <label>
          File list spacing
          <select
            value={settings.density}
            onChange={(e) => change("density", e.target.value)}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <div className="settings-section">
          <ArrowLeft size={21} />
          <h3>Start and layout</h3>
        </div>
        <label>
          Start page
          <select
            value={settings.default_view}
            onChange={(e) => change("default_view", e.target.value)}
          >
            <option value="home">Home</option>
            <option value="drive">My Drive</option>
            <option value="recent">Recent</option>
            <option value="starred">Starred</option>
          </select>
        </label>
        <label>
          Default file view
          <select
            value={settings.layout}
            onChange={(e) => change("layout", e.target.value)}
          >
            <option value="list">List</option>
            <option value="grid">Grid</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

export function AccountPanel({ user, close, onUpdated, logout }) {
  const [tab, setTab] = useState("profile"),
    [name, setName] = useState(user.full_name),
    [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const fileInput = useRef(null);
  async function perform(fn, text) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(text);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(e) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    await perform(async () => {
      const r = await api.patch("/account", {
        full_name: name,
        email,
        current_password: data.get("current_password") || undefined,
        code: data.get("code") || "",
      });
      localStorage.setItem("access_token", r.data.access_token);
      onUpdated(r.data.user);
      form.reset();
    }, "Profile saved");
  }
  async function password(e) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    if (data.get("new_password") !== data.get("confirm_password")) {
      setError("The new passwords do not match.");
      return;
    }
    await perform(async () => {
      const r = await api.post("/account/password", {
        current_password: data.get("current_password"),
        new_password: data.get("new_password"),
        code: data.get("code") || "",
      });
      localStorage.setItem("access_token", r.data.access_token);
      form.reset();
    }, "Password changed. Your other sessions have been signed out.");
  }
  async function avatar(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose a profile picture smaller than 2 MB.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    await perform(async () => {
      const r = await api.post("/account/avatar", form, { adapter: "xhr" });
      onUpdated(r.data);
    }, "Profile picture updated");
  }
  return (
    <PanelShell title="Manage your account" close={close}>
      <div className="profile-summary">
        <div className="profile-photo">
          {user.avatar ? (
            <img src={user.avatar} alt="Your profile picture" />
          ) : (
            <span>{user.full_name[0]?.toUpperCase()}</span>
          )}
          <button
            aria-label="Change profile picture"
            disabled={busy}
            onClick={() => fileInput.current.click()}
          >
            <Camera size={17} />
          </button>
        </div>
        <div>
          <strong>{user.full_name}</strong>
          <p>{user.email}</p>
          <small>Account ID: {user.id}</small>
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={avatar}
      />
      <div className="profile-photo-actions">
        <button disabled={busy} onClick={() => fileInput.current.click()}>
          Change picture
        </button>
        {user.avatar && (
          <button
            disabled={busy}
            onClick={() =>
              perform(async () => {
                const r = await api.delete("/account/avatar");
                onUpdated(r.data);
              }, "Profile picture removed")
            }
          >
            Remove picture
          </button>
        )}
        <small>PNG, JPEG or WebP · up to 2 MB</small>
      </div>
      <div className="panel-tabs">
        <button
          className={tab === "profile" ? "active" : ""}
          onClick={() => {
            setTab("profile");
            setError("");
            setNotice("");
          }}
        >
          Profile
        </button>
        <button
          className={tab === "security" ? "active" : ""}
          onClick={() => {
            setTab("security");
            setError("");
            setNotice("");
          }}
        >
          <ShieldCheck size={16} />
          Security
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {tab === "profile" ? (
        <form key="profile" onSubmit={saveProfile}>
          <label>
            Full name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            Email / login ID
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          {email.trim().toLowerCase() !== user.email && (
            <label>
              Current password to change email
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
          )}
          {email.trim().toLowerCase() !== user.email && (
            <label>
              Authenticator or recovery code (if enabled)
              <input name="code" maxLength={32} autoComplete="one-time-code" />
            </label>
          )}
          <div className="modal-actions">
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      ) : (
        <div key="security">
          <SecurityCenter />
          <details className="security-password">
            <summary>Change your password</summary>
            <form onSubmit={password}>
              <p>
                Choose a strong password. Changing it signs out your other
                sessions.
              </p>
              <label>
                Current password
                <input
                  name="current_password"
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  name="new_password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Authenticator or recovery code (if enabled)
                <input
                  name="code"
                  maxLength={32}
                  autoComplete="one-time-code"
                />
              </label>
              <div className="modal-actions">
                <button className="primary" disabled={busy}>
                  {busy ? "Updating…" : "Change password"}
                </button>
              </div>
            </form>
          </details>
        </div>
      )}
      <div className="account-signout">
        <button className="secondary" disabled={busy} onClick={logout}>
          Sign out
        </button>
      </div>
    </PanelShell>
  );
}

const dateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function AdvancedSearchPanel({
  user,
  folders,
  filters,
  close,
  onSearch,
}) {
  const [draft, setDraft] = useState({ ...emptyFilters, ...filters });
  const change = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  function submit(e) {
    e.preventDefault();
    const result = { ...draft };
    if (draft.date_range !== "custom") {
      result.modified_before = "";
      result.modified_after = "";
      if (draft.date_range !== "any") {
        const date = new Date();
        date.setDate(date.getDate() - Number(draft.date_range));
        result.modified_after = dateString(date);
      }
    }
    onSearch(result);
    close();
  }
  return (
    <PanelShell title="Advanced search" close={close} wide>
      <form onSubmit={submit}>
        <div className="advanced-fields">
          <label>
            Type
            <select
              value={draft.file_type}
              onChange={(e) => change("file_type", e.target.value)}
            >
              {[
                ["any", "Any"],
                ["folders", "Folders"],
                ["documents", "Documents"],
                ["spreadsheets", "Spreadsheets"],
                ["pdfs", "PDFs"],
                ["images", "Images"],
                ["videos", "Videos"],
                ["audio", "Audio"],
                ["archives", "Archives"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Owner
            <select value="me" onChange={() => {}}>
              <option value="me">Me ({user.email})</option>
            </select>
          </label>
          <label>
            Includes the words
            <div>
              <input
                value={draft.content_q}
                onChange={(e) => change("content_q", e.target.value)}
                placeholder="Enter words found in the file"
                maxLength={200}
              />
              <small>
                Search text, CSV, Markdown, JSON, DOCX and XLSX content.
              </small>
            </div>
          </label>
          <label>
            Item name
            <input
              value={draft.item_name}
              onChange={(e) => change("item_name", e.target.value)}
              placeholder="Enter a term that matches part of the file name"
              maxLength={255}
            />
          </label>
          <label>
            Location
            <select
              value={draft.location_id}
              onChange={(e) => change("location_id", e.target.value)}
            >
              <option value="">Anywhere in my drive</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {folderName(f, folders)}
                </option>
              ))}
            </select>
          </label>
          <div className="search-checks">
            <label>
              <input
                type="checkbox"
                checked={draft.in_trash}
                onChange={(e) => change("in_trash", e.target.checked)}
              />
              In trash
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.starred_only}
                onChange={(e) => change("starred_only", e.target.checked)}
              />
              Starred
            </label>
          </div>
          <label>
            Date modified
            <select
              value={draft.date_range}
              onChange={(e) => change("date_range", e.target.value)}
            >
              <option value="any">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="365">Last year</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {draft.date_range === "custom" && (
            <div className="date-range">
              <label>
                From
                <input
                  type="date"
                  value={draft.modified_after}
                  max={draft.modified_before || undefined}
                  onChange={(e) => change("modified_after", e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={draft.modified_before}
                  min={draft.modified_after || undefined}
                  onChange={(e) => change("modified_before", e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
        <div className="advanced-footer">
          <small>Searches files in your account.</small>
          <button
            type="button"
            className="text-button"
            onClick={() => setDraft({ ...emptyFilters })}
          >
            Reset
          </button>
          <button className="primary">Search</button>
        </div>
      </form>
    </PanelShell>
  );
}

function folderName(folder, folders) {
  const names = [folder.name],
    seen = new Set([folder.id]);
  let node = folders.find((f) => f.id === folder.parent_id);
  while (node && !seen.has(node.id)) {
    names.unshift(node.name);
    seen.add(node.id);
    node = folders.find((f) => f.id === node.parent_id);
  }
  return names.join(" / ");
}
const helpTopics = [
  [
    "Upload files and folders",
    "Use New → File upload or Folder upload, or drag files into your workspace. Files are uploaded into the folder you have open. Keep the page open until the upload finishes.",
  ],
  [
    "Find a file",
    "Search by name in the search bar. Use the sliders button for advanced search by type, content, location, stars or date. Use the sort menu and arrow above the file list to change the order.",
  ],
  [
    "Recover a file",
    "Open Trash, choose the item’s actions menu and select Restore. Files remain in trash until you delete them forever. A folder copy includes its nested folders and files.",
  ],
  [
    "Manage your account",
    "Click your profile picture and choose Profile or Security. You can update your name, email, picture or password. Your current password is required for email and password changes.",
  ],
  [
    "Share a file safely",
    "Choose Share from a file’s actions menu to create a download link. Anyone with the link can download it. Revoke a link in the sharing dialog, or move the file to trash to stop access.",
  ],
  [
    "Trouble uploading?",
    "Check your connection, refresh the page and retry one file. Make sure your login is still active. If it still fails, report the file type and approximate size below. Do not include passwords in your report.",
  ],
];
export function SupportPanel({ close }) {
  const [tab, setTab] = useState("help"),
    [reports, setReports] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function loadReports() {
    try {
      const r = await api.get("/support");
      setReports(r.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    let active = true;
    api
      .get("/support")
      .then((r) => {
        if (active) setReports(r.data);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function report(e) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await api.post("/support", {
        category: d.get("category"),
        subject: d.get("subject"),
        description: d.get("description"),
      });
      setNotice(`Report #${r.data.id} saved. You can find it in My reports.`);
      form.reset();
      await loadReports();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PanelShell title="Help & support" close={close} wide>
      <p className="panel-lead">Find an answer or tell us what went wrong.</p>
      <div className="panel-tabs">
        <button
          className={tab === "help" ? "active" : ""}
          onClick={() => setTab("help")}
        >
          <LifeBuoy size={17} />
          Help
        </button>
        <button
          className={tab === "report" ? "active" : ""}
          onClick={() => setTab("report")}
        >
          Report an issue
        </button>
        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          My reports ({reports.length})
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
      {tab === "help" ? (
        <div className="help-topics">
          {helpTopics.map(([title, text]) => (
            <details key={title}>
              <summary>{title}</summary>
              <p>{text}</p>
            </details>
          ))}
        </div>
      ) : tab === "report" ? (
        <form onSubmit={report}>
          <label>
            Category
            <select name="category">
              <option value="upload">Uploading files</option>
              <option value="account">Account / login</option>
              <option value="files">Files and folders</option>
              <option value="sharing">Sharing</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label>
            Subject
            <input
              name="subject"
              required
              maxLength={180}
              placeholder="Briefly describe the problem"
            />
          </label>
          <label>
            What happened?
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={10000}
              rows={5}
              placeholder="What were you trying to do? What happened instead? Include the file type and size if relevant."
            />
          </label>
          <p className="support-note">
            Reports are saved here for the site operator. No email notification
            is sent. Please do not include passwords or private file contents.
          </p>
          <div className="modal-actions">
            <button className="primary" disabled={busy}>
              <Send size={17} />
              {busy ? "Saving…" : "Submit report"}
            </button>
          </div>
        </form>
      ) : (
        <div className="report-list">
          {!reports.length ? (
            <p>No reports yet.</p>
          ) : (
            reports.map((r) => (
              <article key={r.id}>
                <div>
                  <strong>
                    #{r.id} · {r.subject}
                  </strong>
                  <span className="report-status">Saved</span>
                </div>
                <small>
                  {r.category} · {new Date(r.created_at).toLocaleDateString()}
                </small>
                <p>{r.description}</p>
              </article>
            ))
          )}
        </div>
      )}
    </PanelShell>
  );
}
