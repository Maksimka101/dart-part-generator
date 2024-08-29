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

export async function getFileName(isPart: boolean) {
  let filePathPrefix = isPart ? "part_" : ""
  let filePrefix = isPart ? "part " : ""
  let name = await vscode.window.showInputBox(
    {
      placeHolder: `<${filePathPrefix}file_name> or <path/to/${filePathPrefix}file>`,
      prompt: `Enter the ${filePrefix}file name. If the name contains \`/\`, a subdirectory will be created. The new file will be created relative to the currently selected file directory`,
      validateInput: (name: string) => {
        if (name.includes("..") && isPart) {
          return {
            message: `The file name can't contain '..' so part file can be only in the sub folder.`,
            severity: vscode.InputBoxValidationSeverity.Error,
          }
        }
        let filePath = name.includes(" ") ? formatPartName(name) : name.length > 0 && !name.trim().endsWith('.dart') ? `${name}.dart` : null
        if (filePath) {
          return {
            message: `The file path will be './${filePath}'`,
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

export async function buildDartFileUri(name: string, workingDirectoryUri: vscode.Uri) {
  let partUri = vscode.Uri.joinPath(workingDirectoryUri, name)
  if (await fileExists(partUri)) {
    const errorMessage = `The '${path.basename(name)}' file already exists.`
    vscode.window.showErrorMessage(errorMessage)
    throw Error(errorMessage)
  }

  return partUri
}

export async function createDartFile(args: { fileUri: vscode.Uri, part?: { filePath: string, partOfFileName: string } }) {
  let part = args.part
  fs.mkdirSync(path.dirname(args.fileUri.fsPath), { recursive: true })

  let file = await fs.promises.open(args.fileUri.fsPath, "w")

  if (part) {
    let splitter = process.platform === "win32" ? "\\" : "/"
    let splittedPartNamePath = part.filePath.split(splitter)
    splittedPartNamePath.pop()
    let partOfName = [...splittedPartNamePath.map((_) => '..'), part.partOfFileName].join(splitter)
    await file.write(`part of '${partOfName}';\n`)
  } else {
    await file.write("")
  }
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
