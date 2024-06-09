import {
    ArcRotateCamera, AssetContainer, BoundingInfo,
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
import {META_STORE_AI_BACKEND_URL} from "../App";
import {AdvancedDynamicTexture, Button, Control, Image} from "@babylonjs/gui";

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

           let ce = closest(event.detail.id, [...customEvents, "toggle_bounding_box"]);

           if (ce === "toggle_bounding_box") {
               if (sceneRef.current) {
                   sceneRef.current.meshes[0].showBoundingBox = !sceneRef.current.meshes[0].showBoundingBox;
               }
           }

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

        babylonEngineRef.current?.addCustomEventListener("KHR_INTERACTIVITY:send_to_agent", (data: any) => {
            console.log(data.detail.message);
            const ev = new CustomEvent("CALL_AGENT", { detail: {prompt: data.detail.message, systemMessage: data.detail.message} });
            document.dispatchEvent(ev);
        });
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

        const container = await SceneLoader.LoadAssetContainerAsync(`${META_STORE_AI_BACKEND_URL}/download/${id}.glb`, "", sceneRef.current, undefined, ".glb");
        container.addAllToScene();

        let childMeshes = container.meshes[0].getChildMeshes();

        let min = childMeshes[0].getBoundingInfo().boundingBox.minimumWorld;
        let max = childMeshes[0].getBoundingInfo().boundingBox.maximumWorld;

        for(let i=0; i<childMeshes.length; i++){
            let meshMin = childMeshes[i].getBoundingInfo().boundingBox.minimumWorld;
            let meshMax = childMeshes[i].getBoundingInfo().boundingBox.maximumWorld;

            min = Vector3.Minimize(min, meshMin);
            max = Vector3.Maximize(max, meshMax);
        }

        container.meshes[0].setBoundingInfo(new BoundingInfo(min, max));

        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // Create an image element
        const boundingBoxBtn = Button.CreateImageOnlyButton("", "box.png");
        boundingBoxBtn.width = "40px";
        boundingBoxBtn.height = "40px";
        boundingBoxBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        boundingBoxBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        boundingBoxBtn.top = "10px";
        boundingBoxBtn.left = "-10px";

        boundingBoxBtn.onPointerClickObservable.add(() => {
           container.meshes[0].showBoundingBox = !container.meshes[0].showBoundingBox;
        });

        // Add the image to the GUI
        advancedTexture.addControl(boundingBoxBtn);


        await startGraph(container);
    };

    return (
        <canvas ref={canvasRef} className={"viewer-container"} />
    )
}
