import path = require('path');
import * as vscode from 'vscode';
import { createPartFile, getPartName, getPartUri, getWorkingDartFileUri, updateOriginalFile, workingDirectoryUriFromFile } from './createDartPartFile';
import { focusOnFile } from './utils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('dart-part-generator.createPart', async () => {
			try {
				let dartFileUri = getWorkingDartFileUri();
				let directoryUri = workingDirectoryUriFromFile(dartFileUri)

				let partPath = await getPartName()
				if (!partPath) {
					return
				}

				let partUri = await getPartUri(partPath, directoryUri)
				await createPartFile(partUri, partPath, path.basename(dartFileUri.fsPath))

				await updateOriginalFile(dartFileUri, partPath)
				await focusOnFile(partUri)
			} catch { }
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }
