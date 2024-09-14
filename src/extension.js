// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const {scanUtilMethod} = require('./get-utils-list');

// 此方法在扩展被激活时调用
// Your extension is activated the very first time the command is executed
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "util-method-scanner" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('util-method-scanner.scan', async (uri) => {
		let editor = vscode.window.activeTextEditor;
        if (editor) {
          const currentDocumentUri = editor.document.uri;
          const selectedWorkspaceFolder = vscode.workspace.getWorkspaceFolder(currentDocumentUri);
          if (selectedWorkspaceFolder) {
			const folderName = path.basename(selectedWorkspaceFolder.uri.fsPath);
            const outputFile = path.join(selectedWorkspaceFolder.uri.fsPath, `util-method-scanner-${getCurrentTimeFormatted()}.xlsx`);
			await scanUtilMethod({
				projectName: folderName,
				scanPath: uri.fsPath, outputPath: outputFile}
			);
			vscode.window.showInformationMessage(`扫描完成，请在当前项目目录下查看结果文件：${outputFile}`);

          }
        }
	});

	context.subscriptions.push(disposable);
}

function getCurrentTimeFormatted() {
	const now = new Date();
	
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
  
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
