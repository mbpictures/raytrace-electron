import * as React from 'react';

export interface ValueProps {
    value: any;
    onChangeHandler(value: any): any;
}

export interface ValueState {
    value: any;
}

export class ValueComponent extends React.Component<ValueProps, ValueState> {
    constructor(props: ValueProps) {
        super(props);

        this.state = {value: this.props.value};
    }

    changeOptionValue(evt: any, mode: string, key?: string) {
        let state: ValueState = this.state;
        if(mode === "vector") {
            state.value[key] = evt.target.value;
        }
        else {
            state.value = evt.target.value;
        }
        this.setState(state);
        this.props.onChangeHandler(state.value);
    }

    render() {
        var valueField;
        if(typeof this.props.value === "object") {
            valueField =  
            <div className="vector">
                <input type="text" className="input" value={this.state.value.x} onChange={(evt) => this.changeOptionValue(evt, "vector", "x")} />
                <input type="text" className="input" value={this.state.value.y} onChange={(evt) => this.changeOptionValue(evt, "vector", "y")} />
                <input type="text" className="input" value={this.state.value.z} onChange={(evt) => this.changeOptionValue(evt, "vector", "z")} />
            </div>;
        }
        else {
            valueField = 
            <div className="number">
                <input type="text" className="input" value={this.state.value} onChange={(evt) => this.changeOptionValue(evt, "number")} />
            </div>;
        }
        return valueField;
    }
}