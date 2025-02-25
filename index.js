const selectFilesButton = document.getElementById("select-files");
const fileList = document.getElementById("file-list");
const processFilesButton = document.getElementById("process-files");
let selectedFiles = []; // Para almacenar las rutas de los archivos seleccionados

selectFilesButton.addEventListener("click", async () => {
    const filePaths = await window.electronAPI.selectFiles();

    selectedFiles = filePaths; // Guardar las rutas de los archivos seleccionados

    fileList.innerHTML = ""; // Limpiar lista

    filePaths.forEach(filePath => {
        const li = document.createElement("li");
        li.textContent = filePath;

        // Botón de eliminar
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Eliminar";
        deleteButton.addEventListener("click", () => {
            li.remove();
            selectedFiles = selectedFiles.filter(file => file !== filePath);
            if (selectedFiles.length === 0) {
                processFilesButton.disabled = true; // Desactivar el botón de procesar si no hay archivos
            }
        });

        // Añadir el botón de eliminar al li
        li.appendChild(deleteButton);
        fileList.appendChild(li);
    });

    // Activar el botón de procesar si hay archivos seleccionados
    processFilesButton.disabled = selectedFiles.length === 0;
});

processFilesButton.addEventListener("click", async () => {
    if (selectedFiles.length > 0) {
       const data= await window.electronAPI.processFiles(selectedFiles);
        console.log("Archivos procesados:", selectedFiles);
        console.log("Datos:", data);
    }
});



