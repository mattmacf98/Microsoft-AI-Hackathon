enum TrieNodeType {
    ROOT,
    STRING,
    INDEX,
}

class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfPath: boolean;
    trieNodeType: TrieNodeType;
    setterCallback: ((path: string, value: any) => void) | undefined;
    getterCallback: ((path: string) => any) | undefined;
    typeName: string | undefined;

    constructor(type: TrieNodeType) {
        this.children = new Map<string, TrieNode>();
        this.isEndOfPath = false;
        this.trieNodeType = type;
    }
}

export class JsonPtrTrie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode(TrieNodeType.ROOT);
    }

    /**
     * Adds a path to the JSON Pointer Trie along with getter and setter callbacks.
     * @param path - The JSON Pointer path to add.
     * @param getterCallback - A callback function to get the value at the specified path.
     * @param setterCallback - A callback function to set the value at the specified path.
     */
    public addPath(
        path: string,
        getterCallback: (path: string) => any,
        setterCallback: (path: string, value: any) => void,
        typeName: string,
    ): void {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length; i++) {
            const pathPiece = pathPieces[i];

            if (!currentNode.children.has(pathPiece)) {
                const type: TrieNodeType = isNaN(Number(pathPiece)) ? TrieNodeType.STRING : TrieNodeType.INDEX;
                let nodeToSet: TrieNode;
                if (type === TrieNodeType.INDEX) {
                    const keys: string[] = Array.from(currentNode.children.keys());
                    const indexOfNodeKey: number = keys
                        .map((key) => currentNode.children.get(key)!.trieNodeType)
                        .indexOf(TrieNodeType.INDEX);
                    if (indexOfNodeKey === -1) {
                        nodeToSet = new TrieNode(TrieNodeType.INDEX);
                    } else {
                        nodeToSet = currentNode.children.get(keys[indexOfNodeKey])!;
                        currentNode.children.delete(keys[indexOfNodeKey]);
                    }
                } else if (type === TrieNodeType.STRING) {
                    nodeToSet = new TrieNode(type);
                } else {
                    throw Error('Invalid Node Type');
                }

                currentNode.children.set(pathPiece, nodeToSet);
                currentNode.isEndOfPath = false;
            }

            currentNode = currentNode.children.get(pathPiece)!;
        }

        currentNode.isEndOfPath = true;
        currentNode.getterCallback = getterCallback;
        currentNode.setterCallback = setterCallback;
        currentNode.typeName = typeName;
    }

    /**
     * Checks if a given JSON Pointer path is valid within the Trie.
     * @param path - The JSON Pointer path to validate.
     * @returns `true` if the path is valid, `false` otherwise.
     */
    public isPathValid(path: string): boolean {
        const leafNode: TrieNode | undefined = this.traversePath(path);
        return leafNode === undefined ? false : leafNode.isEndOfPath;
    }

    /**
     * Retrieves the value at a specified JSON Pointer path.
     * @param path - The JSON Pointer path to retrieve the value from.
     * @returns The value at the specified path.
     */
    public getPathValue(path: string) {
        const node: TrieNode | undefined = this.traversePath(path);
        if (node !== undefined && node.getterCallback !== undefined) {
            return node.getterCallback(path);
        }
    }

    /**
     * Sets the value at a specified JSON Pointer path.
     * @param path - The JSON Pointer path to set the value for.
     * @param value - The value to set at the specified path.
     */
    public setPathValue(path: string, value: any) {
        const node: TrieNode | undefined = this.traversePath(path);
        if (node !== undefined && node.setterCallback !== undefined) {
            return node.setterCallback(path, value);
        }
    }

    /**
     * Retrieves the type name associated with the specified path by traversing the trie.
     *
     * @param path - The path for which to retrieve the type name.
     * @returns The type name associated with the specified path, or undefined if the path is not found.
     */
    public getPathTypeName(path: string) {
        const node: TrieNode = this.traversePath(path)!;
        return node.typeName;
    }

    private traversePath(path: string): TrieNode | undefined {
        const pathPieces = path.split('/');
        let currentNode = this.root;

        for (let i = 0; i < pathPieces.length; i++) {
            const pathPiece = pathPieces[i];

            if (!currentNode.children.has(pathPiece)) {
                if (isNaN(Number(pathPiece))) {
                    return undefined;
                }
                // if it is a number, first the path is valid if the path piece is < the key
                const keys: string[] = Array.from(currentNode.children.keys());
                const numericalKeyIndex = keys
                    .map((key) => currentNode.children.get(key)!.trieNodeType)
                    .indexOf(TrieNodeType.INDEX);
                if (numericalKeyIndex === -1) {
                    return undefined;
                }
                const numericalKey = keys[numericalKeyIndex];
                if (Number(pathPiece) >= Number(numericalKey)) {
                    return undefined;
                }
                currentNode = currentNode.children.get(numericalKey)!;
            } else {
                currentNode = currentNode.children.get(pathPiece)!;
            }
        }

        return currentNode;
    }
}
