import { useNavigate, useParams } from "react-router-dom";
import FileGrid from "../components/files/FileGrid";
import BreadCrumbs from "../components/layout/BreadCrumbs";
import { useAppContext } from "../context/AppContext";
import { useDrive } from "../hooks/useDrive";
import { useEffect, useState } from "react";

const Drive = () => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const { fetchDriveContent, setCurrentFolderId } = useAppContext();
  const { deleteItem: removeDriveItem } = useDrive();

  // ! Active item modals
  const [previewFile, setPreviewFile] = useState(null);
  const [shareItem, setShareitem] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [moveItem, setMoveItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    const id = folderId || null;
    setCurrentFolderId(id);
    fetchDriveContent(id);
  }, [folderId, fetchDriveContent, setCurrentFolderId]);

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <BreadCrumbs />
      {/* folder & files */}
      <FileGrid
        onFolderClick={(folder) => navigate(`/drive/${folder.id}`)}
        onPreviewFile={setPreviewFile}
        onShareItem={setShareitem}
        onRenameItem={setRenameItem}
        onMoveItem={setMoveItem}
        onDeleteItem={setDeleteItem}
      />
    </div>
  );
};

export default Drive;
