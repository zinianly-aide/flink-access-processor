"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const difyService_1 = require("./services/difyService");
const projectService_1 = require("./services/projectService");
const generatorService_1 = require("./services/generatorService");
const viewProvider_1 = require("./services/viewProvider");
const qnaViewProvider_1 = require("./services/qnaViewProvider");
const changeTrackerService_1 = require("./services/changeTrackerService");
const mcpService_1 = require("./services/mcpService");
const citationService_1 = require("./services/citationService");
function activate(context) {
    console.log('Cline Dify Assistant is now active!');
    const difyService = new difyService_1.DifyService(context);
    const projectService = new projectService_1.ProjectService(context);
    const generatorService = new generatorService_1.GeneratorService(context, difyService);
    const changeTrackerService = new changeTrackerService_1.ChangeTrackerService(context);
    const mcpService = new mcpService_1.McpService(context);
    const citationService = new citationService_1.CitationService(context);
    // Register view providers for sidebar
    const settingsViewProvider = new viewProvider_1.SettingsViewProvider(context.extensionUri, context);
    const featuresViewProvider = new viewProvider_1.FeaturesViewProvider(context.extensionUri, context);
    const qnaViewProvider = new qnaViewProvider_1.QnaViewProvider(context.extensionUri, difyService, mcpService, citationService);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewProvider_1.SettingsViewProvider.viewType, settingsViewProvider), vscode.window.registerWebviewViewProvider(viewProvider_1.FeaturesViewProvider.viewType, featuresViewProvider), vscode.window.registerWebviewViewProvider(qnaViewProvider_1.QnaViewProvider.viewType, qnaViewProvider));
    // Register commands
    const generateCodeCommand = vscode.commands.registerCommand('cline-dify-assistant.generateCode', async () => {
        await difyService.generateCode();
    });
    const explainCodeCommand = vscode.commands.registerCommand('cline-dify-assistant.explainCode', async () => {
        await difyService.explainCode();
    });
    const improveCodeCommand = vscode.commands.registerCommand('cline-dify-assistant.improveCode', async () => {
        await difyService.improveCode();
    });
    // New commands for project management
    const generateDirectoryCommand = vscode.commands.registerCommand('cline-dify-assistant.generateDirectoryStructure', async () => {
        await projectService.generateDirectoryStructure();
    });
    const executeCommandCommand = vscode.commands.registerCommand('cline-dify-assistant.executeCommand', async () => {
        await projectService.executeCommand();
    });
    const showProjectStructureCommand = vscode.commands.registerCommand('cline-dify-assistant.showProjectStructure', async () => {
        await projectService.showProjectStructure();
    });
    const readFileContentCommand = vscode.commands.registerCommand('cline-dify-assistant.readFileContent', async () => {
        await projectService.readFileContent();
    });
    // New commands for dual-role generator
    const startDualRoleGeneratorCommand = vscode.commands.registerCommand('cline-dify-assistant.startDualRoleGenerator', async () => {
        await generatorService.startDualRoleGenerator();
    });
    const debugGeneratedCodeCommand = vscode.commands.registerCommand('cline-dify-assistant.debugGeneratedCode', async () => {
        await generatorService.debugGeneratedCode();
    });
    const configureSettingsCommand = vscode.commands.registerCommand('cline-dify-assistant.configureSettings', async () => {
        await difyService.configureSettings();
    });
    const openChangeTrackerCommand = vscode.commands.registerCommand('cline-dify-assistant.openChangeTracker', async () => {
        await changeTrackerService.showChangeTracker();
    });
    const runMcpQueryCommand = vscode.commands.registerCommand('cline-dify-assistant.runMcpQuery', async () => {
        await mcpService.runInteractiveQuery();
    });
    const insertCitationCommand = vscode.commands.registerCommand('cline-dify-assistant.insertCodeCitation', async () => {
        await citationService.insertCitationInteractive();
    });
    // Register completion item provider
    const completionProvider = vscode.languages.registerCompletionItemProvider('*', {
        async provideCompletionItems(document, position) {
            return difyService.provideCompletionItems(document, position);
        }
    }, '.');
    // Push to context subscriptions
    context.subscriptions.push(generateCodeCommand, explainCodeCommand, improveCodeCommand, generateDirectoryCommand, executeCommandCommand, showProjectStructureCommand, readFileContentCommand, startDualRoleGeneratorCommand, debugGeneratedCodeCommand, configureSettingsCommand, openChangeTrackerCommand, runMcpQueryCommand, insertCitationCommand, completionProvider);
}
function deactivate() {
    console.log('Cline Dify Assistant is now deactivated!');
}
//# sourceMappingURL=extension.js.map