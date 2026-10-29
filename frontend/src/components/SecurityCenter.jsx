import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  Monitor,
  History,
  Download,
} from "lucide-react";
import QRCode from "qrcode";
import api from "../api/axios";
import "./security.css";

const fail = (e) =>
  typeof e.response?.data?.detail === "string"
    ? e.response.data.detail
    : e.message;
const date = (n) => new Date(n * 1000).toLocaleString();
export default function SecurityCenter() {
  const [data, setData] = useState(null),
    [setup, setSetup] = useState(null),
    [qr, setQr] = useState(""),
    [codes, setCodes] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get("/security")
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active) setError(fail(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function perform(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      const r = await api.get("/security");
      setData(r.data);
    } catch (e) {
      setError(fail(e));
    } finally {
      setBusy(false);
    }
  }
  function proof(form) {
    const f = new FormData(form);
    return { password: f.get("password"), code: f.get("code") || "" };
  }
  async function start(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = proof(form);
    await perform(async () => {
      const r = await api.post("/security/2fa/setup", payload);
      setSetup(r.data);
      setQr(await QRCode.toDataURL(r.data.uri, { width: 200, margin: 2 }));
      form.reset();
    });
  }
  async function enable(e) {
    e.preventDefault();
    const code = new FormData(e.currentTarget).get("code");
    await perform(async () => {
      const r = await api.post("/security/2fa/enable", { code });
      localStorage.setItem("access_token", r.data.access_token);
      setCodes(r.data.recovery_codes);
      setSetup(null);
      setQr("");
      setNotice(
        "Two-step verification is on. Save your recovery codes now. Use the next authenticator code for your next sign-in.",
      );
    });
  }
  async function confirm(e, action) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = proof(form);
    await perform(async () => {
      const r = await api.post(action, payload);
      localStorage.setItem("access_token", r.data.access_token);
      form.reset();
      if (r.data.recovery_codes) setCodes(r.data.recovery_codes);
      setNotice(
        action.includes("disable")
          ? "Two-step verification turned off."
          : action.includes("recovery")
            ? "New recovery codes generated. Your old codes no longer work."
            : "Other sessions have been signed out.",
      );
    });
  }
  function downloadCodes() {
    const blob = new Blob(
      [
        "File Drive recovery codes\nEach code works once. Keep these offline and private.\n\n" +
          codes.join("\n"),
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file-drive-recovery-codes.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const fields = (
    <>
      <label>
        Current password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          maxLength={128}
        />
      </label>
      {data?.two_factor_enabled && (
        <label>
          Authenticator or recovery code
          <input
            name="code"
            required
            autoComplete="one-time-code"
            maxLength={32}
          />
        </label>
      )}
    </>
  );
  return (
    <div className="security-center">
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-message" role="status">
          {notice}
        </div>
      )}
      {!data && !error && <p>Loading account protection…</p>}
      <section className="security-section">
        <div className="security-heading">
          <ShieldCheck />
          <div>
            <h3>Account protection</h3>
            <p>Make your important files harder to access without you.</p>
          </div>
        </div>
        <div className="security-badges">
          <span>Private file access</span>
          <span>Login attempt limits</span>
          <span>{data?.max_upload_mb || 1024} MB upload limit</span>
        </div>
      </section>
      <section className="security-section">
        <div className="security-heading">
          <Smartphone />
          <div>
            <h3>
              Two-step verification{" "}
              <span
                className={
                  data?.two_factor_enabled ? "security-on" : "security-off"
                }
              >
                {data?.two_factor_enabled ? "On" : "Off"}
              </span>
            </h3>
            <p>Use an authenticator app in addition to your password.</p>
          </div>
        </div>
        {codes && (
          <div className="recovery-box">
            <h4>
              <KeyRound size={18} /> Save your recovery codes
            </h4>
            <p>
              Each works once if you lose your authenticator. These codes are
              only shown now. Keep them somewhere private, outside this account.
            </p>
            <div className="recovery-grid">
              {codes.map((c) => (
                <code key={c}>{c}</code>
              ))}
            </div>
            <button type="button" className="secondary" onClick={downloadCodes}>
              <Download size={16} /> Download recovery codes
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setCodes(null)}
            >
              I have saved these codes
            </button>
          </div>
        )}
        {data && !data.two_factor_enabled && !setup && (
          <form onSubmit={start}>
            <label>
              Confirm your current password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            <button className="primary" disabled={busy}>
              Set up authenticator
            </button>
          </form>
        )}
        {setup && (
          <form onSubmit={enable}>
            <div className="authenticator-setup">
              {qr && <img src={qr} alt="Authenticator setup QR code" />}
              <div>
                <h4>1. Add File Drive to your authenticator</h4>
                <p>Scan this QR code, or enter this setup key manually:</p>
                <code>{setup.secret}</code>
                <p>Keep this key private. Setup expires after 10 minutes.</p>
              </div>
            </div>
            <label>
              2. Enter the six-digit code
              <input
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="000000"
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSetup(null);
                  setQr("");
                }}
              >
                Cancel setup
              </button>
              <button className="primary" disabled={busy}>
                Enable two-step verification
              </button>
            </div>
          </form>
        )}
        {data?.two_factor_enabled && (
          <>
            <p>{data.recovery_codes_remaining} unused recovery codes remain.</p>
            <details>
              <summary>Generate new recovery codes</summary>
              <form onSubmit={(e) => confirm(e, "/security/2fa/recovery")}>
                {fields}
                <p>
                  This invalidates every old recovery code and signs out other
                  sessions.
                </p>
                <button className="secondary" disabled={busy}>
                  Generate new codes
                </button>
              </form>
            </details>
            <details>
              <summary>Turn off two-step verification</summary>
              <form onSubmit={(e) => confirm(e, "/security/2fa/disable")}>
                {fields}
                <button className="secondary" disabled={busy}>
                  Turn off two-step verification
                </button>
              </form>
            </details>
          </>
        )}
      </section>
      <section className="security-section">
        <div className="security-heading">
          <Monitor />
          <div>
            <h3>Signed-in sessions</h3>
            <p>Remove a session you no longer recognize or use.</p>
          </div>
        </div>
        {data && !data.current_session_tracked && (
          <div className="pv-notice">
            <p>
              This session was created before session tracking. Register it to
              manage it here.
            </p>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  const r = await api.post("/security/session");
                  if (r.data.access_token)
                    localStorage.setItem("access_token", r.data.access_token);
                })
              }
            >
              Track this session
            </button>
          </div>
        )}
        {data?.sessions.map((s) => (
          <div className="session-row" key={s.id}>
            <Monitor size={20} />
            <div>
              <strong>{s.current ? "This session" : "Browser session"}</strong>
              <p>{s.device}</p>
              <small>
                Signed in {date(s.created_at)} · expires {date(s.expires_at)}
              </small>
            </div>
            {!s.current && (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    await api.delete(`/security/sessions/${s.id}`);
                    setNotice("Session signed out.");
                  })
                }
              >
                Sign out
              </button>
            )}
          </div>
        ))}
        <details>
          <summary>Sign out all other sessions</summary>
          <form
            onSubmit={(e) => confirm(e, "/security/sessions/revoke-others")}
          >
            {fields}
            <p>
              This also expires older preview links and sessions created before
              session tracking.
            </p>
            <button className="secondary" disabled={busy}>
              Sign out other sessions
            </button>
          </form>
        </details>
      </section>
      <section className="security-section">
        <div className="security-heading">
          <History />
          <div>
            <h3>Recent security activity</h3>
            <p>Account activity recorded by this server.</p>
          </div>
        </div>
        {data?.events.length === 0 && <p>No events recorded yet.</p>}
        {data?.events.map((e) => (
          <div className="security-event" key={e.id}>
            <strong>{e.event}</strong>
            <time>{date(e.created_at)}</time>
            <small>{e.device}</small>
          </div>
        ))}
      </section>
      <p className="security-footnote">
        Files are private by default. A public sharing link lets anyone with the
        link download its file until you revoke it. This local server does not
        provide end-to-end file encryption or malware scanning.
      </p>
    </div>
  );
}
