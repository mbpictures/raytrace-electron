import React from 'react';
import ReactDOM from 'react-dom';
import {ValueComponent} from './valueUI';
import Collapse from 'react-collapse';
export class ObjectComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            bodyEnabled: false
        };

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
        var self = this;
        return (
                <li>
                    <div className="header" onClick={this.toggleBody.bind(this)}>
                        <div className="preview"><img src={this.props.preview} /></div>
                        <h2>{this.props.name}</h2>
                    </div>
                    <Collapse isOpened={this.state.bodyEnabled}>
                        <div>
                            <ul>
                                {Object.keys(availableOptions).map(function(key){
                                    return <li>
                                        {key}: <ValueComponent value={availableOptions[key]} onChangeHandler={(value) => self.updateOptions(key, value)} />
                                    </li>;
                                })}
                            </ul>
                        </div>
                    </Collapse>
                    
                </li>
        );
    }
}