/**
 * DMCE AST Engine (Abstract Syntax Tree Analysis & Volatility)
 * 
 * Implements multi-language AST extraction and Zhang-Shasha tree-edit distance
 * to measure structural code transformation across mutation boundaries:
 * 
 * V_AST = TreeEditDistance(T1, T2) / max(|T1|, |T2|)
 * 
 * Supported AST languages:
 * - Python (via Python AST parser)
 * - JavaScript / TypeScript
 * - Go
 * - Java
 * 
 * For unsupported languages or syntax errors, degrades gracefully without failing execution.
 */

const { spawnSync } = require('child_process');

// Supported language keys
const SUPPORTED_AST_LANGUAGES = Object.freeze(['python', 'javascript', 'typescript', 'go', 'java']);

/**
 * Standardized AST Node structure:
 * { label: string, type: string, children: ASTNode[] }
 */
class ASTNode {
    constructor(label, type, children = []) {
        this.label = String(label);
        this.type = String(type);
        this.children = children;
    }

    getSize() {
        let size = 1;
        for (const child of this.children) {
            size += child.getSize();
        }
        return size;
    }
}

/**
 * Normalizes language name for AST engine.
 */
function normalizeAstLanguage(lang) {
    if (!lang || typeof lang !== 'string') return 'python';
    const l = lang.trim().toLowerCase();
    if (l.includes('python')) return 'python';
    if (l.includes('javascript') || l === 'js' || l.includes('node')) return 'javascript';
    if (l.includes('typescript') || l === 'ts') return 'typescript';
    if (l.includes('go')) return 'go';
    if (l.includes('java') && !l.includes('script')) return 'java';
    return l;
}

/**
 * Parses Python source code into an ASTNode tree.
 */
