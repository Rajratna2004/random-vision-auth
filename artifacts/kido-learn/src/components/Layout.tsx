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
    { path: "/", label: "🏠", full: "Home" },
    { path: "/courses", label: "📚", full: "Courses" },
    { path: "/games", label: "🎮", full: "Games" },
    { path: "/profile", label: "👤", full: "Profile" },
  ];

  return (
    <div className="min-h-screen stars-bg">
      <nav className="kid-gradient shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🦁</span>
            <span className="text-white font-extrabold text-xl hidden sm:block">KidoLearn</span>
          </button>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  location === item.path
                    ? "bg-white text-purple-700 shadow"
                    : "text-white hover:bg-white/20"
                }`}
              >
                <span>{item.label}</span>
                <span className="hidden sm:inline">{item.full}</span>
              </button>
            ))}

            <div className="w-px h-6 bg-white/30 mx-1" />

            <span className="text-white text-sm font-medium hidden md:block mr-1">
              Hi, {user.firstName}! 👋
            </span>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:bg-white/20 transition-all"
            >
              Logout
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
