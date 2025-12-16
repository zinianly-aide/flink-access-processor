import * as vscode from 'vscode';

export function getNonce(length: number = 32): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < length; i++) {
        nonce += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return nonce;
}

export function getDefaultCsp(webview: vscode.Webview, nonce: string, allowConnect: boolean = false): string {
    const connectSrc = allowConnect ? `${webview.cspSource} https:` : 'none';
    return [
        `default-src 'none'`,
        `img-src ${webview.cspSource} https: data:`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src 'nonce-${nonce}'`,
        `connect-src ${connectSrc}`
    ].join('; ');
}

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function escapeAttribute(text: string): string {
    return escapeHtml(text).replace(/`/g, '&#096;');
}

