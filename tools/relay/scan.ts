// The relay's pre-gate scan. Before the gate runs anything, every source file the writer wrote is read for things a simulation rule
// or its test has no business doing: importing a Node built-in or a package, reaching for process, eval, Function, fetch or
// globalThis, reading import.meta, walking up to the Function constructor through ".constructor", or using "with".
//
// THIS IS NOT CONTAINMENT. The gate runs the writer's code as the owner, unsandboxed. The scan catches accidents and lazy attacks,
// and it is easy to get past: a name assembled from pieces, a property read through a variable, or an alias of a global taken
// before the scan's names are looked at will all go through. A Claude reader then reads the change for anything it missed, and
// that reading, not this file, is what stands between the writer's code and the machine.
//
// Why these rules and not more: in this repository no file under src/ imports a Node built-in, while 38 of 659 test files use fs
// and 7 use child_process. So the default is strict, and a work order grants one file the extra names it needs through
// allowImports (an import specifier, a global name, "import.meta", "constructor", "with" or "computed module specifier").
//
// The scan is syntax only: the installed TypeScript compiler reads the file into a tree, with no type checker and no project, so it
// is fast and needs nothing on disk. Data and documents are not executed and are not scanned.
import ts from 'typescript';
import type { ScanIssue } from './types';

const KINDS: Record<string, ts.ScriptKind> = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.mts': ts.ScriptKind.TS,
  '.cts': ts.ScriptKind.TS,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
};

const GLOBALS: ReadonlySet<string> = new Set([
  'process', 'globalThis', 'global', 'eval', 'Function', 'require', 'Worker', 'SharedArrayBuffer', 'WebAssembly', 'Deno', 'Bun',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', '__dirname', '__filename',
]);

// Calls that load a module by name through the test runner. vi.importActual('node:fs') is as good as import('node:fs'), so each is
// held to the same rule as import(): a string literal first argument, and a non-relative one needs a grant.
const LOADERS: ReadonlySet<string> = new Set(['importActual', 'importMock', 'mock', 'doMock', 'unmock', 'doUnmock']);
// What the test runner injects into a transformed module: its own import functions, reachable without any import statement.
const RUNNER_PREFIXES: readonly string[] = ['__vite_ssr_', '__vitest_', '__vi_'];
// A module name in a string is how a loader not named above would be reached, so a string that begins "node:" is refused wherever
// it stands, unless granted. The bare spelling ("fs", "net") is refused only where a loader takes it: this simulation has a fishing
// net and a stream, and a rule that refused those words as arguments would refuse ordinary tests.

const MAX_SYNTAX_ERRORS = 3;
const COMPUTED = 'computed module specifier';

function extensionOf(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot < 0 ? '' : base.slice(dot).toLowerCase();
}

const shortened = (s: string): string => (s.length > 80 ? `${s.slice(0, 80)}...` : s);

