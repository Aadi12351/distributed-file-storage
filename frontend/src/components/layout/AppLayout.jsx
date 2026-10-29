import {
  HardDrive,
  Home,
  Folder,
  FolderOpen,
  Monitor,
  Users,
  Clock3,
  Star,
  ShieldAlert,
  Trash2,
  Settings,
  Plus,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Cloud,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();

  const userName = user?.full_name || "Aaditya Masane";
  const userEmail = user?.email || "aadityamasane@gmail.com";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-slate-200 bg-white">

        {/* -------------------------------------------------
            LOGO
        ------------------------------------------------- */}

        <div className="flex h-[88px] items-center border-b border-slate-100 px-7">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <HardDrive size={23} strokeWidth={2} />
            </div>

            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">
                FileVault
              </h1>

              <p className="mt-0.5 text-xs text-slate-400">
                Secure Storage
              </p>
            </div>

          </div>

        </div>


        {/* -------------------------------------------------
            NEW BUTTON
        ------------------------------------------------- */}

        <div className="px-4 pt-6">

          <button
            type="button"
            className="
              flex
              h-14
              w-full
              items-center
              justify-center
              gap-3
              rounded-xl
              bg-slate-900
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-slate-800
              active:scale-[0.99]
            "
          >
            <Plus size={21} strokeWidth={2} />

            <span>New</span>
          </button>

        </div>


        {/* -------------------------------------------------
            NAVIGATION
        ------------------------------------------------- */}

        <nav className="mt-5 px-4">

          {/* Home */}

          <DriveNavItem
            to="/"
            icon={<Home size={20} />}
            label="Home"
          />


          {/* Projects */}

          <DriveNavItem
            to="/projects"
            icon={<Folder size={20} />}
            label="Projects"
          />


          {/* My Drive */}

          <DriveNavItem
            to="/files"
            icon={<FolderOpen size={20} />}
            label="My Drive"
            arrow
          />


          {/* Computers */}

          <DriveNavItem
            to="/computers"
            icon={<Monitor size={20} />}
            label="Computers"
            arrow
          />


          {/* Divider */}

          <div className="my-4 border-t border-slate-100" />


          {/* Shared */}

          <DriveNavItem
            to="/shared"
            icon={<Users size={20} />}
            label="Shared with me"
          />


          {/* Recent */}

          <DriveNavItem
            to="/recent"
            icon={<Clock3 size={20} />}
            label="Recent"
          />


          {/* Starred */}

          <DriveNavItem
            to="/starred"
            icon={<Star size={20} />}
            label="Starred"
          />


          {/* Spam */}

          <DriveNavItem
            to="/spam"
            icon={<ShieldAlert size={20} />}
            label="Spam"
          />


          {/* Trash */}

          <DriveNavItem
            to="/trash"
            icon={<Trash2 size={20} />}
            label="Trash"
          />


          {/* Divider */}

          <div className="my-4 border-t border-slate-100" />


          {/* Settings */}

          <DriveNavItem
            to="/settings"
            icon={<Settings size={20} />}
            label="Settings"
          />

        </nav>


        {/* -------------------------------------------------
            STORAGE
        ------------------------------------------------- */}

        <div className="mt-auto p-4">

          <div className="rounded-2xl bg-slate-50 px-4 py-4">

            <div className="mb-3 flex items-center gap-2">

              <Cloud
                size={19}
                className="text-slate-600"
              />

              <span className="text-sm font-semibold text-slate-700">
                Storage
              </span>

            </div>


            {/* Progress bar */}

            <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: "32%" }}
              />

            </div>


            <p className="text-xs text-slate-500">
              3.2 GB of 10 GB used
            </p>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="ml-[292px] min-h-screen">

        {/* -------------------------------------------------
            HEADER
        ------------------------------------------------- */}

        <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between border-b border-slate-200 bg-white px-9">

          {/* ONLY SEARCH BAR */}

          <div className="relative w-full max-w-[680px]">

            <Search
              size={21}
              strokeWidth={2}
              className="
                absolute
                left-5
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="text"
              placeholder="Search in FileVault"
              className="
                h-14
                w-full
                rounded-full
                border
                border-slate-200
                bg-slate-50
                pl-14
                pr-5
                text-sm
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-400
                hover:bg-white
                focus:border-slate-300
                focus:bg-white
                focus:ring-2
                focus:ring-slate-100
              "
            />

          </div>


          {/* USER AREA */}

          <div className="ml-8 flex items-center gap-5">

            {/* Notification */}

            <button
              type="button"
              title="Notifications"
              className="
                rounded-full
                p-2.5
                text-slate-500
                transition
                hover:bg-slate-100
                hover:text-slate-900
              "
            >
              <Bell size={20} />
            </button>


            {/* Divider */}

            <div className="h-9 border-l border-slate-200" />


            {/* Avatar */}

            <div className="flex items-center gap-3">

              <div className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-slate-900
                text-sm
                font-bold
                text-white
              ">
                {userName.charAt(0).toUpperCase()}
              </div>


              <div className="hidden lg:block">

                <p className="text-sm font-semibold text-slate-800">
                  {userName}
                </p>

                <p className="text-xs text-slate-400">
                  {userEmail}
                </p>

              </div>


              <ChevronDown
                size={17}
                className="text-slate-400"
              />

            </div>


            {/* Logout */}

            <button
              type="button"
              onClick={logout}
              className="
                text-sm
                font-medium
                text-slate-500
                transition
                hover:text-slate-900
              "
            >
              Logout
            </button>

          </div>

        </header>


        {/* -------------------------------------------------
            PAGE
        ------------------------------------------------- */}

        <div className="p-8">
          {children}
        </div>

      </main>

    </div>
  );
}


/* ==========================================================
   GOOGLE DRIVE STYLE NAV ITEM
========================================================== */

function DriveNavItem({
  to,
  icon,
  label,
  arrow = false,
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        group
        mb-1
        flex
        h-12
        w-full
        items-center
        rounded-xl
        px-3
        text-sm
        font-medium
        transition-all
        duration-150

        ${
          isActive
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }
      `}
    >

      {/* Icon */}

      <span className="flex w-9 shrink-0 items-center justify-center">
        {icon}
      </span>


      {/* Label */}

      <span className="ml-1 flex-1">
        {label}
      </span>


      {/* Arrow */}

      {arrow && (
        <ChevronRight
          size={16}
          className="
            mr-1
            text-slate-300
            transition
            group-hover:text-slate-500
          "
        />
      )}

    </NavLink>
  );
}