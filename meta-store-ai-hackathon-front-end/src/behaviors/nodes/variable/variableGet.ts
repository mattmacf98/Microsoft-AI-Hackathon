import {BehaveEngineNode, IBehaviourNodeProps, IValue} from '../../behaveEngineNode';

export class VariableGet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "variable"}]

    _variable: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableGetNode";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {variable} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._variable = variable;
    }

    override processNode(flowSocket?: string) {

        const result: Record<string, IValue> = {};
        result[this.variables[this._variable].id] = this.variables[this._variable];
        console.log(result);
        console.log(this.variables)
        console.log(this._variable);
        return result;
    }
}
