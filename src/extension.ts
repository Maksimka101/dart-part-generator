import path = require('path');
import * as vscode from 'vscode';
import { createDartFile, getFileName, buildDartFileUri, getWorkingDartFileUri, updateOriginalFile, workingDirectoryUriFromFile } from './createDartPartFile';
import { focusOnFile } from './utils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('dart-part-generator.createPart', async () => {
			try {
				let dartFileUri = getWorkingDartFileUri();
				let directoryUri = workingDirectoryUriFromFile(dartFileUri)

				let partPath = await getFileName(true)
				if (!partPath) {
					return
				}

				let partUri = await buildDartFileUri(partPath, directoryUri)
				await createDartFile({
					fileUri: partUri,
					part: {
						filePath: partPath,
						partOfFileName: path.basename(dartFileUri.fsPath)
					}
				})

				await updateOriginalFile(dartFileUri, partPath)
				await focusOnFile(partUri)
			} catch { }
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('dart-part-generator.createFile', async () => {
			try {
				let dartFileUri = getWorkingDartFileUri();
				let directoryUri = workingDirectoryUriFromFile(dartFileUri)

				let filePath = await getFileName(false)
				if (!filePath) {
					return
				}

				let fileUri = await buildDartFileUri(filePath, directoryUri)
				await createDartFile({ fileUri: fileUri })

				await focusOnFile(fileUri)
			} catch { }
		})
	)
}

// This method is called when your extension is deactivated
export function deactivate() { }
