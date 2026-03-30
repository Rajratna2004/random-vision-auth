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
      <nav className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-[#0DA2E7]/20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-2xl kid-gradient flex items-center justify-center text-lg shadow-md">
              🦁
            </div>
            <span className="font-heading text-[#0DA2E7] font-bold text-xl hidden sm:block tracking-wide">
              KidoLearn
            </span>
          </button>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                  location === item.path
                    ? "bg-[#0DA2E7] text-white shadow-md scale-105"
                    : "text-gray-500 hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7]"
                }`}
              >
                <span className="text-base">{item.label}</span>
                <span className="hidden sm:inline">{item.full}</span>
              </button>
            ))}

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <div className="hidden md:flex items-center gap-2 mr-1 bg-[#0DA2E7]/10 px-3 py-1.5 rounded-full">
              <span className="text-[#0DA2E7] font-bold text-sm">
                {user.firstName} 👋
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-2xl text-sm font-bold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
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
