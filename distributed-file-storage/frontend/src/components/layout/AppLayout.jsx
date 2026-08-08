import {
  HardDrive,
  Home,
  Folder,
  Users,
  Trash2,
  Settings,
  Plus,
  Search,
  Bell,
  ChevronDown,
  Cloud,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();

  // Get user's first letter for avatar
  const avatarLetter =
    user?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <HardDrive size={23} />
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900">
              FileVault
            </h1>

            <p className="text-xs text-slate-400">
              Secure Storage
            </p>
          </div>
        </div>

        {/* New button */}
        <div className="px-5 pt-6">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={18} />
            New
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1 px-3">
          <NavItem
            icon={<Home size={19} />}
            label="Dashboard"
            active
          />

          <NavItem
            icon={<Folder size={19} />}
            label="My Drive"
          />

          <NavItem
            icon={<Users size={19} />}
            label="Shared with me"
          />

          <NavItem
            icon={<Trash2 size={19} />}
            label="Trash"
          />

          <div className="my-5 border-t border-slate-100" />

          <NavItem
            icon={<Settings size={19} />}
            label="Settings"
          />
        </nav>

        {/* Storage */}
        <div className="m-4 rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Cloud
              size={17}
              className="text-slate-600"
            />

            <span className="text-sm font-semibold text-slate-700">
              Storage
            </span>
          </div>

          <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[32%] rounded-full bg-slate-900" />
          </div>

          <p className="text-xs text-slate-500">
            3.2 GB of 10 GB used
          </p>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="ml-64 flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
          {/* Search */}
          <div className="relative w-full max-w-xl">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search files and folders..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* User */}
          <div className="ml-6 flex items-center gap-4">
            {/* Notifications */}
            <button
              type="button"
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"
            >
              <Bell size={20} />
            </button>

            {/* User section */}
            <div className="relative flex items-center gap-3 border-l border-slate-200 pl-5">
              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {avatarLetter}
              </div>

              {/* User information */}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  {user?.full_name || "User"}
                </p>

                <p className="text-xs text-slate-400">
                  {user?.email || "Personal account"}
                </p>
              </div>

              {/* Dropdown */}
              <button
                type="button"
                className="rounded-lg p-1 transition hover:bg-slate-100"
              >
                <ChevronDown
                  size={17}
                  className="text-slate-400"
                />
              </button>

              {/* Temporary logout button */}
              <button
                type="button"
                onClick={logout}
                className="ml-2 hidden rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 md:block"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   NAVIGATION ITEM
============================================================ */

function NavItem({
  icon,
  label,
  active = false,
}) {
  return (
    <button
      type="button"
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}