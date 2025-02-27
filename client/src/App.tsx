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
  SidebarHeader,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Home as HomeIcon, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";

function MainNav() {
  const [location] = useLocation();

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
    </SidebarMenu>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultCollapsed={true}>
      <div className="flex h-screen">
        <div className="group">
          <Sidebar className="transition-all duration-300 group-hover:w-64 w-16">
            <SidebarHeader className="border-b flex items-center px-2 py-2">
              <h2 className="text-lg font-semibold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300">NOMW</h2>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
          </Sidebar>
        </div>
        <SidebarInset className="flex-1 overflow-auto">
          {children}
        </SidebarInset>
      </div>
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
        path="/documents/:id" 
        component={() => (
          <Layout>
            <Home />
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