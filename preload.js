const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    processFiles: (files) => ipcRenderer.invoke("process-files", files),
    selectFiles: () => ipcRenderer.invoke("select-files")
});