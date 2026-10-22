import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";
import api from "../configs/api";


const isFolderItem = (item) => item?.item_type === "folder" || (!item?.meme_type && item?.path !== undefined);

export function useDrive() {
  const {
    fetchDriveContent,
    refreshUser,
    currentFolderId,
    isUploading,
    setIsUploading,
    uploadProgress,
    setUploadProgress,
  } = useAppContext();

  // ! Reuseable API action runner with stndrd toast & callback
  const runAction = async (apiCall, successMsg, errorMsg, afterSuccess) => {
    try {
      const res = await apiCall;
      if (successMsg) toast.success(successMsg);
      if (afterSuccess) await afterSuccess(res?.data);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || errorMsg);
      return false;
    }
  };

  // ! File upload with progress tracking
  const uploadFiles = async (fileList, folder_id = currentFolderId) => {
    if (!fileList?.length) return;
    setIsUploading(true);
    setUploadProgress(0);

    const totalSize = Array.from(fileList).reduce(
      (acc, file) => acc + file.size,
      0,
    );
    const steps = 92 / Math.max(12, totalSize / 409715.2);
    const interval = setInterval(() => {
      setUploadProgress((p) => (p >= 92 ? p : Math.min(92, p + steps)));
    }, 100);

    const formData = new FormData();
    Array.from(fileList).forEach((file) => {
      formData.append("files", file);
    });
    if (folder_id) {
      formData.append("folder_id", folder_id);
    }


    try {
    const { data } = await api.post("/api/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      clearInterval(interval);
      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success(`Uploaded ${data?.files?.length || 0} file(s) successfully!`);
      await fetchDriveContent(folder_id);
      await refreshUser();
    } catch (error) {
        clearInterval(interval);
      toast.error("Failed to upload files.");
    }finally {
        clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ! Create folder
  const createFolder = async (name, parent_id = currentFolderId) => {
    runAction(
      api.post("/api/folders", { name, parent_id }),
      "Folder created.",
      "Failed to create a folder.",
      () => fetchDriveContent(parent_id),
    );
  }

  // ! Polymorphic operations (accepts file or folder item / id)
  const renameItem = async (item, newName) => {
    const isFolder = isFolderItem(item);
    const endpoint = isFolder ? "folders" : "files";
    const id = item?.id || item;

    return runAction(
      api.put(`/api/${endpoint}/${id}/rename`, { name: newName }),
      `${isFolder ? "Folder" : "File"} renamed.`,
      `Failed to rename ${isFolder ? "folder" : "file"}.`,
      () => fetchDriveContent(),
    );
  }

  const moveItem = async (item, targetFolderId) => {
    const isFolder = isFolderItem(item);
    const endPoint = isFolder ? "folders" : "files";
    const payload = isFolder ? { target_parent: targetFolderId } : { target_folder: targetFolderId };
    const id = item?.id || item;
    return runAction(
      api.put(`/api/${endPoint}/${id}/move`, payload),
      `${isFolder ? "Folder" : "File"} moved.`,
      `Failed to move ${isFolder ? "folder" : "file"}.`,
      () => fetchDriveContent(),
    );
  }

  const deleteItem = async (item) => {
    const isFolder = isFolderItem(item);
    const endPoint = isFolder ? "folders" : "files";
    const id = item?.id || item;
    return runAction(
      api.delete(`/api/${endPoint}/${id}`),
      `${isFolder ? "Folder" : "File"} moved to Trash.`,
      `Failed to move ${isFolder ? "folder" : "file"} to Trash.`,
      () => fetchDriveContent(),
    );
  }

  const restoreItem = async (item) => {
    const endPoint = isFolderItem(item) ? "folders" : "files";
    const id = item?.id || item;
    return runAction(
      api.put(`/api/${endPoint}/${id}/restore`),
      'Item Restored successfully.',
        'Failed to restore item.',
    );
  }

  const permanentlyDeleteItem = async (item) => {
    const endPoint = isFolderItem(item) ? "folders" : "files";
    const id = item?.id || item;
    return runAction(
      api.delete(`/api/${endPoint}/${id}/permanent`),
      'Item permanently deleted.',
        'Failed to permanently delete item.',
      () => refreshUser(),
    );
  }

    return {
        uploadFiles,
        createFolder,
        renameItem,
        moveItem,
        deleteItem,
        restoreItem,
        permanentlyDeleteItem,
        isUploading,
        uploadProgress
    };
}