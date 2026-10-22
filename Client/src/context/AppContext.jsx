import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";
import api from "../configs/api";

const AppContext = createContext();

const ROOT_BREADCRUMB = [{ id: null, name: "My Drive" }];

const getErrMsg = (err, fallback) => err.response?.data?.error || fallback;

export const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // !Upload global states
  const [isUploading, setIsuploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ! Drive view state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState(ROOT_BREADCRUMB);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  // ! Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  // ! Refresh user profile & storage stats

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  // ! check auth status
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const authAction = async (requestFn, successMsg, errorFallback) => {
    try {
      const { data } = await requestFn();
      setUser(data.user);
      if (successMsg) toast.success(successMsg);
      return true;
    } catch (error) {
      toast.error(getErrMsg(error, errorFallback));
    }
  };

  const login = (email, password) => {
    return authAction(
      () =>
        api.post("/api/auth/login", {
          email,
          password,
        }),
      "Welcome back!",
      "Login failed!",
    );
  };

  const register = (name, email, password) => {
    return authAction(
      () =>
        api.post("/api/auth/register", {
          name,
          email,
          password,
        }),
      "Account created successfully!",
      "Registration Failed!",
    );
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
      setUser(null);
      toast.success("Logged Out");
    } catch (error) {
      toast.error("Logout Error");
    }
  };

  const fetchDriveContent = useCallback(async (folderId = currentFolderId, search = searchQuery, sort = sortBy) => {
    if (!user) return;
    setIsDriveLoading(true);
    try {
      const parentParam = folderId || "null";
      const [folderRes, filesRes, detailRes] = await Promise.all([
        api.get("/api/folders", { params: { parent_id: parentParam } }),
        api.get("/api/files", {
          params: { folder_id: parentParam, search, sort },
        }),
        folderId ? api.get(`/api/folders/${folderId}`) : null,
      ]);
      setFolders(folderRes.data.folders);
      setFiles(filesRes.data.files);
      setBreadcrumbs(detailRes?.data?.breadcrumbs || ROOT_BREADCRUMB);
    } catch (error) {
      toast.error("Failed to fetch drive data");
    } finally {
      setIsDriveLoading(false);
    }
  }, [user, currentFolderId, searchQuery, sortBy]);

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isUploading,
    setIsuploading,
    uploadProgress,
    setUploadProgress,
    currentFolderId,
    setCurrentFolderId,
    breadcrumbs,
    setBreadcrumbs,
    folders,
    setFolders,
    files,
    setFiles,
    isDriveLoading,
    fetchDriveContent,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
