import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformTopbar } from "./components/PlatformTopbar";
import { ProjectsSidebar } from "./components/ProjectsSidebar";
import { ProjectCanvas } from "./project/ProjectCanvas";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-workspace-bg text-slate-100">
        <PlatformTopbar />
        <div className="flex min-h-0 flex-1">
          <ProjectsSidebar />
          <main className="relative flex min-w-0 flex-1 flex-col">
            <ProjectCanvas />
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
