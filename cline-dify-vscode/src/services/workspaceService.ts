import * as vscode from 'vscode';

export function getPreferredWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
        return undefined;
    }
    if (folders.length === 1) {
        return folders[0];
    }

    const activeUri = vscode.window.activeTextEditor?.document?.uri;
    if (!activeUri) {
        return undefined;
    }

    return vscode.workspace.getWorkspaceFolder(activeUri);
}

export async function pickWorkspaceFolder(placeHolder: string): Promise<vscode.WorkspaceFolder | undefined> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
        return undefined;
    }
    if (folders.length === 1) {
        return folders[0];
    }

    const preferred = getPreferredWorkspaceFolder();
    const items = folders.map(folder => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder,
        picked: preferred ? folder.uri.toString() === preferred.uri.toString() : false
    }));

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder,
        matchOnDescription: true,
        ignoreFocusOut: true
    });

    return picked?.folder;
}

