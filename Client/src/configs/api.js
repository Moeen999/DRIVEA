import axios from "axios";
import { dummyUser, dummyFolders, dummyFiles, dummyShareLinks } from "../assets/assets";

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || "",
    withCredentials: true,
});

// Re-export dummy items for convenience
export { dummyUser, dummyFolders, dummyFiles, dummyShareLinks };

// Sample preview links for media files
const getSamplePreviewUrl = (file) => {
    const mime = file?.mime_type || "";
    if (mime.startsWith("image/")) {
        return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
    }
    if (mime.startsWith("video/")) {
        return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }
    if (mime.startsWith("audio/")) {
        return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }
    return "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
};

// In-memory state initialized from assets.jsx (resets automatically on page reload)
let currentUser = { ...dummyUser };
let currentFolders = dummyFolders.map((f) => ({ ...f, path: [...(f.path || [])] }));
let currentFiles = dummyFiles.map((f) => ({ ...f }));
let currentShares = dummyShareLinks.map((s) => ({ ...s }));

const getUser = () => currentUser;
const saveUser = (user) => {
    currentUser = user ? { ...user } : null;
};

const getFolders = () => currentFolders;
const saveFolders = (folders) => {
    currentFolders = folders;
};

const getFiles = () => currentFiles;
const saveFiles = (files) => {
    currentFiles = files;
};

const getShares = () => currentShares;
const saveShares = (shares) => {
    currentShares = shares;
};

