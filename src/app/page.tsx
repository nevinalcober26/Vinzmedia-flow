"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { TaskSlideOver } from "@/components/tasks/TaskSlideOver";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { QuickNoteDrawer } from "@/components/notes/QuickNoteDrawer";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";

// Skeleton Components
import {
  WorkspaceSkeleton,
  DashboardSkeleton,
  ProjectsSkeleton,
  BoardSkeleton,
  TeamSkeleton,
  ClientsFilesSkeleton,
  NotesSkeleton,
} from "@/components/common/Skeleton";

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
import { BillingView } from "@/components/billing/BillingView";
import { TimeLogsView } from "@/components/timelogs/TimeLogsView";

export default function Home() {
  const router = useRouter();
  const { activeView, isAuthenticated, isViewLoading, isInitialized } = useStore();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isInitialized, router]);

  if (!isAuthenticated || !isInitialized) {
    return <WorkspaceSkeleton />;
  }

  const renderSkeletonView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardSkeleton />;
      case "projects":
      case "project_detail":
        return <ProjectsSkeleton />;
      case "my_tasks":
      case "calendar":
      case "timelogs":
        return <BoardSkeleton />;
      case "team":
      case "workload":
        return <TeamSkeleton />;
      case "clients":
      case "billing":
        return <ClientsFilesSkeleton />;
      case "notes":
      case "announcements":
      case "activity":
      case "settings":
        return <NotesSkeleton />;
      default:
        return <DashboardSkeleton />;
    }
  };

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
      case "billing":
        return <BillingView />;
      case "timelogs":
        return <TimeLogsView />;
      case "settings":
        return <WorkspaceSettingsView />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <div className="app-shell flex h-dvh w-full overflow-hidden bg-background">
      <a href="#workspace-content" className="skip-link">Skip to workspace</a>
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky Top Navbar */}
        <Navbar />

        {/* Dynamic Viewport */}
        <main id="workspace-content" tabIndex={-1} className="workspace-content min-w-0 flex-1 overflow-hidden p-4 md:p-7 lg:p-8">
          <AnimatePresence mode="wait">
            {isViewLoading ? (
              <motion.div
                key="skeleton-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                {renderSkeletonView()}
              </motion.div>
            ) : (
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="h-full w-full"
              >
                {renderActiveView()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CommandPalette />
      <TaskSlideOver />
      <CreateTaskModal />
      <CreateProjectModal />
      <QuickNoteDrawer />
      <EditProfileModal />
      <FloatingActionButton />
    </div>
  );
}
