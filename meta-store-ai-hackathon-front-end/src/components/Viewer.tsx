import {
    ArcRotateCamera, AssetContainer,
    Color3,
    Color4,
    Engine,
    HemisphericLight,
    Scene,
    SceneLoader,
    Vector3
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import "../css/app.css";
import {useEffect, useRef} from "react";
import {GLTFLoader} from "@babylonjs/loaders/glTF/2.0";
import {KHR_interactivity, KHR_INTERACTIVITY_EXTENSION_NAME} from "../loaderExtensions/KHR_interactivity";
import {BasicBehaveEngine} from "../behaviors";
import {closest} from "fastest-levenshtein";

GLTFLoader.RegisterExtension(KHR_INTERACTIVITY_EXTENSION_NAME, (loader) => {
    return new KHR_interactivity(loader);
});

export const Viewer = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Engine | null>(null);
    const babylonEngineRef = useRef<BasicBehaveEngine | null>(null);
    const sceneRef = useRef<Scene>();

    useEffect(() => {
        // Create the Babylon.js engines
        engineRef.current = new Engine(canvasRef.current, true);

        // Run the render loop
        engineRef.current?.runRenderLoop(() => {
            sceneRef.current?.render();
        });

        document.addEventListener('LOAD_NEW_PRODUCT', (event: any) => {
            console.log(event.detail.id);
            createScene(event.detail.id);
        });

        document.addEventListener('EXECUTE_FUNCTION', (event: any) => {
           const customEvents = babylonEngineRef.current?.customEvents.map(ce => ce.id) || [];

           let ce = closest(event.detail.id, customEvents);
           console.log(ce);
           babylonEngineRef.current?.emitCustomEvent(`KHR_INTERACTIVITY:${ce}`, {});
        });

        return () => {
            // Clean up resources when the component unmounts
            sceneRef.current?.dispose();
            engineRef.current?.dispose();
        };
    }, []);

    const startGraph = async (container: AssetContainer) => {
        babylonEngineRef.current = new BasicBehaveEngine(60, sceneRef.current!);
        babylonEngineRef.current?.refreshBehaveGraphEngine(container, sceneRef.current!);
    }

    const createScene = async (id: string) => {
        // Create a scene
        sceneRef.current = new Scene(engineRef.current!);
        sceneRef.current!.clearColor = Color4.FromColor3(Color3.FromHexString("#c2d4e5"));

        // Create a camera
        const camera = new ArcRotateCamera('camera', Math.PI / 3, Math.PI / 3, 10, Vector3.Zero(), sceneRef.current);
        camera.attachControl(canvasRef.current, true);
        camera.minZ = 0.001;
        camera.wheelDeltaPercentage = 0.01;
        camera.pinchDeltaPercentage = 0.01;
        canvasRef.current!.addEventListener("wheel", (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            return false;
        })

        // Create a hemispheric light
        const light1 = new HemisphericLight("light1", new Vector3(0, 1, 0), sceneRef.current);
        light1.intensity = 1;

        const container = await SceneLoader.LoadAssetContainerAsync(`http://localhost:4000/download/${id}.glb`, "", sceneRef.current, undefined, ".glb");
        container.addAllToScene();
        await startGraph(container);
    };

    return (
        <canvas ref={canvasRef} className={"viewer-container"} />
    )
}
