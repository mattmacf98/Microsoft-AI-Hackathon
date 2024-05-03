import { BehaveEngineNode, IBehaviourNodeProps, ICustomEvent, IFlow, IValue, IVariable } from './behaveEngineNode';
import { IBehaveEngine, ICancelable } from './IBehaveEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { easeFloat, easeFloat3, easeFloat4 } from './easingUtils';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { JsonPtrTrie } from './jsonPtrTrie';
import { Node } from '@babylonjs/core/node';
import { Receive } from './nodes/customEvent/receive';
import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Send } from './nodes/customEvent/send';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PointerAnimateTo } from './nodes/pointer/pointerAnimateTo';
import {ArcRotateCamera, AssetContainer} from "@babylonjs/core";
import {KHR_materials_variants} from "@babylonjs/loaders/glTF/2.0";
import {PointerSet} from "./nodes/pointer/pointerSet";
import {VariableSet} from "./nodes/variable/variableSet";
import {VariableGet} from "./nodes/variable/variableGet";
import {Add} from "./nodes/math/add";
import {Equality} from "./nodes/math/equality";
import {Select} from "./nodes/math/select";

export interface ICustomEventListener {
    type: string;
    callback: any;
}

export interface IEventQueueItem {
    behaveNode: BehaveEngineNode;
    inSocketId?: string;
}

export class BasicBehaveEngine implements IBehaveEngine {
    private readonly _customEventListeners: ICustomEventListener[];
    private readonly _registry: Map<string, any>;
    private readonly _idToBehaviourNodeMap: Map<number, BehaveEngineNode>;
    private readonly _eventQueue: IEventQueueItem[];
    private readonly _fps: number;
    private _scene: Scene;
    private _world: any;
    private _onTickNodeIndex: number;
    private _lastTickTime: number;
    private _nodes: any[];
    private _variables: IVariable[];
    private _customEvents: ICustomEvent[];
    private _jsonPtrTrie: JsonPtrTrie;
    private _valueEvaluationCache: Map<string, IValue>;
    private _pathToWorldAnimationCallback: Map<string, ICancelable>;
    private _canvas: HTMLCanvasElement;

    constructor(fps: number, scene: Scene) {
        this._scene = scene;
        this._canvas = this._scene.getEngine().getRenderingCanvas()!;
        this._registry = new Map<string, any>();
        this._idToBehaviourNodeMap = new Map<number, BehaveEngineNode>();
        this._jsonPtrTrie = new JsonPtrTrie();
        this._fps = fps;
        this._valueEvaluationCache = new Map<string, IValue>();
        this._pathToWorldAnimationCallback = new Map<string, ICancelable>();
        this._onTickNodeIndex = -1;
        this._lastTickTime = 0;
        this._eventQueue = [];
        this._variables = [];
        this._customEvents = [];
        this._nodes = [];
        this._customEventListeners = [];

        this.registerKnownBehaviorNodes();
    }

    get registry(): Map<string, any> {
        return this._registry;
    }