// Setup Mock API adapter on Axios
api.defaults.adapter = async (config) => {
    // Simulate natural 150ms network latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    const method = (config.method || "get").toLowerCase();
    let url = config.url || "";
    if (config.baseURL && url.startsWith(config.baseURL)) {
        url = url.slice(config.baseURL.length);
    }
    const [pathname, queryString] = url.split("?");

    // Parse params from query string and config.params
    const queryParams = new URLSearchParams(queryString || "");
    const params = {
        ...Object.fromEntries(queryParams.entries()),
        ...(config.params || {}),
    };

    // Parse request body (JSON or FormData)
    let body = {};
    let isFormData = false;
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        isFormData = true;
    } else if (config.data) {
        body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    }

    let responseData = null;
    let status = 200;

    // 1. AUTH ROUTES
    if (pathname === "/api/auth/me" && method === "get") {
        const user = getUser();
        if (user) {
            responseData = { user };
        } else {
            status = 401;
            responseData = { error: "Unauthorized" };
        }
    } else if (pathname === "/api/auth/login" && method === "post") {
        const user = {
            id: "usr_1001",
            name: body.email?.split("@")[0] || "User",
            email: body.email || "alex.morgan@example.com",
            storage_used: 423685120,
            storage_limit: 1073741824,
            created_at: new Date().toISOString(),
        };
        saveUser(user);
        responseData = { user, token: "dummy_jwt_token_sample" };
    } else if (pathname === "/api/auth/register" && method === "post") {
        const user = {
            id: `usr_${Date.now()}`,
            name: body.name || "User",
            email: body.email || "user@example.com",
            storage_used: 0,
            storage_limit: 1073741824,
            created_at: new Date().toISOString(),
        };
        saveUser(user);
        responseData = { user, token: "dummy_jwt_token_sample" };
    } else if (pathname === "/api/auth/logout" && method === "post") {
        saveUser(null);
        responseData = { message: "Logged out successfully" };
    }

    // 2. FOLDER ROUTES
    else if (pathname === "/api/folders" && method === "get") {
        const folders = getFolders();
        const parentId = params.parent_id === "null" || !params.parent_id ? null : params.parent_id;

        const activeFolders = folders.filter((f) => !f.is_trashed);
        const filtered =
            params.parent_id !== undefined
                ? activeFolders.filter((f) => String(f.parent_id || "") === String(parentId || ""))
                : activeFolders;

        responseData = { folders: filtered };
    } else if (pathname === "/api/folders" && method === "post") {
        const folders = getFolders();
        const parentId = body.parent_id || null;
        let parentPath = [];
        if (parentId) {
            const parent = folders.find((f) => f.id === parentId);
            if (parent) {
                parentPath = [...(parent.path || []), parent.id];
            }
        }
        const newFolder = {
            id: `fld_${Date.now()}`,
            name: body.name || "Untitled Folder",
            parent_id: parentId,
            owner_id: "usr_1001",
            path: parentPath,
            is_trashed: false,
            trashed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        const updated = [...folders, newFolder];
        saveFolders(updated);
        responseData = { folder: newFolder };
        status = 201;
    } else if (pathname.match(/^\/api\/folders\/[^/]+\/rename$/) && (method === "patch" || method === "post")) {
        const id = pathname.split("/")[3];
        const folders = getFolders();
        const index = folders.findIndex((f) => f.id === id);
        if (index !== -1) {
            folders[index].name = body.name || folders[index].name;
            folders[index].updated_at = new Date().toISOString();
            saveFolders(folders);
            responseData = { folder: folders[index] };
        } else {
            status = 404;
            responseData = { error: "Folder not found" };
        }
    } else if (pathname.match(/^\/api\/folders\/[^/]+\/move$/) && (method === "patch" || method === "post")) {
        const id = pathname.split("/")[3];
        const rawTarget = body.target_parent !== undefined ? body.target_parent : body.target_parent_id;
        const targetParentId = rawTarget === "null" || !rawTarget ? null : rawTarget;
        const folders = getFolders();
        const index = folders.findIndex((f) => f.id === id);
        if (index !== -1) {
            folders[index].parent_id = targetParentId;
            folders[index].updated_at = new Date().toISOString();
            saveFolders(folders);
            responseData = { folder: folders[index] };
        } else {
            status = 404;
            responseData = { error: "Folder not found" };
        }
    } else if (pathname.match(/^\/api\/folders\/[^/]+\/restore$/) && (method === "post" || method === "patch")) {
        const id = pathname.split("/")[3];
        const folders = getFolders();
        const index = folders.findIndex((f) => f.id === id);
        if (index !== -1) {
            folders[index].is_trashed = false;
            folders[index].trashed_at = null;
            saveFolders(folders);
            responseData = { folder: folders[index] };
        } else {
            status = 404;
            responseData = { error: "Folder not found" };
        }
    } else if (pathname.match(/^\/api\/folders\/[^/]+\/permanent$/) && method === "delete") {
        const id = pathname.split("/")[3];
        const folders = getFolders();
        saveFolders(folders.filter((f) => f.id !== id));
        responseData = { message: "Folder permanently deleted" };
    } else if (pathname.match(/^\/api\/folders\/[^/]+$/) && method === "get") {
        const id = pathname.split("/").pop();
        const folders = getFolders();
        const folder = folders.find((f) => f.id === id);
        if (folder) {
            // Calculate breadcrumbs trail
            const breadcrumbs = [];
            let curr = folder;
            while (curr && curr.parent_id) {
                const parent = folders.find((f) => f.id === curr.parent_id);
                if (parent) {
                    breadcrumbs.unshift({ id: parent.id, name: parent.name });
                    curr = parent;
                } else {
                    break;
                }
            }
            responseData = { folder, breadcrumbs };
        } else {
            status = 404;
            responseData = { error: "Folder not found" };
        }
    } else if (pathname.match(/^\/api\/folders\/[^/]+$/) && method === "delete") {
        const id = pathname.split("/").pop();
        const folders = getFolders();
        const index = folders.findIndex((f) => f.id === id);
        if (index !== -1) {
            folders[index].is_trashed = true;
            folders[index].trashed_at = new Date().toISOString();
            saveFolders(folders);
            responseData = { message: "Folder moved to trash" };
        } else {
            status = 404;
            responseData = { error: "Folder not found" };
        }
    }

    // 3. FILE ROUTES
    else if (pathname === "/api/files" && method === "get") {
        const files = getFiles();
        let filtered = files.filter((f) => !f.is_trashed);

        if (params.folder_id !== undefined) {
            const folderId = params.folder_id === "null" || !params.folder_id ? null : params.folder_id;
            filtered = filtered.filter((f) => String(f.folder_id || "") === String(folderId || ""));
        }

        if (params.search) {
            const query = params.search.toLowerCase();
            filtered = filtered.filter((f) => f.name.toLowerCase().includes(query));
        }

        // Apply sorting
        const sortKey = params.sort || "name_asc";
        const sorted = [...filtered].sort((a, b) => {
            if (sortKey === "name_desc") return b.name.localeCompare(a.name);
            if (sortKey === "date_asc") return new Date(a.created_at) - new Date(b.created_at);
            if (sortKey === "date_desc") return new Date(b.created_at) - new Date(a.created_at);
            if (sortKey === "size_asc") return Number(a.size) - Number(b.size);
            if (sortKey === "size_desc") return Number(b.size) - Number(a.size);
            return a.name.localeCompare(b.name);
        });

        responseData = { files: sorted };
    } else if (pathname === "/api/files/upload" && method === "post") {
        let uploadedFiles = [];
        let totalAddedSize = 0;
        let folderId = null;

        if (isFormData) {
            const rawFolder = config.data.get("folder_id");
            folderId = rawFolder === "null" || !rawFolder ? null : rawFolder;

            const fileList = config.data.getAll("files").length > 0 ? config.data.getAll("files") : config.data.getAll("file");

            fileList.forEach((fileObj, idx) => {
                const fileName = fileObj?.name || `Uploaded_File_${idx + 1}.png`;
                const fileSize = Number(fileObj?.size) || 1048576;
                const mimeType = fileObj?.type || "image/png";
                totalAddedSize += fileSize;

                uploadedFiles.push({
                    id: `fil_${Date.now()}_${idx}`,
                    name: fileName,
                    original_name: fileName,
                    mime_type: mimeType,
                    size: fileSize,
                    s3_key: `users/usr_1001/${fileName}`,
                    folder_id: folderId,
                    owner_id: "usr_1001",
                    is_trashed: false,
                    trashed_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            });
        }

        // Fallback for non-FormData or empty file list
        if (uploadedFiles.length === 0) {
            folderId = body.folder_id || folderId;
            if (folderId === "null") folderId = null;
            const rawList = Array.isArray(body.files) ? body.files : body.file ? [body.file] : [body];

            rawList.forEach((item, idx) => {
                const fileName = item?.name || `Uploaded_File_${idx + 1}.png`;
                const fileSize = Number(item?.size) || 1048576;
                const mimeType = item?.mime_type || item?.type || "image/png";
                totalAddedSize += fileSize;

                uploadedFiles.push({
                    id: `fil_${Date.now()}_${idx}`,
                    name: fileName,
                    original_name: fileName,
                    mime_type: mimeType,
                    size: fileSize,
                    s3_key: `users/usr_1001/${fileName}`,
                    folder_id: folderId,
                    owner_id: "usr_1001",
                    is_trashed: false,
                    trashed_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            });
        }

        const files = getFiles();
        saveFiles([...uploadedFiles, ...files]);

        // Update user storage
        const user = getUser();
        if (user) {
            user.storage_used = (Number(user.storage_used) || 0) + totalAddedSize;
            saveUser(user);
        }

        responseData = { files: uploadedFiles, file: uploadedFiles[0] };
        status = 201;
    } else if (pathname.match(/^\/api\/files\/[^/]+\/preview$/) && method === "get") {
        const id = pathname.split("/")[3];
        const files = getFiles();
        const file = files.find((f) => f.id === id);
        if (file) {
            const previewUrl = getSamplePreviewUrl(file);
            responseData = { preview_url: previewUrl, url: previewUrl, file };
        } else {
            status = 404;
            responseData = { error: "File not found" };
        }
    } else if (pathname.match(/^\/api\/files\/[^/]+\/rename$/) && (method === "patch" || method === "post")) {
        const id = pathname.split("/")[3];
        const files = getFiles();
        const index = files.findIndex((f) => f.id === id);
        if (index !== -1) {
            files[index].name = body.name || files[index].name;
            files[index].updated_at = new Date().toISOString();
            saveFiles(files);
            responseData = { file: files[index] };
        } else {
            status = 404;
            responseData = { error: "File not found" };
        }
    } else if (pathname.match(/^\/api\/files\/[^/]+\/move$/) && (method === "patch" || method === "post")) {
        const id = pathname.split("/")[3];
        const rawTarget = body.target_folder !== undefined ? body.target_folder : body.target_folder_id;
        const targetFolderId = rawTarget === "null" || !rawTarget ? null : rawTarget;
        const files = getFiles();
        const index = files.findIndex((f) => f.id === id);
        if (index !== -1) {
            files[index].folder_id = targetFolderId;
            files[index].updated_at = new Date().toISOString();
            saveFiles(files);
            responseData = { file: files[index] };
        } else {
            status = 404;
            responseData = { error: "File not found" };
        }
    } else if (pathname.match(/^\/api\/files\/[^/]+\/restore$/) && (method === "post" || method === "patch")) {
        const id = pathname.split("/")[3];
        const files = getFiles();
        const index = files.findIndex((f) => f.id === id);
        if (index !== -1) {
            files[index].is_trashed = false;
            files[index].trashed_at = null;
            saveFiles(files);
            responseData = { file: files[index] };
        } else {
            status = 404;
            responseData = { error: "File not found" };
        }
    } else if (pathname.match(/^\/api\/files\/[^/]+\/permanent$/) && method === "delete") {
        const id = pathname.split("/")[3];
        const files = getFiles();
        const found = files.find((f) => f.id === id);
        saveFiles(files.filter((f) => f.id !== id));
        if (found) {
            const user = getUser();
            if (user) {
                user.storage_used = Math.max(0, (Number(user.storage_used) || 0) - Number(found.size || 0));
                saveUser(user);
            }
        }
        responseData = { message: "File permanently deleted" };
    } else if (pathname.match(/^\/api\/files\/[^/]+$/) && method === "delete") {
        const id = pathname.split("/").pop();
        const files = getFiles();
        const index = files.findIndex((f) => f.id === id);
        if (index !== -1) {
            files[index].is_trashed = true;
            files[index].trashed_at = new Date().toISOString();
            saveFiles(files);
            responseData = { message: "File moved to trash" };
        } else {
            status = 404;
            responseData = { error: "File not found" };
        }
    }

    // 4. TRASH ROUTES
    else if (pathname === "/api/trash" && method === "get") {
        const files = getFiles().filter((f) => f.is_trashed);
        const folders = getFolders().filter((f) => f.is_trashed);
        responseData = { files, folders };
    } else if (pathname === "/api/trash/empty" && (method === "post" || method === "delete")) {
        const activeFiles = getFiles().filter((f) => !f.is_trashed);
        const activeFolders = getFolders().filter((f) => !f.is_trashed);
        saveFiles(activeFiles);
        saveFolders(activeFolders);

        // Recalculate user storage usage
        const totalUsed = activeFiles.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
        const user = getUser();
        if (user) {
            user.storage_used = totalUsed;
            saveUser(user);
        }

        responseData = { message: "Trash emptied successfully" };
    }

    // 5. SHARE ROUTES
    else if (pathname === "/api/shares" && method === "get") {
        const shares = getShares();
        const files = getFiles();
        const folders = getFolders();

        const enriched = shares
            .filter((s) => {
                if (s.resource_type === "file") {
                    const f = files.find((item) => item.id === s.resource_id);
                    return f ? !f.is_trashed : true;
                } else {
                    const fo = folders.find((item) => item.id === s.resource_id);
                    return fo ? !fo.is_trashed : true;
                }
            })
            .map((s) => {
                let resource = s.resource;
                if (!resource) {
                    if (s.resource_type === "file") {
                        const f = files.find((item) => item.id === s.resource_id);
                        if (f) {
                            resource = {
                                id: f.id,
                                name: f.name,
                                mime_type: f.mime_type,
                                size: f.size,
                            };
                        }
                    } else {
                        const fo = folders.find((item) => item.id === s.resource_id);
                        if (fo) {
                            resource = {
                                id: fo.id,
                                name: fo.name,
                                mime_type: null,
                            };
                        }
                    }
                }
                return {
                    ...s,
                    resource: resource || {
                        id: s.resource_id,
                        name: s.resource_type === "folder" ? "Shared Folder" : "Shared File",
                        mime_type: s.resource_type === "folder" ? null : "application/octet-stream",
                    },
                };
            });

        responseData = { share_links: enriched, shares: enriched };
    } else if (pathname === "/api/shares" && method === "post") {
        const shares = getShares();
        const files = getFiles();
        const folders = getFolders();

        const existing = shares.find((s) => s.resource_id === body.resource_id && s.resource_type === (body.resource_type || "file"));
        if (existing) {
            responseData = { share: existing, share_link: existing, is_existing: true };
        } else {
            let resource = null;
            if ((body.resource_type || "file") === "file") {
                const f = files.find((item) => item.id === body.resource_id);
                if (f) {
                    resource = { id: f.id, name: f.name, mime_type: f.mime_type, size: f.size };
                }
            } else {
                const fo = folders.find((item) => item.id === body.resource_id);
                if (fo) {
                    resource = { id: fo.id, name: fo.name, mime_type: null };
                }
            }

            const newShare = {
                id: `sh_${Date.now()}`,
                token: `token_${Math.random().toString(36).substring(2, 12)}`,
                resource_type: body.resource_type || "file",
                resource_id: body.resource_id,
                owner_id: "usr_1001",
                permission: body.permission || "download",
                expires_at: body.expires_at || null,
                access_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                resource,
            };
            saveShares([newShare, ...shares]);
            responseData = { share: newShare, share_link: newShare, is_existing: false };
            status = 201;
        }
    } else if (pathname.match(/^\/api\/shares\/[^/]+$/) && method === "delete") {
        const id = pathname.split("/").pop();
        const shares = getShares();
        saveShares(shares.filter((s) => s.id !== id));
        responseData = { message: "Share link revoked" };
    } else if (pathname.match(/^\/api\/shares\/access\/[^/]+$/) && method === "get") {
        const token = pathname.split("/").pop();
        const shares = getShares();
        const share = shares.find((s) => s.token === token);
        if (share) {
            share.access_count = (share.access_count || 0) + 1;
            saveShares(shares);

            const currentUser = getUser();
            if (share.resource_type === "file") {
                const file = getFiles().find((f) => f.id === share.resource_id) || dummyFiles[1];
                const previewUrl = getSamplePreviewUrl(file);
                responseData = {
                    share,
                    file,
                    preview_url: previewUrl,
                    url: previewUrl,
                    resource_type: "file",
                    permission: share.permission,
                    owner: currentUser,
                };
            } else {
                const folder = getFolders().find((f) => f.id === share.resource_id) || dummyFolders[0];
                const folderFiles = getFiles().filter((f) => f.folder_id === folder.id && !f.is_trashed);
                responseData = {
                    share,
                    folder,
                    files: folderFiles,
                    resource_type: "folder",
                    permission: share.permission,
                    owner: currentUser,
                };
            }
        } else {
            status = 404;
            responseData = { error: "Shared link not found or expired" };
        }
    }

    // Return Axios formatted response or error
    if (status >= 400) {
        const err = new Error(responseData?.error || "Request failed");
        err.response = { data: responseData, status, headers: {}, config };
        throw err;
    }

    return {
        data: responseData,
        status,
        statusText: "OK",
        headers: {},
        config,
    };
};

export default api;