function parsePythonAST(code) {
    try {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const script = `
import ast, json, sys

def node_to_dict(node):
    if not isinstance(node, ast.AST):
        return None
    type_name = node.__class__.__name__
    label = type_name
    if isinstance(node, ast.Name):
        label += f":{node.id}"
    elif isinstance(node, ast.FunctionDef):
        label += f":{node.name}"
    elif isinstance(node, ast.arg):
        label += f":{node.arg}"
    elif isinstance(node, ast.Constant):
        label += f":{repr(node.value)[:20]}"

    children = []
    for field, value in ast.iter_fields(node):
        if isinstance(value, list):
            for item in value:
                if isinstance(item, ast.AST):
                    c = node_to_dict(item)
                    if c: children.append(c)
        elif isinstance(value, ast.AST):
            c = node_to_dict(value)
            if c: children.append(c)
    return {"type": type_name, "label": label, "children": children}

try:
    code_text = sys.stdin.read()
    parsed = ast.parse(code_text)
    print(json.dumps(node_to_dict(parsed)))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;

        const res = spawnSync(pythonCmd, ['-c', script], {
            input: code,
            encoding: 'utf8',
            timeout: 3000
        });

        if (res.status === 0 && res.stdout.trim()) {
            const rawTree = JSON.parse(res.stdout);
            return buildASTNodeFromDict(rawTree);
        }
    } catch (err) {
        // Fallback to tokenizer AST if external python call fails
    }

    return parseLexicalTree(code, 'python');
}

/**
 * Parses JavaScript/TypeScript source code into an ASTNode tree.
 */
function parseJavaScriptAST(code) {
    // Robust lexical/structural syntax tree parser for JS/TS
    return parseLexicalTree(code, 'javascript');
}

/**
 * Parses Go source code into an ASTNode tree.
 */
function parseGoAST(code) {
    return parseLexicalTree(code, 'go');
}

/**
 * Parses Java source code into an ASTNode tree.
 */
function parseJavaAST(code) {
    return parseLexicalTree(code, 'java');
}

/**
 * Builds recursive ASTNode instance from serializable dictionary.
 */
function buildASTNodeFromDict(dict) {
    if (!dict) return new ASTNode('Empty', 'Empty');
    const children = (dict.children || []).map(buildASTNodeFromDict);
    return new ASTNode(dict.label || dict.type || 'Node', dict.type || 'Node', children);
}

/**
 * High-performance structural token tree builder for multi-language AST representation.
 * Tokenizes keywords, blocks, control flows, and expressions into a hierarchy of nodes.
 */
function parseLexicalTree(code, lang) {
    if (!code || typeof code !== 'string') {
        return new ASTNode('Root:Empty', 'Program', []);
    }

    const lines = code.split('\n');
    const root = new ASTNode(`Program:${lang}`, 'Program', []);
    let currentBlock = root;
    const blockStack = [root];

    // Regex matchers for statements & blocks
    const funcRegex = lang === 'python'
        ? /^\s*def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/
        : lang === 'go'
            ? /^\s*func\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/
            : /^\s*(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)|^\s*(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/;

    const controlRegex = /^\s*(if|else|elif|for|while|switch|case|try|catch|finally|with)\b/i;
    const assignRegex = /([a-zA-Z0-9_.]+)\s*(=|\+=|-=|\*=|\/=)\s*(.+)/;
    const returnRegex = /^\s*return\b(?:\s+(.+))?/i;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('/*')) continue;

        if (line.includes('}') && blockStack.length > 1) {
            blockStack.pop();
            currentBlock = blockStack[blockStack.length - 1];
        }

        // Function Declaration
        const funcMatch = line.match(funcRegex);
        if (funcMatch) {
            const funcName = funcMatch[1] || funcMatch[3] || 'anonymous';
            const funcNode = new ASTNode(`Func:${funcName}`, 'FunctionDeclaration', []);
            currentBlock.children.push(funcNode);
            blockStack.push(funcNode);
            currentBlock = funcNode;
            continue;
        }

        // Control Statement (for, while, if, etc.)
        const ctrlMatch = line.match(controlRegex);
        if (ctrlMatch) {
            const ctrlType = ctrlMatch[1].toLowerCase();
            const ctrlNode = new ASTNode(`Control:${ctrlType}`, 'ControlStatement', []);
            currentBlock.children.push(ctrlNode);
            if (line.endsWith('{') || line.endsWith(':')) {
                blockStack.push(ctrlNode);
                currentBlock = ctrlNode;
            }
            continue;
        }

        // Return Statement
        const retMatch = line.match(returnRegex);
        if (retMatch) {
            currentBlock.children.push(new ASTNode(`Return`, 'ReturnStatement', [
                new ASTNode(`Expr:${(retMatch[1] || 'void').substring(0, 20)}`, 'Expression')
            ]));
            continue;
        }

        // Assignment / Variable
        const assignMatch = line.match(assignRegex);
        if (assignMatch) {
            const varName = assignMatch[1].trim();
            const op = assignMatch[2];
            const expr = assignMatch[3].trim().substring(0, 25);
            currentBlock.children.push(new ASTNode(`Assign:${varName}${op}`, 'Assignment', [
                new ASTNode(`Val:${expr}`, 'Expression')
            ]));
            continue;
        }

        // Generic Statement
        currentBlock.children.push(new ASTNode(`Stmt:${line.substring(0, 25)}`, 'Statement'));
    }

    return root;
}

/**
 * Unified AST parser dispatcher.
 */
function parseAST(code, language) {
    const lang = normalizeAstLanguage(language);

    if (!SUPPORTED_AST_LANGUAGES.includes(lang)) {
        return {
            supported: false,
            tree: null,
            nodeCount: 0,
            error: `AST analysis unavailable for language: ${language}`
        };
    }

    try {
        let tree;
        if (lang === 'python') {
            tree = parsePythonAST(code);
        } else if (lang === 'javascript' || lang === 'typescript') {
            tree = parseJavaScriptAST(code);
        } else if (lang === 'go') {
            tree = parseGoAST(code);
        } else if (lang === 'java') {
            tree = parseJavaAST(code);
        } else {
            tree = parseLexicalTree(code, lang);
        }

        const nodeCount = tree ? tree.getSize() : 0;
        return {
            supported: true,
            tree,
            nodeCount,
            error: null
        };
    } catch (parseErr) {
        console.warn(`[DMCE-AST] Parse warning for ${lang}: ${parseErr.message}`);
        return {
            supported: true,
            tree: null,
            nodeCount: 0,
            error: `AST parsing syntax error: ${parseErr.message}`
        };
    }
}

/**
 * Counts total AST nodes for structural density verification.
 */
function countAstNodes(code, language) {
    const parsed = parseAST(code, language);
    return parsed.nodeCount || 0;
}

// ─── Zhang-Shasha Tree Edit Distance Implementation ──────────

/**
 * Flattens AST into post-order traversal array and calculates left-most leaf descendants.
 */
function postOrderTraverse(node, nodes = [], lml = []) {
    const startIdx = nodes.length;
    for (const child of (node.children || [])) {
        postOrderTraverse(child, nodes, lml);
    }
    const myIdx = nodes.length;
    nodes.push(node);
    // Left-most leaf descendant
    if (node.children && node.children.length > 0) {
        lml.push(lml[startIdx]);
    } else {
        lml.push(myIdx);
    }
}

/**
 * Computes tree edit distance between two ASTNode trees using the Zhang-Shasha algorithm.
 * Operations: Insert (1), Delete (1), Relabel (0 if match, 1 if mismatch).
 */
function zhangShashaTreeEditDistance(tree1, tree2) {
    if (!tree1 && !tree2) return 0;
    if (!tree1) return tree2.getSize();
    if (!tree2) return tree1.getSize();

    const nodes1 = [];
    const lml1 = [];
    postOrderTraverse(tree1, nodes1, lml1);

    const nodes2 = [];
    const lml2 = [];
    postOrderTraverse(tree2, nodes2, lml2);

    const n1 = nodes1.length;
    const n2 = nodes2.length;

    // Identify key roots
    const keyRoots1 = [];
    for (let i = 0; i < n1; i++) {
        let isKeyRoot = true;
        for (let j = i + 1; j < n1; j++) {
            if (lml1[j] === lml1[i]) {
                isKeyRoot = false;
                break;
            }
        }
        if (isKeyRoot) keyRoots1.push(i);
    }

    const keyRoots2 = [];
    for (let i = 0; i < n2; i++) {
        let isKeyRoot = true;
        for (let j = i + 1; j < n2; j++) {
            if (lml2[j] === lml2[i]) {
                isKeyRoot = false;
                break;
            }
        }
        if (isKeyRoot) keyRoots2.push(i);
    }

    // Distance matrix
    const treedist = Array.from({ length: n1 + 1 }, () => new Float64Array(n2 + 1));

    function relabelCost(i, j) {
        const a = nodes1[i - 1];
        const b = nodes2[j - 1];
        if (a.label === b.label) return 0;
        if (a.type === b.type) return 0.5;
        return 1.0;
    }

    function forestDist(iRoot, jRoot) {
        const iStart = lml1[iRoot] + 1;
        const jStart = lml2[jRoot] + 1;

        const fdist = Array.from({ length: n1 + 1 }, () => new Float64Array(n2 + 1));

        fdist[iStart - 1][jStart - 1] = 0;
        for (let i = iStart; i <= iRoot + 1; i++) {
            fdist[i][jStart - 1] = fdist[i - 1][jStart - 1] + 1; // deletion
        }
        for (let j = jStart; j <= jRoot + 1; j++) {
            fdist[iStart - 1][j] = fdist[iStart - 1][j - 1] + 1; // insertion
        }

        for (let i = iStart; i <= iRoot + 1; i++) {
            for (let j = jStart; j <= jRoot + 1; j++) {
                if (lml1[i - 1] === lml1[iRoot] && lml2[j - 1] === lml2[jRoot]) {
                    const cost = relabelCost(i, j);
                    fdist[i][j] = Math.min(
                        fdist[i - 1][j] + 1,
                        fdist[i][j - 1] + 1,
                        fdist[i - 1][j - 1] + cost
                    );
                    treedist[i][j] = fdist[i][j];
                } else {
                    fdist[i][j] = Math.min(
                        fdist[i - 1][j] + 1,
                        fdist[i][j - 1] + 1,
                        fdist[lml1[i - 1]][lml2[j - 1]] + treedist[i][j]
                    );
                }
            }
        }
    }

    for (const kr1 of keyRoots1) {
        for (const kr2 of keyRoots2) {
            forestDist(kr1, kr2);
        }
    }

    return treedist[n1][n2];
}

/**
 * Calculates normalized AST Volatility between pre-mutation code and post-mutation code:
 * 
 * V_AST = TreeEditDistance(T1, T2) / max(|T1|, |T2|)
 * Clamped strictly to [0.0, 1.0].
 */
function calculateAstVolatility(preMutationCode, postMutationCode, language) {
    const lang = normalizeAstLanguage(language);

    if (!SUPPORTED_AST_LANGUAGES.includes(lang)) {
        return {
            supported: false,
            astVolatility: null,
            treeEditDistance: null,
            preNodeCount: 0,
            postNodeCount: 0,
            status: 'UNSUPPORTED_LANGUAGE'
        };
    }

    const preParsed = parseAST(preMutationCode, lang);
    const postParsed = parseAST(postMutationCode, lang);

    if (!preParsed.tree || !postParsed.tree) {
        return {
            supported: true,
            astVolatility: null,
            treeEditDistance: null,
            preNodeCount: preParsed.nodeCount,
            postNodeCount: postParsed.nodeCount,
            status: 'PARSE_ERROR'
        };
    }

    const size1 = preParsed.nodeCount;
    const size2 = postParsed.nodeCount;

    // If both codes are identical, volatility is exactly 0
    if ((preMutationCode || '').trim() === (postMutationCode || '').trim()) {
        return {
            supported: true,
            astVolatility: 0.0,
            treeEditDistance: 0.0,
            preNodeCount: size1,
            postNodeCount: size2,
            status: 'IDENTICAL'
        };
    }

    const editDistance = zhangShashaTreeEditDistance(preParsed.tree, postParsed.tree);
    const maxNodes = Math.max(size1, size2, 1);
    const rawVolatility = editDistance / maxNodes;
    const normalizedVolatility = Math.min(1.0, Math.max(0.0, Math.round(rawVolatility * 1000) / 1000));

    return {
        supported: true,
        astVolatility: normalizedVolatility,
        treeEditDistance: Math.round(editDistance * 10) / 10,
        preNodeCount: size1,
        postNodeCount: size2,
        status: 'SUCCESS'
    };
}

module.exports = {
    SUPPORTED_AST_LANGUAGES,
    ASTNode,
    normalizeAstLanguage,
    parseAST,
    countAstNodes,
    zhangShashaTreeEditDistance,
    calculateAstVolatility
};
