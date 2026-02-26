import type { Monaco } from "@monaco-editor/react";
import type { TableInfo, ColumnDefinition } from "../store/index";

// SQL 关键字列表
const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN",
  "IS", "NULL", "AS", "ON", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER",
  "FULL", "CROSS", "NATURAL", "USING", "GROUP", "BY", "HAVING", "ORDER",
  "ASC", "DESC", "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "INSERT",
  "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "INDEX",
  "VIEW", "DROP", "ALTER", "ADD", "COLUMN", "PRIMARY", "KEY", "FOREIGN",
  "REFERENCES", "CONSTRAINT", "DEFAULT", "UNIQUE", "CHECK", "CASCADE",
  "TRUNCATE", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END", "CAST",
  "COALESCE", "NULLIF", "COUNT", "SUM", "AVG", "MIN", "MAX", "HAVING",
];

// SQL 函数列表
const SQL_FUNCTIONS = [
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NULLIF", "CAST",
  "CONCAT", "SUBSTRING", "LENGTH", "UPPER", "LOWER", "TRIM", "LTRIM",
  "RTRIM", "REPLACE", "ROUND", "FLOOR", "CEIL", "ABS", "NOW", "DATE",
  "TIME", "YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND", "IFNULL",
  "IF", "CASE", "CONVERT", "FORMAT", "GROUP_CONCAT", "JSON_EXTRACT",
];

export interface SchemaCache {
  tables: string[];
  tableInfo: Record<string, TableInfo>;
}

/**
 * 创建 SQL 自动补全提供器
 */
export function createSqlCompletionProvider(
  monaco: Monaco,
  getSchemaCache: () => SchemaCache
) {
  return {
    triggerCharacters: [".", " ", "("],
    provideCompletionItems: (
      model: ReturnType<Monaco["editor"]["createModel"]>,
      position: InstanceType<Monaco["Position"]>
    ) => {
      const cache = getSchemaCache();
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // 获取当前行文本和光标前的文本
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      const suggestions: Array<{
        label: string;
        kind: number;
        insertText: string;
        insertTextRules?: number;
        detail?: string;
        documentation?: string;
        range: typeof range;
        sortText?: string;
      }> = [];

      // 检查是否在表名后面（用于字段补全）
      const tableMatch = textBeforeCursor.match(/(\w+)\.\s*$/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const tableInfo = cache.tableInfo[tableName];
        if (tableInfo) {
          // 添加该表的所有字段
          tableInfo.columns.forEach((col: ColumnDefinition, index: number) => {
            suggestions.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              detail: col.data_type,
              documentation: `Column: ${col.name}\nType: ${col.data_type}\nNullable: ${col.nullable}`,
              range,
              sortText: String(index).padStart(3, "0"),
            });
          });
          return { suggestions };
        }
      }

      // 检查是否在 FROM/JOIN 后面（用于表名补全）
      const fromJoinMatch = textBeforeCursor.match(/\b(FROM|JOIN)\s+$/i);
      if (fromJoinMatch) {
        cache.tables.forEach((table, index) => {
          suggestions.push({
            label: table,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table,
            detail: "Table",
            range,
            sortText: String(index).padStart(3, "0"),
          });
        });
        return { suggestions };
      }

      // 默认补全：关键字 + 表名 + 函数
      // SQL 关键字
      SQL_KEYWORDS.forEach((keyword) => {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          detail: "Keyword",
          range,
          sortText: "1" + keyword,
        });
      });

      // SQL 函数
      SQL_FUNCTIONS.forEach((func) => {
        suggestions.push({
          label: func,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: func + "($0)",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: "Function",
          range,
          sortText: "2" + func,
        });
      });

      // 表名
      cache.tables.forEach((table) => {
        suggestions.push({
          label: table,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: table,
          detail: "Table",
          range,
          sortText: "0" + table,
        });
      });

      // 所有表的字段（带表名前缀）
      Object.entries(cache.tableInfo).forEach(([tableName, info]) => {
        info.columns.forEach((col: ColumnDefinition) => {
          suggestions.push({
            label: `${tableName}.${col.name}`,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: `${tableName}.${col.name}`,
            detail: col.data_type,
            range,
            sortText: "3" + tableName + col.name,
          });
        });
      });

      return { suggestions };
    },
  };
}
