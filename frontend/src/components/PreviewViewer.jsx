import "./preview.css";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Info,
  File,
  Music,
  Archive,
  Search,
} from "lucide-react";
import api from "../api/axios";

const size = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;
const errorMessage = (e) =>
  e.response?.data?.detail || e.message || "Could not load preview";
function Pdf({ url }) {
  const canvas = useRef(null);
  const [pdf, setPdf] = useState(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1.2),
    [error, setError] = useState("");
  useEffect(() => {
    let task,
      cancelled = false;
    import("pdfjs-dist").then((lib) => {
      if (cancelled) return;
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      task = lib.getDocument({ url });
      task.promise
        .then((doc) => {
          if (!cancelled) setPdf(doc);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    });
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!pdf) return;
    let render,
      cancelled = false;
    pdf
      .getPage(page)
      .then((p) => {
        if (cancelled) return;
        const viewport = p.getViewport({ scale: zoom });
        const el = canvas.current;
        el.width = viewport.width;
        el.height = viewport.height;
        render = p.render({ canvasContext: el.getContext("2d"), viewport });
        return render.promise;
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [pdf, page, zoom]);
  return (
    <>
      <div className="pv-tools">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous PDF page"
        >
          <ChevronLeft />
        </button>
        <label>
          Page{" "}
          <input
            type="number"
            min="1"
            max={pdf?.numPages || 1}
            value={page}
            onChange={(e) =>
              setPage(
                Math.max(
                  1,
                  Math.min(pdf?.numPages || 1, Number(e.target.value) || 1),
                ),
              )
            }
          />{" "}
          of {pdf?.numPages || "…"}
        </label>
        <button
          disabled={!pdf || page === pdf.numPages}
          onClick={() => setPage(page + 1)}
          aria-label="Next PDF page"
        >
          <ChevronRight />
        </button>
        <button
          onClick={() => setZoom(Math.max(0.4, zoom - 0.2))}
          aria-label="Zoom out"
        >
          <ZoomOut />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.2))}
          aria-label="Zoom in"
        >
          <ZoomIn />
        </button>
      </div>
      <div className="pv-pdf">
        {error ? (
          <p className="pv-error">{error}. Download to open in your PDF app.</p>
        ) : (
          <canvas ref={canvas} />
        )}
      </div>
    </>
  );
}
function Content({ info, url, onError }) {
  const [zoom, setZoom] = useState(1),
    [rotation, setRotation] = useState(0),
    [wrap, setWrap] = useState(true),
    [query, setQuery] = useState(""),
    [loop, setLoop] = useState(false),
    [playing, setPlaying] = useState(false);
  const media = useRef(null);
  const controls = (
    <div className="pv-tools">
      <button
        title="Zoom out"
        data-tip="Zoom out"
        aria-label="Zoom out"
        onClick={() => setZoom(Math.max(0.2, zoom - 0.2))}
      >
        <ZoomOut />
      </button>
      <button
        title="Fit image to the window"
        data-tip="Fit image to the window"
        onClick={() => {
          setZoom(1);
          setRotation(0);
        }}
      >
        Fit
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button
        title="Zoom in"
        data-tip="Zoom in"
        aria-label="Zoom in"
        onClick={() => setZoom(Math.min(5, zoom + 0.2))}
      >
        <ZoomIn />
      </button>
      <button
        title="Rotate clockwise"
        data-tip="Rotate clockwise"
        aria-label="Rotate clockwise"
        onClick={() => setRotation(rotation + 90)}
      >
        <RotateCw />
      </button>
    </div>
  );
  if (info.kind === "pdf") return <Pdf url={url} />;
  if (info.kind === "image")
    return (
      <>
        {controls}
        <div className="pv-image">
          <img
            draggable="false"
            src={url}
            alt={info.name}
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            onError={() =>
              onError(
                "This image format cannot be decoded by this browser. Download to open in an image app.",
              )
            }
          />
        </div>
      </>
    );
  if (info.kind === "audio" || info.kind === "video")
    return (
      <div className="pv-media">
        {info.kind === "audio" && (
          <div className="pv-album">
            <Music size={70} />
            <h2>{info.name}</h2>
            <p>Listen without leaving your workspace</p>
          </div>
        )}
        {info.kind === "audio" ? (
          <audio
            ref={media}
            src={url}
            controls
            loop={loop}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            preload="metadata"
            onError={() =>
              onError(
                "This browser cannot decode the audio codec. Download the file to play in another app.",
              )
            }
          />
        ) : (
          <video
            ref={media}
            src={url}
            controls
            loop={loop}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            preload="metadata"
            playsInline
            onError={() =>
              onError(
                "This browser cannot decode the video codec. Download the file to play in another app.",
              )
            }
          />
        )}
        <div className="pv-tools">
          <button
            onClick={() => {
              if (media.current) {
                if (media.current.paused) media.current.play().catch(() => {});
                else media.current.pause();
              }
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              if (media.current)
                media.current.currentTime = Math.max(
                  0,
                  media.current.currentTime - 10,
                );
            }}
          >
            −10 seconds
          </button>
          <button
            onClick={() => {
              if (media.current)
                media.current.currentTime = Math.min(
                  media.current.duration || Infinity,
                  media.current.currentTime + 10,
                );
            }}
          >
            +10 seconds
          </button>
          <label>
            Speed{" "}
            <select
              defaultValue="1"
              onChange={(e) => {
                if (media.current)
                  media.current.playbackRate = Number(e.target.value);
              }}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />{" "}
            Loop
          </label>
          {info.kind === "video" && document.pictureInPictureEnabled && (
            <button
              onClick={() =>
                media.current?.requestPictureInPicture().catch(() => {})
              }
            >
              Picture in picture
            </button>
          )}
        </div>
      </div>
    );
  if (info.kind === "document")
    return (
      <>
        <div className="pv-tools">
          <span>Office reading view · text and tables</span>
          <span>
            Spreadsheets: up to 30 sheets, 1,000 rows and 100 columns per sheet
          </span>
        </div>
        <iframe
          className="pv-document"
          sandbox=""
          src={url}
          title={info.name}
        />
      </>
    );
  const text = info.kind === "text" ? info.text : info.hex;
  const allLines = (text || "").split("\n");
  const lines = allLines.slice(0, 10000);
  return (
    <div className="pv-source">
      <div className="pv-tools">
        <Search size={18} />
        <input
          aria-label="Find in file"
          placeholder="Find in this file"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={wrap}
            onChange={(e) => setWrap(e.target.checked)}
          />{" "}
          Wrap lines
        </label>
        <span>
          {info.kind === "binary"
            ? "Binary inspector · first 4 KB"
            : `${lines.length} lines`}
        </span>
      </div>
      {info.kind === "binary" && (
        <div className="pv-notice">
          This format needs its original app for a full visual preview. You can
          inspect its bytes here and download the original file.
        </div>
      )}
      {(info.truncated || allLines.length > 10000) && (
        <div className="pv-notice">
          Showing a bounded excerpt. Download for the complete contents.
        </div>
      )}
      <div className={"pv-code " + (wrap ? "wrap" : "")}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              query && line.toLowerCase().includes(query.toLowerCase())
                ? "match"
                : ""
            }
          >
            <span>{i + 1}</span>
            <code>{line || " "}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function PreviewViewer({
  item,
  files,
  onClose,
  onNavigate,
  onDownload,
}) {
  const [info, setInfo] = useState(null),
    [error, setError] = useState(""),
    [details, setDetails] = useState(false),
    [entry, setEntry] = useState(null),
    [entryInfo, setEntryInfo] = useState(null),
    [archiveQuery, setArchiveQuery] = useState(""),
    [inspect, setInspect] = useState(false);
  const root = useRef(null);
  const entryRequest = useRef(0);
  const index = files.findIndex((f) => f.id === item.id);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/preview/${item.id}/info`, { signal: controller.signal })
      .then((r) => setInfo(r.data))
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [item.id]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const controls = [
          ...root.current.querySelectorAll(
            "button:not(:disabled), input:not(:disabled), select, a[href]",
          ),
        ].filter((el) => el.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === root.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === root.current)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement;
    root.current?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [onClose]);
  const base = api.defaults.baseURL.startsWith("/")
    ? window.location.origin + api.defaults.baseURL
    : api.defaults.baseURL;
  const url = info
    ? `${base}/preview/${item.id}/content?token=${encodeURIComponent(info.token)}${entry !== null ? `&entry=${entry}` : ""}`
    : "";
  async function selectEntry(e) {
    const request = ++entryRequest.current;
    setError("");
    setEntry(e.index);
    setEntryInfo(null);
    try {
      const r = await api.get(`/preview/${item.id}/entry/${e.index}/info`);
      if (request === entryRequest.current) setEntryInfo(r.data);
    } catch (e) {
      if (request === entryRequest.current) setError(errorMessage(e));
    }
  }
  return (
    <div
      className="pv"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${item.name}`}
      tabIndex={-1}
      ref={root}
    >
      <header className="pv-header">
        <button
          title="Close preview"
          data-tip="Close preview"
          aria-label="Close preview"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="pv-title">
          <File size={22} />
          <div>
            <strong>{item.name}</strong>
            <small>
              {info
                ? `${info.mime} · ${size(info.size)}`
                : "Preparing preview…"}
            </small>
          </div>
        </div>
        <div className="pv-header-actions">
          <button
            title="Previous file"
            data-tip="Previous file"
            aria-label="Previous file"
            disabled={index <= 0}
            onClick={() => onNavigate(files[index - 1])}
          >
            <ChevronLeft />
          </button>
          <button
            title="Next file"
            data-tip="Next file"
            aria-label="Next file"
            disabled={index < 0 || index === files.length - 1}
            onClick={() => onNavigate(files[index + 1])}
          >
            <ChevronRight />
          </button>
          <button
            title="Inspect file bytes"
            data-tip="Inspect file bytes"
            aria-label="Inspect file bytes"
            aria-pressed={inspect}
            onClick={() => setInspect(!inspect)}
          >
            Bytes
          </button>
          <button
            title="File details"
            data-tip="File details"
            aria-label="File details"
            aria-pressed={details}
            onClick={() => setDetails(!details)}
          >
            <Info />
          </button>
          <button
            title="Fullscreen preview"
            data-tip="Fullscreen preview"
            aria-label="Fullscreen preview"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else root.current?.requestFullscreen().catch(() => {});
            }}
          >
            <Maximize />
          </button>
          <button className="pv-download" onClick={() => onDownload(item)}>
            <Download size={18} /> Download
          </button>
        </div>
      </header>
      <div className="pv-workspace">
        <main className="pv-main">
          {error && (
            <div className="pv-error" role="alert">
              {error}
              <button onClick={() => onDownload(item)}>
                Download original
              </button>
            </div>
          )}
          {!info && !error && (
            <div className="pv-loading">Opening your file…</div>
          )}
          {info?.kind === "archive" && !inspect ? (
            <div className="pv-archive">
              <aside>
                <h2>
                  <Archive /> ZIP explorer
                </h2>
                <input
                  aria-label="Search archive"
                  placeholder="Find a file in this ZIP"
                  value={archiveQuery}
                  onChange={(e) => setArchiveQuery(e.target.value)}
                />
                <p>
                  {info.entries?.length || 0} entries · no extraction needed
                </p>
                {info.truncated && <p>Showing the first 5,000 entries</p>}
                {info.entries
                  ?.filter((e) =>
                    e.name.toLowerCase().includes(archiveQuery.toLowerCase()),
                  )
                  .map((e) => (
                    <button
                      key={e.index}
                      className={entry === e.index ? "active" : ""}
                      disabled={e.directory}
                      onClick={() => selectEntry(e)}
                    >
                      <span>
                        {e.directory ? "📁" : "📄"} {e.name}
                      </span>
                      <small>{e.encrypted ? "Encrypted" : size(e.size)}</small>
                    </button>
                  ))}
              </aside>
              <section>
                {entry === null ? (
                  <div className="pv-empty">
                    <Archive size={64} />
                    <h2>Look inside, without unpacking</h2>
                    <p>
                      Select a file to preview images, documents, media or
                      source text.
                    </p>
                  </div>
                ) : entryInfo ? (
                  <>
                    <div className="pv-entry-title">
                      <strong>{entryInfo.name}</strong>
                      <a href={`${url}&download=true`} download>
                        Download this entry
                      </a>
                    </div>
                    <Content
                      key={entry}
                      info={
                        entryInfo.kind === "document" ||
                        entryInfo.kind === "archive"
                          ? { ...entryInfo, kind: "binary" }
                          : entryInfo
                      }
                      url={url}
                      onError={setError}
                    />
                  </>
                ) : (
                  !error && (
                    <div className="pv-loading">Reading archive entry…</div>
                  )
                )}
              </section>
            </div>
          ) : (
            info && (
              <Content
                key={inspect ? "inspector" : "viewer"}
                info={inspect ? { ...info, kind: "binary" } : info}
                url={url}
                onError={setError}
              />
            )
          )}
        </main>
        {details && (
          <aside className="pv-details">
            <h2>File details</h2>
            <dl>
              <dt>Name</dt>
              <dd>{item.name}</dd>
              <dt>Format</dt>
              <dd>{info?.mime}</dd>
              <dt>Size</dt>
              <dd>{size(info?.size || item.size || 0)}</dd>
              <dt>Viewer</dt>
              <dd>{info?.kind}</dd>
            </dl>
            <p>
              Your original file stays intact. Preview links expire
              automatically.
            </p>
          </aside>
        )}
      </div>
      <footer className="pv-footer">
        <span>FILE DRIVE / PREVIEW</span>
        <span>Esc to close · Use arrows above to browse files</span>
      </footer>
    </div>
  );
}
