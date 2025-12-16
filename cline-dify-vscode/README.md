# Cline Dify Assistant

An AI coding assistant for Visual Studio Code, powered by Dify backend.

## Features

### Core Features
- **Code Generation**: Generate code based on natural language descriptions
- **Code Explanation**: Explain selected code in plain English
- **Code Improvement**: Suggest improvements to selected code with explanations
- **Intelligent Code Completion**: Get AI-powered code completions as you type
- **Multiple Backend Support**: Switch between hosted Dify API or a local Ollama backend
- **Sidebar Q&A Assistant**: Activity Bar 中提供即时问答面板，支持快速交互和基础配置
- **Natural-Language Commands**: 在 Q&A 面板输入“查看项目结构”“打开配置”等语句即可触发对应命令
- **MCP Integration**: 通过 MCP 服务扩展上下文或工具能力
- **Citation Insertion**: 从任意文件/行区间生成引用并插入编辑器
- **Status Bar Progress**: 状态栏实时显示当前 AI 调用进度，方便随时掌握工作状态

### Project Management Features
- **Generate Directory Structure**: Create directories and files based on input patterns
- **Execute Command Line**: Run terminal commands and view output within VS Code
- **Show Project Structure**: Display project file hierarchy in a webview panel
- **Read File Content**: View file contents in a webview panel without opening the file
- **Code Change Tracker**: 在 WebviewPanel 查看当前工作区的 git status 与 diff

### Dual-Role Generator
- **Planner Role**: Generates comprehensive markdown development documentation
- **Executor Role**: Automatically generates code based on the development documentation
- **Integrated Workflow**: Seamlessly transition from planning to implementation
- **Debug Support**: Run test commands to verify generated code

## Requirements

