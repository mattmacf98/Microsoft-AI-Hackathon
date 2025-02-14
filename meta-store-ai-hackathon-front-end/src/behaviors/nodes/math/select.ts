import {BehaveEngineNode, IBehaviourNodeProps, IValue} from '../../behaveEngineNode';

export class Select extends BehaveEngineNode {
    REQUIRED_VALUES = [{id:"a"}, {id: "b"}, {id: "condition"}]

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "SelectNode";
        this.validateValues(this.values);
    }

    override processNode(flowSocket?: string) {
        const {a, b, condition} = this.evaluateAllValues(this.REQUIRED_VALUES.map(val => val.id));
        const typeIndexA = this.values['a'].type!
        const typeA: string = this.getType(typeIndexA);
        const typeIndexB = this.values['b'].type!
        const typeB: string = this.getType(typeIndexB);
        if (typeA !== typeB) {
            throw Error("input types not equivalent")
        }
        const typeIndexCondition = this.values['condition'].type!
        const typeCondition: string = this.getType(typeIndexCondition);
        if (typeCondition !== "bool") {
            throw Error("condition has invalid type")
        }
        const val: any = JSON.parse(condition) ? a : b;

        return {'val': {id: "val", value: val, type: typeIndexA}};
    }
}
