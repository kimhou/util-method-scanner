const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const XLSX = require('xlsx');
const execAsync = promisify(exec);

async function collectExports(targetPath) {
  let allExports = [];

  if (fs.statSync(targetPath).isDirectory()) {
    if(targetPath.endsWith('node_modules')) {
      return [];
    }
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(targetPath, '**/*.{js,ts,tsx}'));
    for (const file of files) {
      const exports = await getExports(file);
      allExports = allExports.concat(exports);
    }
  } else {
    const exports = await getExports(vscode.Uri.file(targetPath));
    allExports = allExports.concat(exports);
  }
  return allExports;
}

async function getExports(file) {
  const document = await vscode.workspace.openTextDocument(file);
  const text = document.getText();
  const fileName = path.basename(file.fsPath);

  const exports = [];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    if (line.text.includes('export')) {
      const match = line.text.match(/export\s+(function|const|let|var|class)\s+(\w+)/);
      if (match) {
        const methodName = match[2];
        const comment = getLeadingComment(document, i);
        const lastModifiedBy = await getLastModifiedBy(file.fsPath, i + 1);
        const lineCount = getMethodLineCount(document, i);
        exports.push({
          fileName,
          methodName,
          comment,
          lastModifiedBy,
          lineCount
        });
      }
    }
  }

  return exports;
}

function getMethodLineCount(document, startLine) {
  let endLine = startLine;
  let braceCount = 0;
  const totalLines = document.lineCount;

  for (let i = startLine; i < totalLines; i++) {
    const line = document.lineAt(i).text.trim();
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    if (braceCount === 0 && i > startLine) {
      endLine = i;
      break;
    }
  }

  return endLine - startLine + 1;
}

function getLeadingComment(document, lineNumber) {
  let comment = '';
  let currentLine = lineNumber - 1;

  while (currentLine >= 0) {
    const line = document.lineAt(currentLine);
    if (line.text.trim().startsWith('//')) {
      comment = line.text.trim().substring(2) + '\n' + comment;
    } else if (line.text.trim().startsWith('/*') || line.text.trim().startsWith('*')) {
      comment = line.text.trim().replace(/^\/\*|\*\/$|^\*\s?/g, '') + '\n' + comment;
    } else {
      break;
    }
    currentLine--;
  }

  return comment.trim() || '--';
}

async function getLastModifiedBy(filePath, lineNumber) {
  try {
    const { stdout } = await execAsync(`git blame -L ${lineNumber},${lineNumber} --porcelain ${filePath}`);
    const authorMatch = stdout.match(/^author (.+)$/m);
    return authorMatch ? authorMatch[1] : '未知';
  } catch (error) {
    console.error(`获取 ${filePath} 的修改信息时出错:`, error);
    return '未知';
  }
}

function saveToExcel(data, outputPath) {
  console.log(`[saveToExcel start] ${JSON.stringify({outputPath, data})}`);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "导出方法");
  XLSX.writeFile(workbook, outputPath);
}

async function scanUtilMethod({projectName, scanPath, outputPath}) {
  console.log(`[scanUtilMethod start] ${JSON.stringify({scanPath, outputPath})}`);
    let allExports = await collectExports(scanPath);
    allExports = allExports.map(item => ({projectName, ...item}));
    saveToExcel(allExports, outputPath);
    console.log(`导出完成，结果保存在: ${outputPath}`);
    console.log(`扫描的路径: ${scanPath}`);  
}

module.exports = { scanUtilMethod };
