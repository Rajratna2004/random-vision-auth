import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { getStoredUser } from "@/lib/store";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { logout } = useAuth();
  const user = getStoredUser();

  if (!user) {
    navigate("/auth");
    return null;
  }

  async function handleLogout() {
    await logout();
    navigate("/auth");
  }

  const navItems = [
    { path: "/",        label: "🏠", full: "Home" },
    { path: "/courses", label: "📚", full: "Courses" },
    { path: "/games",   label: "🎮", full: "Games" },
    { path: "/profile", label: "👤", full: "Profile" },
  ];

  return (
    <div className="min-h-screen stars-bg">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#0DA2E7]/15"
           style={{ boxShadow: "0 2px 16px rgba(13,162,231,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-9 h-9 rounded-2xl kid-gradient flex items-center justify-center text-lg shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              🦁
            </div>
            <span className="font-heading text-[#0DA2E7] font-bold text-xl hidden sm:block tracking-wide">
              KidoLearn
            </span>
          </button>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-150 flex items-center gap-1.5 ${
                    active
                      ? "bg-[#0DA2E7] text-white shadow-sm"
                      : "text-gray-500 hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7]"
                  }`}
                >
                  <span className="text-base leading-none">{item.label}</span>
                  <span className="hidden sm:inline">{item.full}</span>
                </button>
              );
            })}
          </div>

          {/* Right side: user + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 bg-[#0DA2E7]/10 px-3 py-1.5 rounded-full border border-[#0DA2E7]/15">
              <div className="w-5 h-5 rounded-full kid-gradient flex items-center justify-center text-xs">
                {user.firstName?.[0]?.toUpperCase() ?? "👤"}
              </div>
              <span className="text-[#0DA2E7] font-bold text-sm">
                {user.firstName}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 transition-all duration-150"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
