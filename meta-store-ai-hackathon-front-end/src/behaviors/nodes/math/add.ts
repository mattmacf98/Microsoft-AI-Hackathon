import {BehaveEngineNode, IBehaviourNodeProps, IValue} from '../../behaveEngineNode';

export class Add extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "AddNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        console.log(a);
        console.log(b);
        console.log(this.values['a']);
        console.log(this.values['b']);
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        let val: any;

        switch (typeA) {
            case "int":
                val = (a + b) | 0;
                break;
            case "float":
                val = a + b;
                break;
            case "float3":
                val = [
                    a[0] + b[0],
                    a[1] + b[1],
                    a[2] + b[2],
                ]
                break;
            default:
                throw Error("Invalid type")
        }

        return {'val': {id: "val", value: val, type: typeIndexA}};
    }
}
