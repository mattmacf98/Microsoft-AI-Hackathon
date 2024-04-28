import { BehaveEngineNode, IValue } from './behaveEngineNode';

/**
 * Interface representing the Behave Engine, which provides methods for interacting with a behavioral graph engine.
 */
export interface IBehaveEngine {
    /**
     * Register known pointers to be used within the Behave Engine.
     */
    registerKnownPointers: () => void;

    /**
     * Register a JSON pointer along with callback functions for getting and setting its value.
     * @param jsonPtr - The JSON pointer string.
     * @param getterCallback - A callback function to get the value at the specified JSON pointer path.
     * @param setterCallback - A callback function to set the value at the specified JSON pointer path.
     * @param typeName -  The type located at this pointer
     */
    registerJsonPointer: (
        jsonPtr: string,
        getterCallback: (path: string) => any,
        setterCallback: (path: string, value: any) => void,
        typeName: string,
    ) => void;

    /**
     * Register a Behave Engine node type along with its corresponding class.
     * @param type - The type of the Behave Engine node.
     * @param behaveEngineNode - The class representing the Behave Engine node.
     */
    registerBehaveEngineNode: (type: string, behaveEngineNode: typeof BehaveEngineNode) => void;

    /**
     * Animate a property over time using specified values.
     * @param path - The property path to be animated.
     * @param easingParameters - Easing type and the easing type specific parameters to preform the easing function
     * @param callback - A callback function to be executed after the animation is complete.
     */
    animateProperty: (path: string, easingParameters: any, callback: () => void) => void;

    /**
     * Clear all custom event listeners.
     */
    clearCustomEventListeners: () => void;

    /**
     * Add a custom event listener with a specified name and callback function.
     * @param name - The name of the custom event.
     * @param func - The callback function to be executed when the custom event is triggered.
     */
    addCustomEventListener: (name: string, func: any) => void;

    /**
     * Load a Behave graph into the Behave Engine.
     * @param behaveGraph - The Behave graph to be loaded.
     */
    loadBehaveGraph: (behaveGraph: any) => void;

    /**
     * Emit a custom event with a specified name and values.
     * @param name - The name of the custom event to emit.
     * @param params - The values to be passed to the custom event callback functions.
     */
    emitCustomEvent: (name: string, vals: any) => void;

    /**
     * Set the value of a specified path.
     * @param path - The path to set the value for.
     * @param targetValue - The value to set at the specified path.
     */
    setPathValue: (path: string, targetValue: any) => void;

    /**
     * Retrieves the value associated with a specific path.
     *
     * @param {string} path - The path to the desired value.
     * @returns {any} The value found at the specified path.
     */
    getPathValue: (path: string) => any;

    /**
     * Retrieves the type name associated with a specific path.
     *
     * @param {string} path - The path to the desired type name.
     * @returns {any} The type name found at the specified path.
     */
    getPathtypeName: (path: string) => any;

    /**
     * Clears the cache used for value evaluations.
     */
    clearValueEvaluationCache: () => void;

    /**
     * Adds an entry to the value evaluation cache.
     *
     * @param {string} key - The cache key for the entry.
     * @param {IValue} val - The value to be cached.
     */
    addEntryToValueEvaluationCache: (key: string, val: IValue) => void;

    /**
     * Retrieves the cached value associated with a specific key from the value evaluation cache.
     *
     * @param {string} key - The cache key for the desired value.
     * @returns {IValue | undefined} The cached value or undefined if not found.
     */
    getValueEvaluationCacheValue: (key: string) => IValue | undefined;

    /**
     * Sets the animation path for the world and associates it with a cancelable operation.
     *
     * @param path - The path for the world animation.
     * @param cancelable - An optional cancelable object that allows interrupting the animation. set as undefined to cancel any current world set animation
     * @returns void
     */
    setWorldAnimationPathCallback: (path: string, cancelable: ICancelable | undefined) => void;

    /**
     * Retrieves the animation path callback associated with the specified path.
     *
     * @param path - The path for which to retrieve the animation path callback.
     * @returns The cancelable object associated with the animation path, if found; otherwise, undefined.
     */
    getWorldAnimationPathCallback: (path: string) => ICancelable | undefined;

    /**
     * Adds a new node to the scene based on the provided URI and parent node index.
     *
     * @param uri - The URI specifying the node to be added to the scene.
     * @param parentNodeIndex - The index of the parent node in the scene hierarchy to add the loaded model to.
     * @param callback - A callback function invoked with the index of the newly added node.
     * @returns A Promise that resolves once the node is added to the scene.
     */
    addNodeToScene: (uri: string, parentNodeIndex: number, callback: (index: number) => void) => Promise<void>;

    /**
     * Retrieves the world object.
     *
     * @returns An object representing the current state of the world.
     */
    world: () => any;
}

export interface ICancelable {
    cancel: () => void;
}
