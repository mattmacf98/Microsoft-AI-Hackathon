import {BehaveEngineNode, IBehaviourNodeProps, IVariable} from '../../behaveEngineNode';

export class VariableSet extends BehaveEngineNode {
    REQUIRED_CONFIGURATIONS = [{id: "variable"}]

    _variable: number;

    constructor(props: IBehaviourNodeProps) {
        super(props);
        this.name = "VariableSet";
        this.validateValues(this.values);
        this.validateFlows(this.flows);
        this.validateConfigurations(this.configuration);

        const {variable} = this.evaluateAllConfigurations(this.REQUIRED_CONFIGURATIONS.map(config => config.id));
        this._variable = variable;
    }

    override processNode(flowSocket?:string) {
        const variable: IVariable = this.variables[this._variable];
        this.graphEngine.clearValueEvaluationCache();
        const vals = this.evaluateAllValues([variable.id]);

        this.variables[this._variable].value = vals[variable.id];

        super.processNode(flowSocket);
    }
}
