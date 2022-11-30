import * as fs from 'fs';
import path = require('path');
import * as vscode from 'vscode';
import { fileExists } from './utils';

export function getWorkingDartFileUri() {
  let uri = vscode.window.activeTextEditor?.document.uri
  if (!uri || path.extname(uri.fsPath) != '.dart') {
    let errorMessage = "Please focus on a .dart file"
    vscode.window.showErrorMessage(errorMessage)
    throw Error(errorMessage);
  }

  return uri
}

export function workingDirectoryUriFromFile(file: vscode.Uri) {
  return vscode.Uri.file(path.dirname(file.fsPath))
}

export async function getPartName() {
  let name = await vscode.window.showInputBox(
    {
      placeHolder: "<part_file_name> or <path/to/part_file>",
      prompt: "Enter the part file name. If the name contains `/`, a subdirectory will be created. The new file will be created relative to the currently selected file directory",
      validateInput: (name) => {
        if (name.includes("..")) {
          return {
            message: `The file name can't contain '..' so part file can be only in the sub folder.`,
            severity: vscode.InputBoxValidationSeverity.Error,
          }
        }
        if (name.includes(" ")) {
          return {
            message: `The file name will be '${formatPartName(name)}'`,
            severity: vscode.InputBoxValidationSeverity.Info,
          }
        }
        if (name.length > 0 && !name.trim().endsWith('.dart')) {
          return {
            message: `The file name will be '${name}.dart'`,
            severity: vscode.InputBoxValidationSeverity.Info,
          }
        }

        return null
      }
    }
  );
  if (name) {
    return formatPartName(name)
  }
}

export function formatPartName(name: string) {
  let formattedName = name.trim().split(' ').join('_')
  if (!formattedName.includes(".dart")) {
    formattedName = `${formattedName}.dart`
  }
  return formattedName
}

export async function getPartUri(partName: string, workingDirectoryUri: vscode.Uri) {
  let partUri = vscode.Uri.joinPath(workingDirectoryUri, partName)
  if (await fileExists(partUri)) {
    const errorMessage = `The part '${path.basename(partName)}' already exists.`
    vscode.window.showErrorMessage(errorMessage)
    throw Error(errorMessage)
  }

  return partUri
}

export async function createPartFile(partUri: vscode.Uri, partPath: string, dartFileName: string) {
  fs.mkdirSync(path.dirname(partUri.fsPath), { recursive: true })

  let file = await fs.promises.open(partUri.fsPath, "w")

  let splitter = process.platform === "win32" ? "\\" : "/"
  let splittedPartNamePath = partPath.split(splitter)
  splittedPartNamePath.pop()
  let partOfName = [...splittedPartNamePath.map((_) => '..'), dartFileName].join(splitter)
  await file.write(`part of '${partOfName}';\n`)
  await file.close()
}

export async function updateOriginalFile(originalFileUri: vscode.Uri, partName: string) {
  let fileData = await fs.promises.readFile(originalFileUri.fsPath, { encoding: 'utf-8' })
  let fileLines = fileData.split('\n')
  let file = await fs.promises.open(originalFileUri.fsPath, 'w')

  let lastPartLine = 0
  let lastImportIsAPart = false
  for (let i = 0; i < fileLines.length; i++) {
    let currentString = fileLines[i].trim()
    if (currentString.startsWith('import')) {
      lastPartLine = i
    } else if (currentString.startsWith('part')) {
      lastPartLine = i
      lastImportIsAPart = true
    }
  }

  let partToInclude = `part '${partName}';`
  for (let i = 0; i < lastPartLine + 1; i++) {
    await file.appendFile(`${fileLines[i]}\n`)
  }
  if (!lastImportIsAPart) {
    await file.appendFile("\n")
  }
  await file.appendFile(`${partToInclude}\n`)
  for (let i = lastPartLine + 1; i < fileLines.length - 1; i++) {
    await file.appendFile(`${fileLines[i]}\n`)
  }
  await file.appendFile(fileLines[fileLines.length - 1])

  await file.close()
}