/** True when the identifier is a name being declared, a property key or member name, a label, or an import/export name: not a use of a value. */
function isNameSlot(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  switch (parent.kind) {
    case ts.SyntaxKind.PropertyAccessExpression:
      return (parent as ts.PropertyAccessExpression).name === node;
    case ts.SyntaxKind.QualifiedName:
      return (parent as ts.QualifiedName).right === node;
    case ts.SyntaxKind.ShorthandPropertyAssignment:
      return false;
    case ts.SyntaxKind.BindingElement: {
      const b = parent as ts.BindingElement;
      return b.name === node || b.propertyName === node;
    }
    case ts.SyntaxKind.ImportSpecifier:
    case ts.SyntaxKind.ExportSpecifier: {
      const s = parent as ts.ImportSpecifier | ts.ExportSpecifier;
      return s.name === node || s.propertyName === node;
    }
    case ts.SyntaxKind.LabeledStatement:
      return (parent as ts.LabeledStatement).label === node;
    case ts.SyntaxKind.BreakStatement:
    case ts.SyntaxKind.ContinueStatement:
      return (parent as ts.BreakOrContinueStatement).label === node;
    case ts.SyntaxKind.VariableDeclaration:
    case ts.SyntaxKind.Parameter:
    case ts.SyntaxKind.FunctionDeclaration:
    case ts.SyntaxKind.FunctionExpression:
    case ts.SyntaxKind.ClassDeclaration:
    case ts.SyntaxKind.ClassExpression:
    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.MethodSignature:
    case ts.SyntaxKind.PropertyDeclaration:
    case ts.SyntaxKind.PropertySignature:
    case ts.SyntaxKind.PropertyAssignment:
    case ts.SyntaxKind.GetAccessor:
    case ts.SyntaxKind.SetAccessor:
    case ts.SyntaxKind.EnumDeclaration:
    case ts.SyntaxKind.EnumMember:
    case ts.SyntaxKind.ModuleDeclaration:
    case ts.SyntaxKind.TypeAliasDeclaration:
    case ts.SyntaxKind.InterfaceDeclaration:
    case ts.SyntaxKind.TypeParameter:
    case ts.SyntaxKind.ImportClause:
    case ts.SyntaxKind.NamespaceImport:
    case ts.SyntaxKind.NamespaceExport:
    case ts.SyntaxKind.ImportEqualsDeclaration:
    case ts.SyntaxKind.NamespaceExportDeclaration:
    case ts.SyntaxKind.JsxAttribute:
    case ts.SyntaxKind.NamedTupleMember:
    case ts.SyntaxKind.MetaProperty:
      return (parent as unknown as { name?: ts.Node }).name === node;
    default:
      return false;
  }
}

/** True when the identifier sits inside a type, where nothing runs. `class A extends Function` is a value and is not a type. */
function inTypePosition(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isExpressionWithTypeArguments(n)) {
      const heritage = n.parent;
      return !(ts.isHeritageClause(heritage) && heritage.token === ts.SyntaxKind.ExtendsKeyword && ts.isClassLike(heritage.parent));
    }
    if (ts.isTypeNode(n)) return true;
  }
  return false;
}

const stringValue = (n: ts.Node | undefined): string | null => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

