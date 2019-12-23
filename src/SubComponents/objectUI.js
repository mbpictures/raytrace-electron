import React from 'react';
import {ValueComponent} from './valueUI';
import Collapse from 'react-collapse';
export class ObjectComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            bodyEnabled: false
        };

        this.updateOptions = this.updateOptions.bind(this);
    }
    
    updateOptions(key, value) {
        this.props.object.setOption(key, value);
    }

    toggleBody(){
        this.setState({bodyEnabled: !this.state.bodyEnabled});
    }

    deleteObject(){
        this.props.deleteObjectHandler();
    }

    render() {
        var availableOptions = this.props.object.getAvailableOptions();
        var arrowClass = "arrow" + (this.state.bodyEnabled ? " open" : "");
        var self = this;
        return (
            <li>
                <div className="header">
                    <div className="preview" onClick={this.toggleBody.bind(this)}><img src={this.props.preview} /></div>
                    <h2 onClick={this.toggleBody.bind(this)}>{this.props.name}</h2>
                    <div className="delete" onClick={this.deleteObject.bind(this)}><span></span><span></span></div>
                    <div className={arrowClass} onClick={this.toggleBody.bind(this)}></div>
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