- Visual Studio Code version 1.80.0 or higher
- A Dify API Key (get one from [Dify Console](https://console.dify.ai))

## Installation

1. Open Visual Studio Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Cline Dify Assistant"
4. Click "Install"
5. Reload VS Code if prompted

## Configuration

1. Open VS Code Settings (`Ctrl+,`) **or** run the Command Palette action `Cline Dify Assistant: Configure Settings`
2. Search for "Cline Dify Assistant"
3. Choose a backend provider:
   - `dify`: Use the hosted Dify API (requires API key)
   - `ollama`: Use a local Ollama server (no API key required)
4. Provide the required fields for the chosen provider:
   - **Dify**: `API Key`, `Base URL`, `Model`
   - **Ollama**: `Ollama Base URL`, `Ollama Model` (e.g., `llama3`, `qwen2:7b`, etc.)

## Usage

### Core Features

#### Generate Code
1. Open a file in VS Code
2. Position your cursor where you want to insert code
3. Right-click and select "Generate Code with Dify"
4. Enter a description of the code you want to generate
5. Press Enter and wait for the response

#### Explain Code
1. Select the code you want to explain
2. Right-click and select "Explain Code with Dify"
3. A new panel will open with the explanation

#### Improve Code
1. Select the code you want to improve
2. Right-click and select "Improve Code with Dify"
3. A new panel will open with improved code and explanations

#### Code Completion
1. Start typing code
2. When you see the AI completion suggestion, press `Tab` to accept

### Project Management Features

#### Generate Directory Structure
1. Right-click in the Explorer panel
2. Select "Generate Directory Structure"
3. Enter the directory structure (e.g., `src/components/Button.tsx,src/utils/helpers.ts`)
4. Press Enter and the directories and files will be created

#### Execute Command Line
1. Right-click in the Explorer panel or open the Command Palette
2. Select "Execute Command Line"
3. Enter the command to execute (e.g., `ls -la`, `git status`)
4. Press Enter and view the output in a new panel

#### Show Project Structure
1. Right-click in the Explorer panel or open the Command Palette
2. Select "Show Project Structure"
3. View the project file hierarchy in a new panel

#### Read File Content
1. Open the Command Palette
2. Select "Read File Content"
3. Enter the file path (e.g., `src/components/Button.tsx`)
4. Press Enter and view the file content in a new panel

### Dual-Role Generator

#### Start Dual-Role Generator
1. Right-click in the editor or open the Command Palette
2. Select "Start Dual-Role Generator"
3. Enter a project description (e.g., "A React component library with Button, Input, and Card components")
4. Wait for the structured plan to be generated
5. Review the generated `DEVELOPMENT_PLAN.json` file
6. Choose to proceed with code generation and select which files to generate (Preview)
7. The executor will generate code strictly following the plan paths

#### Debug Generated Code
1. Open the Command Palette
2. Select "Debug Generated Code"
3. Enter a test command (e.g., `npm test`, `yarn build`)
4. Press Enter to run the command and verify generated code

### Sidebar Q&A Assistant
1. 打开 Activity Bar 中的 **Q&A Assistant** 视图。
2. 在输入框中键入问题，点击“发送”即可收到 AI 回复。
3. 下方会实时显示当前 Provider/Model，如需修改可点击“打开配置”快捷按钮。
4. 历史对话会在视图中保留，方便快速参考。

### Code Change Tracker
1. 打开命令面板，运行 `Cline Dify Assistant: Show Code Change Tracker`。
2. WebviewPanel 会展示当前工作区的 `git status --short` 与 `git diff`。
3. 点击“Refresh”按钮可以重新抓取最新变更。
4. 若工作区不是 Git 仓库或缺少 git，将显示错误提示。

### Using MCP
1. 在设置或 `Configure Settings` 命令中启用 MCP 并配置 Base URL/API Key。
2. 在 Q&A 面板输入 `mcp: <你的问题>` 或 `使用mcp 查找...`，即可把自然语言查询发送到 MCP。
3. 也可以通过命令 `Cline Dify Assistant: Run MCP Query` 打开输入框，结果会输出到 **Cline MCP** Output Channel。

### Insert Code Citation
1. 运行 `Cline Dify Assistant: Insert Code Citation`。
2. 选择要引用的文件，输入可选的行区间（例如 `12-40`，留空则引用全文）。
3. 引用会以 Markdown 格式插入到当前光标位置；若当前没有编辑器，会复制到剪贴板。

### Using the Configure Settings Command
If the sidebar views are unavailable, open the Command Palette and run `Cline Dify Assistant: Configure Settings`.  
This guided flow lets you:
- Pick the backend provider (Dify or Ollama)
- Enter/Update API keys, base URLs, and model names
- Save everything to your current workspace or global VS Code settings

### Using Ollama
1. Install and start [Ollama](https://ollama.com/) locally.
2. Pull the model you want (e.g., `ollama pull llama3`).
3. Run `Cline Dify Assistant: Configure Settings` and choose **Ollama (Local Backend)**.
4. Ensure the base URL (default `http://localhost:11434`) and model match your local setup.
5. Use the extension as usual—requests will be routed to Ollama instead of Dify.

## Commands

### Core Commands
| Command | Description |
|---------|-------------|
| `cline-dify-assistant.generateCode` | Generate code from description |
| `cline-dify-assistant.explainCode` | Explain selected code |
| `cline-dify-assistant.improveCode` | Improve selected code |

### Project Management Commands
| Command | Description |
|---------|-------------|
| `cline-dify-assistant.generateDirectoryStructure` | Generate directory structure and files |
| `cline-dify-assistant.executeCommand` | Execute terminal commands |
| `cline-dify-assistant.showProjectStructure` | Show project file structure |
| `cline-dify-assistant.readFileContent` | Read and display file content |
| `cline-dify-assistant.configureSettings` | Configure backend provider, API keys, and models without opening the sidebar |
| `cline-dify-assistant.openChangeTracker` | Open the git-based Code Change Tracker panel |
| `cline-dify-assistant.runMcpQuery` | Prompt for a query and send it to the configured MCP server |
| `cline-dify-assistant.insertCodeCitation` | Insert a reference to a file or range into the active editor |

### Dual-Role Generator Commands
| Command | Description |
|---------|-------------|
| `cline-dify-assistant.startDualRoleGenerator` | Start the dual-role generator workflow |
| `cline-dify-assistant.debugGeneratedCode` | Debug generated code with test commands |

## Keybindings

Currently, there are no default keybindings. You can set your own in VS Code Keyboard Shortcuts (`Ctrl+K Ctrl+S`) by searching for the commands listed above.

## Troubleshooting

- **No response from Dify API**: Check your API Key and network connection
- **Code completion not working**: Ensure you have a valid API Key and that the prefix is at least 3 characters long
- **Extension not activating**: Make sure you're using VS Code 1.80.0 or higher

## Contributing

If you encounter any issues or have suggestions for improvements, please open an issue or submit a pull request on the [GitHub repository](https://github.com/your-username/cline-dify-assistant).

## License

MIT
### Dual-Role Generator Commands
| Command | Description |
|---------|-------------|
| `cline-dify-assistant.startDualRoleGenerator` | Start the dual-role generator workflow |
| `cline-dify-assistant.debugGeneratedCode` | Debug generated code with test commands |
