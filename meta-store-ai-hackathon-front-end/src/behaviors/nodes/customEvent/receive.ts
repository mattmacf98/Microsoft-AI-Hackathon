import { BehaveEngineNode, IBehaviourNodeProps, ICustomEvent } from '../../behaveEngineNode';

export class Receive extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{ id: 'customEvent' }];

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = 'CustomEventReceiveNode';
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);
        this.setUpEventListener();
    }

    setUpEventListener() {
        const { customEvent } = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map((config) => config.id));

        const customEventDesc: ICustomEvent = this.customEvents[customEvent];

        this.graphEngine.addCustomEventListener(`KHR_INTERACTIVITY:${customEventDesc.id}`, (e: any) => {
            const ce = e as CustomEvent;
            Object.keys(ce.detail).forEach((key) => {
                const typeIndex = customEventDesc.values.filter((val) => val.id === key)[0].type;
                const typeName: string = this.getType(typeIndex!);
                const rawVal = ce.detail[key];
                const val = this.parseType(typeName, rawVal);
                this.outValues[key] = {
                    id: key,
                    value: val,
                    type: typeIndex,
                };
            });
            this.addEventToWorkQueue(this.flows.out);
        });
    }

    override parseType(type: string, val: any) {
        switch (type) {
            case 'bool':
                return val === 'true';
            case 'int':
            case 'float':
                return Number(val);
            case 'float2':
            case 'float3':
            case 'float4':
            case 'float4x4':
                return JSON.parse(val);
            default:
                return val;
        }
    }
}
