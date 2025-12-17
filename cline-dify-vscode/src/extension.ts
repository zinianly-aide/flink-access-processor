import * as vscode from 'vscode';
import { DifyService } from './services/difyService';
import { ProjectService } from './services/projectService';
import { GeneratorService } from './services/generatorService';
import { SettingsViewProvider, FeaturesViewProvider } from './services/viewProvider';
import { QnaViewProvider } from './services/qnaViewProvider';
import { ChangeTrackerService } from './services/changeTrackerService';
import { McpService } from './services/mcpService';
import { CitationService } from './services/citationService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Cline Dify Assistant is now active!');

    const difyService = new DifyService(context);
    const projectService = new ProjectService(context);
    const generatorService = new GeneratorService(context, difyService);
    const changeTrackerService = new ChangeTrackerService(context);
    const mcpService = new McpService(context);
    const citationService = new CitationService(context);

    // Register view providers for sidebar
    const settingsViewProvider = new SettingsViewProvider(context.extensionUri, context);
    const featuresViewProvider = new FeaturesViewProvider(context.extensionUri, context);
    const qnaViewProvider = new QnaViewProvider(context.extensionUri, context, difyService, mcpService, citationService);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SettingsViewProvider.viewType, settingsViewProvider),
        vscode.window.registerWebviewViewProvider(FeaturesViewProvider.viewType, featuresViewProvider),
        vscode.window.registerWebviewViewProvider(QnaViewProvider.viewType, qnaViewProvider)
    );

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

    const insertSelectionCitationCommand = vscode.commands.registerCommand('cline-dify-assistant.insertSelectionCitation', async () => {
        await citationService.insertCitationFromSelection();
    });

    const copyInstallCommand = vscode.commands.registerCommand('cline-dify-assistant.copyInstallCommand', async () => {
        await generatorService.copyInstallCommand();
    });

    // Register completion item provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        '*',
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                return difyService.provideCompletionItems(document, position);
            }
        },
        '.'
    );

    // Push to context subscriptions
    context.subscriptions.push(
        generateCodeCommand,
        explainCodeCommand,
        improveCodeCommand,
        generateDirectoryCommand,
        executeCommandCommand,
        showProjectStructureCommand,
        readFileContentCommand,
        startDualRoleGeneratorCommand,
        debugGeneratedCodeCommand,
        configureSettingsCommand,
        openChangeTrackerCommand,
        runMcpQueryCommand,
        insertCitationCommand,
        insertSelectionCitationCommand,
        copyInstallCommand,
        completionProvider
    );
}

export function deactivate() {
    console.log('Cline Dify Assistant is now deactivated!');
}