/** Every thing the scan reports about one source file, before the grants are applied. Each entry: line, what, and the name a grant uses. */
function collect(sf: ts.SourceFile): Array<{ line: number; what: string; name: string }> {
  const found: Array<{ line: number; what: string; name: string }> = [];
  const lineOf = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const report = (n: ts.Node, what: string, name: string): void => void found.push({ line: lineOf(n), what, name });

  const checkSpecifier = (at: ts.Node, spec: string): void => {
    const low = spec.toLowerCase();
    if (spec.startsWith('./') || spec.startsWith('../')) {
      if (low.includes('node_modules')) report(at, `imports "${shortened(spec)}" (reaches into node_modules)`, spec);
    } else if (spec !== 'vitest') report(at, `imports "${shortened(spec)}" (not relative, not vitest, not granted)`, spec);
  };
  const checkCall = (at: ts.Node, arg: ts.Node | undefined, via: string): void => {
    const spec = stringValue(arg);
    if (spec === null) report(at, `uses a computed module specifier in ${via}`, COMPUTED);
    else checkSpecifier(arg as ts.Node, spec);
  };

  const checked = new Set<ts.Node>();
  const calleeName = (e: ts.Expression): string | null =>
    ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : ts.isElementAccessExpression(e) ? stringValue(e.argumentExpression) : null;
  /** a string that names a built-in module in its prefixed spelling */
  const checkLiteral = (node: ts.Node, text: string): void => {
    if (checked.has(node)) return;
    if (text.startsWith('node:')) report(node, `has the string "${shortened(text)}" (a Node built-in module name, not granted)`, text);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = stringValue(node.moduleSpecifier);
      if (spec !== null) {
        checked.add(node.moduleSpecifier as ts.Node);
        checkSpecifier(node.moduleSpecifier as ts.Node, spec);
      }
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      checked.add(node.moduleReference.expression);
      checkCall(node.moduleReference, node.moduleReference.expression, 'import = require()');
    } else if (ts.isImportTypeNode(node)) {
      const lit = ts.isLiteralTypeNode(node.argument) ? stringValue(node.argument.literal) : null;
      if (lit !== null) {
        checked.add((node.argument as ts.LiteralTypeNode).literal);
        checkSpecifier(node.argument, lit);
      }
    } else if (ts.isCallExpression(node)) {
      const name = node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'import' : calleeName(node.expression);
      const via = name === 'import' ? 'import()' : name === 'require' && ts.isIdentifier(node.expression) ? 'require()' : null;
      const loader = name !== null && LOADERS.has(name) ? `${name}()` : null;
      if (via !== null || loader !== null) {
        checked.add(node.arguments[0]);
        checkCall(node, node.arguments[0], (via ?? loader) as string);
      }
    } else if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
      report(node, 'reads import.meta', 'import.meta');
    } else if (ts.isWithStatement(node)) {
      report(node, 'uses a "with" statement', 'with');
    } else if (ts.isPropertyAccessExpression(node) && node.name.text === 'constructor') {
      report(node.name, 'reads ".constructor"', 'constructor');
    } else if (ts.isElementAccessExpression(node) && stringValue(node.argumentExpression) === 'constructor') {
      report(node.argumentExpression, 'reads ".constructor"', 'constructor');
    } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      // const { constructor } = x reads the same property without a dot
      const key = node.propertyName ?? node.name;
      const text = ts.isIdentifier(key) ? key.text : ts.isStringLiteral(key) ? key.text : null;
      if (text === 'constructor') report(key, 'reads ".constructor"', 'constructor');
    } else if (ts.isIdentifier(node) && RUNNER_PREFIXES.some((p) => node.text.startsWith(p))) {
      report(node, `uses the test runner's internal "${shortened(node.text)}"`, node.text);
    } else if (ts.isIdentifier(node) && GLOBALS.has(node.text) && !isNameSlot(node) && !inTypePosition(node)) {
      report(node, `uses the global "${node.text}"`, node.text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      checkLiteral(node, node.text);
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (node.text.startsWith('node:')) checkLiteral(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/**
 * What in this file a simulation rule or its test should not be doing, one entry per line and reason, ordered by line and then by
 * text. `allow` holds the names the work order grants this file; an entry silences exactly the issue of that name.
 */
export function scanSource(path: string, text: string, allow: readonly string[]): ScanIssue[] {
  const kind = KINDS[extensionOf(path)];
  if (kind === undefined) return [];
  const granted = new Set(allow);
  const issues = new Map<string, ScanIssue>();
  const add = (line: number, what: string): void => void issues.set(`${line}\u0000${what}`, { path, line, what });

  try {
    scanTree(path, text, kind, granted, add);
  } catch {
    issues.clear();
    // a tree too deep to walk, or a parser that gave up: the caller must refuse the file, not crash on it
    add(1, 'could not be scanned (too deeply nested or not parseable)');
  }
  return [...issues.values()].sort((a, b) => a.line - b.line || (a.what < b.what ? -1 : a.what > b.what ? 1 : 0));
}

function scanTree(path: string, text: string, kind: ts.ScriptKind, granted: ReadonlySet<string>, add: (line: number, what: string) => void): void {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const diagnostics = (sf as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  for (const d of diagnostics.slice(0, MAX_SYNTAX_ERRORS)) {
    const line = d.start === undefined ? 1 : sf.getLineAndCharacterOfPosition(d.start).line + 1;
    add(line, `does not parse: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
  }
  for (const f of collect(sf)) if (!granted.has(f.name)) add(f.line, f.what);
}
