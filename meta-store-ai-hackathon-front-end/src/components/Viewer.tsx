import {ArcRotateCamera, Color3, Color4, Engine, HemisphericLight, MeshBuilder, Scene, Vector3} from "@babylonjs/core";
import "../css/app.css";
import {useEffect, useRef} from "react";

export const Viewer = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene>();

    useEffect(() => {
        // Create the Babylon.js engines
        engineRef.current = new Engine(canvasRef.current, true);

        createScene();

        // Run the render loop
        engineRef.current?.runRenderLoop(() => {
            sceneRef.current?.render();
        });

        return () => {
            // Clean up resources when the component unmounts
            sceneRef.current?.dispose();
            engineRef.current?.dispose();
        };
    }, []);

    const createScene = async () => {
        // Create a scene
        sceneRef.current = new Scene(engineRef.current!);
        sceneRef.current!.clearColor = Color4.FromColor3(Color3.FromHexString("#c2d4e5"));

        MeshBuilder.CreateBox("mybox");

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
    };

    return (
        <canvas ref={canvasRef} className={"viewer-container"} />
    )
}
