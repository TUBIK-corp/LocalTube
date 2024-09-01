const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { indexVideos } = require('./videoIndexer');
const path = require('path');
const fs = require('fs');

let mainWindow;
let indexedFolders = [];

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false,
            allowRunningInsecureContent: true
        }
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Load settings from settings.json
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
        indexedFolders = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('open-settings', () => {
    mainWindow.loadFile('settings.html');
});

ipcMain.on('back-to-main', () => {
    mainWindow.loadFile('index.html');
});

ipcMain.on('get-folders', (event) => {
    event.reply('load-folders', indexedFolders);
});

ipcMain.on('add-folder', (event) => {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(result => {
        if (!result.canceled) {
            const newFolder = result.filePaths[0];
            if (!indexedFolders.includes(newFolder)) {
                indexedFolders.push(newFolder);
                saveSettings();
                event.reply('load-folders', indexedFolders);
            }
        }
    });
});

ipcMain.on('remove-folder', (event, folder) => {
    indexedFolders = indexedFolders.filter(f => f !== folder);
    saveSettings();
    event.reply('load-folders', indexedFolders);
});

ipcMain.on('index-videos', (event) => {
    const videos = indexVideos(indexedFolders);
    event.reply('video-list', videos);
});

ipcMain.on('open-video', (event, videoPath) => {
    mainWindow.loadFile('player.html');
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('load-video', videoPath);
    });
});

function saveSettings() {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(indexedFolders, null, 2));
}
