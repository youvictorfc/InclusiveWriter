import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import Documents from "@/pages/documents";
import { ProtectedRoute } from "@/lib/protected-route";
import { 
  Sidebar, 
  SidebarContent, 
  //SidebarHeader, // Removed as it's redefined in AppLayout
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import { Home as HomeIcon, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";

function MainNav() {
  const [location] = useLocation();
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/">
          <SidebarMenuButton 
            asChild 
            isActive={location === "/"} 
            tooltip="Home"
          >
            <a className="flex items-center">
              <HomeIcon className="h-4 w-4" />
              <span className={`ml-2 transition-opacity duration-300 ${state === 'collapsed' ? 'opacity-0' : 'opacity-100'}`}>
                Home
              </span>
            </a>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Link href="/documents">
          <SidebarMenuButton 
            asChild 
            isActive={location === "/documents"} 
            tooltip="Documents"
          >
            <a className="flex items-center">
              <FileText className="h-4 w-4" />
              <span className={`ml-2 transition-opacity duration-300 ${state === 'collapsed' ? 'opacity-0' : 'opacity-100'}`}>
                Documents
              </span>
            </a>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Sidebar 
      collapsible="icon" 
      className="group/sidebar transition-all duration-300 ease-in-out hover:w-64"
    >
      <div className="border-b">
        <h2 className={`px-2 text-lg font-semibold tracking-tight transition-opacity duration-300 group-hover/sidebar:opacity-100 group-[.group/sidebar]:data-[state=collapsed]:opacity-0`}>
          NOMW
        </h2>
      </div>
      <SidebarContent>
        <MainNav />
      </SidebarContent>
      <SidebarRail />
      <SidebarInset>
        {children}
      </SidebarInset>
    </Sidebar>
  );
}

function Router() {
  return (
    <SidebarProvider defaultOpen={false}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute 
          path="/" 
          component={() => (
            <AppLayout>
              <Home />
            </AppLayout>
          )} 
        />
        <ProtectedRoute 
          path="/documents" 
          component={() => (
            <AppLayout>
              <Documents />
            </AppLayout>
          )} 
        />
        <Route component={NotFound} />
      </Switch>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;