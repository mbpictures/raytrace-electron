import React from 'react';
import ReactDOM from 'react-dom';
import {ValueComponent} from './valueUI';
export class ObjectComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            bodyEnabled: false
        };
        this.body = React.createRef();

        Object.keys(this.props.object.getAvailableOptions()).map(key => {
            this[`${key}_ref`] = React.createRef()
        });

        this.updateOptions = this.updateOptions.bind(this);
        
    }
    
    updateOptions(key, value) {
        this.props.object.setOption(key, value);
    }

    toggleBody(){
        var state = this.state;
        state.bodyEnabled = !state.bodyEnabled;
        this.setState(state);
    }

    render() {
        var availableOptions = this.props.object.getAvailableOptions();
        var bodyClass = "body" + (this.state.bodyEnabled ? " open" : "");
        var self = this;
        return (
                <li>
                    <div className="header" onClick={this.toggleBody.bind(this)}>
                        <div className="preview"><img src={this.props.preview} /></div>
                        <h2>{this.props.name}</h2>
                    </div>
                    <div className={bodyClass} ref={this.body}>
                        <ul>
                            {Object.keys(availableOptions).map(function(key){
                                return <li>
                                    {key}: <ValueComponent value={availableOptions[key]} onChangeHandler={(value) => self.updateOptions(key, value)} />
                                </li>;
                            })}
                        </ul>
                    </div>
                </li>
        );
    }
}