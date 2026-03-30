import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
    { path: "/", label: "🏠 Home" },
    { path: "/courses", label: "📚 Courses" },
    { path: "/profile", label: "👤 Profile" },
  ];

  return (
    <div className="min-h-screen stars-bg">
      <nav className="kid-gradient shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <span className="text-2xl">🦁</span>
            <span className="text-white font-extrabold text-xl">KidoLearn</span>
          </button>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                size="sm"
                variant={location === item.path ? "secondary" : "ghost"}
                className={location !== item.path ? "text-white hover:text-white hover:bg-white/20" : ""}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            ))}
            <div className="w-px h-6 bg-white/30 mx-1" />
            <span className="text-white text-sm font-medium hidden sm:block">
              Hi, {user.firstName}! 👋
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/20"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