    get world(): any {
        return this._world;
    }

    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }


    get customEvents(): ICustomEvent[] {
        return this._customEvents;
    }

    set world(value: any) {
        this._world = value;
    }

    public refreshBehaveGraphEngine = (container: AssetContainer, scene:Scene) => {
        this._scene = scene;
        const behaveGraph = this.extractBehaveGraphFromScene();
        if (behaveGraph) {
            const rootNode: Node = container.rootNodes[0];
            console.log(behaveGraph);
            console.log(container.rootNodes)
            this.world = { glTFNodes: this.buildGlTFNodeLayout(rootNode) };
            console.log(this.world)
            this.registerKnownPointers();
            this.loadBehaveGraph(behaveGraph);
        }
    };

    public clearValueEvaluationCache = (): void => {
        this._valueEvaluationCache.clear();
    };

    public addEntryToValueEvaluationCache = (key: string, val: IValue): void => {
        this._valueEvaluationCache.set(key, val);
    };

    public getValueEvaluationCacheValue = (key: string): IValue | undefined => {
        return this._valueEvaluationCache.get(key);
    };

    public registerJsonPointer = (
        jsonPtr: string,
        getterCallback: (path: string) => any,
        setterCallback: (path: string, value: any) => void,
        typeName: string,
    ): void => {
        this._jsonPtrTrie.addPath(jsonPtr, getterCallback, setterCallback, typeName);
    };

    public isValidJsonPtr = (jsonPtr: string): boolean => {
        return this._jsonPtrTrie.isPathValid(jsonPtr);
    };

    public getPathValue = (path: string) => {
        return this._jsonPtrTrie.getPathValue(path);
    };

    public getPathtypeName = (path: string) => {
        return this._jsonPtrTrie.getPathTypeName(path);
    };

    public setPathValue = (path: string, value: any) => {
        this._jsonPtrTrie.setPathValue(path, value);
    };

    public addCustomEventListener = (name: string, func: any) => {
        document.addEventListener(name, func);
        this._customEventListeners.push({ type: name, callback: func });
    };

    public emitCustomEvent = (name: string, vals: any) => {
        const ev = new CustomEvent(name, { detail: vals });
        document.dispatchEvent(ev);
    };

    public clearCustomEventListeners = () => {
        for (const customEventListener of this._customEventListeners) {
            document.removeEventListener(customEventListener.type, customEventListener.callback);
        }
    };

    public loadBehaveGraph = (behaveGraph: any) => {
        try {
            this.validateGraph(behaveGraph);
        } catch (e) {
            throw new Error(`The graph is invalid ${e}`);
        }

        this._nodes = behaveGraph.nodes;
        this._variables = behaveGraph.variables;
        this._customEvents = behaveGraph.customEvents;

        const defaultProps = {
            idToBehaviourNodeMap: this._idToBehaviourNodeMap,
            variables: this._variables,
            customEvents: this._customEvents,
        };

        let index = 0;
        this._nodes.forEach((node) => {
            const behaviourNodeProps: IBehaviourNodeProps = {
                ...defaultProps,
                flows: node.flows,
                values: node.values,
                configuration: node.configuration,
                variables: behaveGraph.variables,
                types: behaveGraph.types,
                graphEngine: this,
                addEventToWorkQueue: this.addEventToWorkQueue,
            };
            if (this._registry.get(node.type) === undefined) {
                throw Error(`Unrecognized node type ${node.type}`);
            }
            const behaviourNode: BehaveEngineNode = this._registry.get(node.type).init(behaviourNodeProps);
            this._idToBehaviourNodeMap.set(index, behaviourNode);
            index++;
        });

        //find start node, and start graph
        const startNodeIndex = this._nodes.map((node) => node.type).indexOf('lifecycle/onStart');
        this._onTickNodeIndex = this._nodes.map((node) => node.type).indexOf('lifecycle/onTick');
        if (startNodeIndex !== -1) {
            const startFlow: IFlow = { node: startNodeIndex, id: 'start' };
            this.addEventToWorkQueue(startFlow);
        } else if (this._onTickNodeIndex !== -1) {
            const tickFlow: IFlow = { node: this._onTickNodeIndex, id: 'tick' };
            this.addEventToWorkQueue(tickFlow);
        }
    };

    public registerKnownPointers = () => {
        this.registerJsonPointer(
            '/nodes/99/scale',
            (path) => {
                const parts: string[] = path.split('/');
                return [
                    (this._world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.x,
                    (this._world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.y,
                    (this._world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling.z,
                ];
            },
            (path, value) => {
                const parts: string[] = path.split('/');
                (this._world.glTFNodes[Number(parts[2])] as AbstractMesh).scaling = new Vector3(
                    value[0],
                    value[1],
                    value[2],
                );
            },
            'float3',
        );

        this.registerJsonPointer(`/KHR_materials_variants/variant`, (path) => {
            let root = this.world.glTFNodes[0];
            while (root.parent) {
                root = root.parent;
            }
            const variants = KHR_materials_variants.GetAvailableVariants(root);
            const selectedVariant = KHR_materials_variants.GetLastSelectedVariant(root);
            return variants.indexOf(selectedVariant as string);
        }, (path, value) => {
            let root = this.world.glTFNodes[0];
            while (root.parent) {
                root = root.parent;
            }
            const variants = KHR_materials_variants.GetAvailableVariants(root);
            KHR_materials_variants.SelectVariant(root, variants[value]);
        }, "int");

        this.registerJsonPointer(
            '/activeCamera/position',
            (path) => {
                const camPosition: Vector3 | undefined = this._scene.activeCamera?.position;
                if (camPosition) {
                    return [camPosition.x, camPosition.y, camPosition.z];
                } else {
                    return [0, 0, 0];
                }
            },
            (path, value) => {
                const activeCamera = this._scene.activeCamera;
                if (activeCamera !== null) {
                    activeCamera.position.set(value[0], value[1], value[2]);
                    (activeCamera as ArcRotateCamera).rebuildAnglesAndRadius();
                }
            },
            'float3',
        );
    };

    public addNodeToScene = async (
        uri: string,
        parentNodeIndex: number,
        callback: (index: number) => void,
    ): Promise<void> => {
        const sc = await SceneLoader.ImportMeshAsync('', uri, '', this._scene);

        const mesh: AbstractMesh = sc.meshes[0];
        const index = this._world.glTFNodes.length;
        mesh.id = `node${index}`;
        this._world.glTFNodes.push(mesh);

        if (Number(parentNodeIndex) !== -1) {
            mesh.setParent(this._scene.meshes[Number(parentNodeIndex)]);
        }

        callback(index);
    };

    public getWorldAnimationPathCallback(path: string): ICancelable | undefined {
        return this._pathToWorldAnimationCallback.get(path);
    }

    public setWorldAnimationPathCallback(path: string, cancelable: ICancelable | undefined): void {
        if (cancelable === undefined) {
            this._pathToWorldAnimationCallback.delete(path);
        } else {
            this._pathToWorldAnimationCallback.set(path, cancelable);
        }
    }

    public animateProperty = (path: string, easingParameters: any, callback: () => void) => {
        this.getWorldAnimationPathCallback(path)?.cancel();
        const startTime = Date.now();

        const action = async () => {
            const elapsedDuration = (Date.now() - startTime) / 1000;
            const t = Math.min(elapsedDuration / easingParameters.easingDuration, 1);
            if (easingParameters.valueType === 'float3') {
                const v = easeFloat3(t, easingParameters);
                this.setPathValue(path, v);
            } else if (easingParameters.valueType === 'float4') {
                this.setPathValue(path, easeFloat4(t, easingParameters));
            } else if (easingParameters.valueType === 'float') {
                this.setPathValue(path, easeFloat(t, easingParameters));
            }

            if (elapsedDuration >= easingParameters.easingDuration) {
                this.setPathValue(path, easingParameters.targetValue);
                this._scene.unregisterBeforeRender(action);
                callback();
            }
        };

        this._scene.registerBeforeRender(action);
        const cancel = () => {
            this._scene.unregisterBeforeRender(action);
            this.setWorldAnimationPathCallback(path, undefined);
        };
        this.setWorldAnimationPathCallback(path, { cancel: cancel });
    };

    public extractBehaveGraphFromScene = (): any => {
        if (
            (this._scene as never)['extras'] === undefined ||
            (this._scene as never)['extras']['behaveGraph'] === undefined
        ) {
            console.info('No behavior found in scene');
            return;
        }

        return (this._scene as never)['extras']['behaveGraph'];
    };

    public registerBehaveEngineNode = (type: string, behaviorNode: typeof BehaveEngineNode) => {
        if (this._registry.has(type)) {
            console.warn(`Behavior node ${type} is already registered and will be overwritten`);
        }
        this._registry.set(type, behaviorNode);
    };

    public addEventToWorkQueue = (flow: IFlow) => {
        if (flow === undefined || flow.node === undefined) {
            return;
        }
        const nextNode: BehaveEngineNode | undefined = this._idToBehaviourNodeMap.get(flow.node);

        if (nextNode === undefined) {
            return;
        }
        const nodeToPush = this._idToBehaviourNodeMap.get(flow.node)!;

        this._eventQueue.push({ behaveNode: nodeToPush, inSocketId: flow.socket });

        // if only one event in queue, start it
        if (this._eventQueue.length === 1) {
            this.executeNextEvent();
        }
    };

    private registerKnownBehaviorNodes = () => {
        this.registerBehaveEngineNode('pointer/animateTo', PointerAnimateTo);
        this.registerBehaveEngineNode('pointer/set', PointerSet);
        this.registerBehaveEngineNode('customEvent/send', Send);
        this.registerBehaveEngineNode('customEvent/receive', Receive);
        this.registerBehaveEngineNode('variable/set', VariableSet);
        this.registerBehaveEngineNode('variable/get', VariableGet);
        this.registerBehaveEngineNode('math/add', Add);
        this.registerBehaveEngineNode('math/eq', Equality);
        this.registerBehaveEngineNode('math/select', Select)
    };

    private buildGlTFNodeLayout = (rootNode: Node): Node[] => {
        const pattern = /^\/nodes\/\d+$/;
        const finalNodes: TransformNode[] = [];
        const seenNodeIndices: Set<number> = new Set<number>();

        function traverse(node: TransformNode) {
            if (node._internalMetadata !== undefined) {
                node.metadata.nodePointer = node._internalMetadata.gltf.pointers.find((pointer: string) =>
                    pattern.test(pointer),
                );
                if (node.metadata.nodePointer != null) {
                    const nodeIndex = Number(node.metadata.nodePointer.split('/')[2]);
                    if (!seenNodeIndices.has(nodeIndex)) {
                        seenNodeIndices.add(nodeIndex);
                        node.metadata.nodeIndex = nodeIndex;
                        finalNodes.push(node);
                    }
                }
            }

            if (node.getChildTransformNodes()) {
                for (const childNode of node.getChildTransformNodes()) {
                    traverse(childNode);
                }
            }
        }

        rootNode.getChildren<TransformNode>().forEach((child: TransformNode) => traverse(child));

        finalNodes.sort((a, b) => a.metadata.nodeIndex - b.metadata.nodeIndex);
        return finalNodes;
    };

    private validateGraph = (behaviorGraph: any) => {
        const nodes: BehaveEngineNode[] = behaviorGraph.nodes;

        let index = 0;
        for (const node of nodes) {
            // for each node, ensure that it's values do not reference a later node
            if (node.values !== undefined) {
                for (const key of Object.keys(node.values)) {
                    if (node.values[key].node !== undefined) {
                        if (Number(node.values[key].node) >= index) {
                            throw Error(`Invalid reference, node ${index} references ${node.values[key].node}`);
                        }
                    }
                }
            }

            index++;
        }
    };

    private executeNextEvent = () => {
        while (this._eventQueue.length > 0) {
            const eventToStart = this._eventQueue[0];
            eventToStart.behaveNode.processNode(eventToStart.inSocketId);
            this._eventQueue.splice(0, 1);
        }

        if (this._onTickNodeIndex !== -1) {
            const timeNow = Date.now();
            const timeSinceLastTick = timeNow - this._lastTickTime;
            setTimeout(() => {
                const tickFlow: IFlow = { node: this._onTickNodeIndex, id: 'tick' };
                this.addEventToWorkQueue(tickFlow);
                this._lastTickTime = timeNow;
            }, Math.max(1000 / this._fps - timeSinceLastTick, 0));
        }
    };
}
