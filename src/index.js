const {
  app,
  dialog,
  BrowserWindow,
  session,
  ipcMain,
  autoUpdater,
} = require("electron");
const os = require("os");
const path = require("path");
const winston = require("winston");
const {
  getModel,
  setModel,
  sendChat,
  stopChat,
  serveOllama,
  stopOllama,
  loadDocument,
  runOllamaModel,
} = require("./chat.js");

const appVersion = app.getVersion();
const osType = os.type(); // e.g., 'Darwin', 'Windows_NT', etc.
const osArch = os.arch(); // e.g., 'x64', 'ia32', etc.
const updateURL = `https://chatd.ai/api/update?version=${appVersion}&os=${osType}&arch=${osArch}`;
const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(app.getPath("home"), ".chatd", "app.log"),
      maxSize: 1000000, // 1 MB
      maxFiles: 1,
    }),
  ],
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Add a handler for the interprocess events. This enables 2-way communication
  // between the renderer process (UI) and the main process.
  // https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way
  ipcMain.on("model:set", setModel);
  ipcMain.on("model:get", getModel);
  ipcMain.on("chat:send", sendChat);
  ipcMain.on("chat:stop", stopChat);
  ipcMain.on("doc:load", loadDocument);
  ipcMain.on("ollama:serve", serveOllama);
  ipcMain.on("ollama:run", runOllamaModel);
  ipcMain.on("ollama:stop", stopOllama);

  if (app.isPackaged) {
    // Check app location
    if (process.platform === "darwin" && !app.isInApplicationsFolder()) {
      const chosen = dialog.showMessageBoxSync({
        type: "question",
        buttons: ["Move to Applications", "Do Not Move"],
        message:
          "Would you like to move this chatd to the Applications folder?",
        defaultId: 0,
        cancelId: 1,
      });

      if (chosen === 0) {
        try {
          app.moveToApplicationsFolder();
        } catch (err) {
          dialog.showErrorBox(
            "Unable to move to Applications folder",
            err.message
          );
        }
      }
    }

    // Auto-updater logic
    autoUpdater.setFeedURL({
      url: updateURL,
    });
    autoUpdater.checkForUpdates();

    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 3600000); // Check every hour

    autoUpdater.on("update-available", (info) => {
      logger.info("Update available");
    });

    autoUpdater.on("update-downloaded", () => {
      // The update is ready to be installed on app restart.
      logger.info("Update downloaded");
    });

    autoUpdater.on("error", (err) => {
      logger.error("Error in auto-updater: ", err);
    });
  }

  createWindow();

  // Define a custom Content Security Policy to only allow loading resources from the app's origin.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["default-src 'self'"],
      },
    });
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  // Stop the ollama server when the app is closed
  stopOllama();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
