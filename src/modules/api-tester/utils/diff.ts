// 响应对比工具

export interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  lineNum?: { left?: number; right?: number };
}

export function diffText(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const result: DiffLine[] = [];
  
  // 简单 LCS diff
  const lcs = computeLCS(leftLines, rightLines);
  let li = 0, ri = 0, lcsIdx = 0;
  
  while (li < leftLines.length || ri < rightLines.length) {
    if (lcsIdx < lcs.length && li < leftLines.length && leftLines[li] === lcs[lcsIdx]) {
      if (ri < rightLines.length && rightLines[ri] === lcs[lcsIdx]) {
        result.push({ type: 'same', content: lcs[lcsIdx], lineNum: { left: li + 1, right: ri + 1 } });
        li++; ri++; lcsIdx++;
      } else {
        result.push({ type: 'added', content: rightLines[ri], lineNum: { right: ri + 1 } });
        ri++;
      }
    } else if (li < leftLines.length) {
      result.push({ type: 'removed', content: leftLines[li], lineNum: { left: li + 1 } });
      li++;
    } else if (ri < rightLines.length) {
      result.push({ type: 'added', content: rightLines[ri], lineNum: { right: ri + 1 } });
      ri++;
    }
  }
  
  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i-1] === b[j-1]) { result.unshift(a[i-1]); i--; j--; }
    else if (dp[i-1][j] > dp[i][j-1]) i--;
    else j--;
  }
  return result;
}

export function diffJson(left: any, right: any): DiffLine[] {
  const leftStr = JSON.stringify(left, null, 2);
  const rightStr = JSON.stringify(right, null, 2);
  return diffText(leftStr, rightStr);
}
