"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { TaskSlideOver } from "@/components/tasks/TaskSlideOver";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { QuickNoteDrawer } from "@/components/notes/QuickNoteDrawer";
import { EditProfileModal } from "@/components/modals/EditProfileModal";

// Views
import { MainDashboard } from "@/components/dashboard/MainDashboard";
import { MyTasksView } from "@/components/tasks/MyTasksView";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";
import { CalendarView } from "@/components/calendar/CalendarView";
import { NotesView } from "@/components/notes/NotesView";
import { AnnouncementsView } from "@/components/announcements/AnnouncementsView";
import { TeamView } from "@/components/team/TeamView";
import { ActivityView } from "@/components/activity/ActivityView";
import { WorkloadView } from "@/components/team/WorkloadView";
import { WorkspaceSettingsView } from "@/components/settings/WorkspaceSettingsView";
import { ClientsFilesView } from "@/components/files/ClientsFilesView";

export default function Home() {
  const router = useRouter();
  const { activeView, isAuthenticated } = useStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background text-muted-foreground text-xs">
        Redirecting to sign in...
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case "dashboard":
        return <MainDashboard />;
      case "my_tasks":
        return <MyTasksView />;
      case "projects":
        return <ProjectsList />;
      case "project_detail":
        return <ProjectDetailView />;
      case "calendar":
        return <CalendarView />;
      case "notes":
        return <NotesView />;
      case "announcements":
        return <AnnouncementsView />;
      case "team":
        return <TeamView />;
      case "activity":
        return <ActivityView />;
      case "workload":
        return <WorkloadView />;
      case "clients":
        return <ClientsFilesView />;
      case "settings":
        return <WorkspaceSettingsView />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky Top Navbar */}
        <Navbar />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-hidden p-4 md:p-6 bg-background/50">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette />
      <TaskSlideOver />
      <CreateTaskModal />
      <CreateProjectModal />
      <QuickNoteDrawer />
      <EditProfileModal />
    </div>
  );
}
