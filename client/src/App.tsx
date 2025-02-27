import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import Documents from "@/pages/documents";
import Settings from "@/pages/settings";
import { ProtectedRoute } from "@/lib/protected-route";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarRail
} from "@/components/ui/sidebar";
import { Home as HomeIcon, FileText, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";

function MainNav() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  return (
    <SidebarMenu className="flex flex-col h-full">
      <div className="flex-grow">
        <SidebarMenuItem>
          <Link href="/">
            <SidebarMenuButton 
              asChild 
              isActive={location === "/"} 
              tooltip="Home"
            >
              <a className="flex items-center">
                <HomeIcon className="mr-2" />
                <span>Home</span>
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
                <FileText className="mr-2" />
                <span>Documents</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <Link href="/settings">
            <SidebarMenuButton 
              asChild 
              isActive={location === "/settings"} 
              tooltip="Settings"
            >
              <a className="flex items-center">
                <SettingsIcon className="mr-2" />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </div>
      <div className="mt-auto border-t pt-2">
        <SidebarMenuItem>
          <SidebarMenuButton 
            asChild 
            tooltip="Logout"
            onClick={() => logoutMutation.mutate()}
          >
            <button className="flex items-center w-full text-left">
              <LogOut className="mr-2" />
              <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </div>
    </SidebarMenu>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar 
        collapsible="icon" 
        className="group/sidebar transition-all duration-300 ease-in-out hover:w-64"
      >
        <SidebarHeader className="border-b">
          <h2 className="px-2 text-lg font-semibold tracking-tight transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0 group-hover/sidebar:opacity-100">NOMW</h2>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/" 
        component={() => (
          <Layout>
            <Home />
          </Layout>
        )} 
      />
      <ProtectedRoute 
        path="/documents" 
        component={() => (
          <Layout>
            <Documents />
          </Layout>
        )} 
      />
      <ProtectedRoute 
        path="/settings" 
        component={() => (
          <Layout>
            <Settings />
          </Layout>
        )} 
      />
      <Route component={NotFound} />
    </Switch>
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