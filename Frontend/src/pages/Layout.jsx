import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loadTheme } from "../features/themeSlice";
import { Loader2Icon } from "lucide-react";
import {
  useUser,
  SignIn,
  useAuth,
  CreateOrganization,
} from "@clerk/clerk-react";

import { fetchWorkspaces } from "../features/workspaceSlice.js";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { loading, workspaces } = useSelector(
    (state) => state.workspace
  );

  const dispatch = useDispatch();

  const { user, isLoaded } = useUser();

  const { getToken } = useAuth();

  // Load theme once
  useEffect(() => {
    dispatch(loadTheme());
  }, [dispatch]);

  // Load workspaces once after auth is ready
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    dispatch(fetchWorkspaces({ getToken }));

  }, [isLoaded, user?.id, dispatch]);

  // Clerk still loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <Loader2Icon className="size-7 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-zinc-950">
        <SignIn />
      </div>
    );
  }

  // Loading workspace data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <Loader2Icon className="size-7 text-blue-500 animate-spin" />
      </div>
    );
  }

  // No workspace/org exists
  if (user && workspaces.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white dark:bg-zinc-950">
        <CreateOrganization />
      </div>
    );
  }

  return (
    <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-screen">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;