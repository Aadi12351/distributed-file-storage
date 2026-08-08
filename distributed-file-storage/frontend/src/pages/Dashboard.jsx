import {
  FileText,
  Folder,
  HardDrive,
  Clock3,
  MoreHorizontal,
  FileSpreadsheet,
  FileImage,
  FileArchive,
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Heading */}
      <section>
        <p className="mb-2 text-sm font-medium text-slate-400">
          Welcome back
        </p>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Your Drive
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage your files, folders and shared documents.
            </p>
          </div>

          <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Upload File
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          icon={<FileText size={21} />}
          title="Total Files"
          value="24"
          description="Files stored"
        />

        <StatCard
          icon={<Folder size={21} />}
          title="Folders"
          value="8"
          description="Organized folders"
        />

        <StatCard
          icon={<HardDrive size={21} />}
          title="Storage Used"
          value="3.2 GB"
          description="of 10 GB available"
        />
      </section>

      {/* Recent files */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Recent Files
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Your recently modified files
            </p>
          </div>

          <button className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            View all
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <FileRow
            icon={<FileText size={21} />}
            name="Project Documentation.pdf"
            type="PDF"
            size="2.4 MB"
            date="Today, 6:42 PM"
          />

          <FileRow
            icon={<FileSpreadsheet size={21} />}
            name="Financial Report.xlsx"
            type="Excel"
            size="581 KB"
            date="Today, 4:18 PM"
          />

          <FileRow
            icon={<FileImage size={21} />}
            name="Architecture Diagram.png"
            type="Image"
            size="1.8 MB"
            date="Yesterday"
          />

          <FileRow
            icon={<FileArchive size={21} />}
            name="Project Backup.zip"
            type="ZIP"
            size="84 MB"
            date="Yesterday"
          />
        </div>
      </section>

      {/* Activity */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Clock3 size={19} className="text-slate-500" />

          <h3 className="text-lg font-bold text-slate-900">
            Recent Activity
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Activity
            text="Financial Report.xlsx was uploaded"
            time="2 hours ago"
          />

          <Activity
            text="Project Documentation.pdf was renamed"
            time="4 hours ago"
          />

          <Activity
            text="Architecture Diagram.png was moved to Projects"
            time="Yesterday"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, title, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>

      <p className="text-sm font-medium text-slate-400">{title}</p>

      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>

        <span className="mb-1 text-xs text-slate-400">
          {description}
        </span>
      </div>
    </div>
  );
}

function FileRow({ icon, name, type, size, date }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 hover:bg-slate-50">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {name}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {type} · {size}
        </p>
      </div>

      <span className="hidden text-xs text-slate-400 md:block">
        {date}
      </span>

      <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <MoreHorizontal size={19} />
      </button>
    </div>
  );
}

function Activity({ text, time }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-sm text-slate-600">{text}</p>
      <span className="text-xs text-slate-400">{time}</span>
    </div>
  );
}