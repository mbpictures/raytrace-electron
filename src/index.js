import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {raytrace} from './raytracer';
 
class RaytraceUI extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            numberStyle: {display: "flex"},
            vectorStyle: {display: "none"},
            number: 30,
            vector: {x: 0, y: 0, z:0},
            width: 1166,
            height: 874
        };

        this.optionsChange = this.optionsChange.bind(this);

    }
    render(){
        return(
            <div className="row">
                <div className="output">
                    <canvas ref="canvas" width={this.state.width} height={this.state.height}></canvas>
                </div>
                <div className="options">
                    <h1>Raytracer</h1>
                    <a onClick={this.startRaytrace.bind(this)} className="btn btn-primary">Render</a>

                    <div className="row">
                        <div className="col">
                            <select id="options" className="input" onChange={this.optionsChange}>
                                <option value="fov">FOV</option>
                                <option value="rayDepth">Ray Depth</option>
                                <option value="shadowRays">Shadow Rays</option>
                                <option value="backgroundColor">Background Color</option>
                                <option value="shadowRayOffset">Shadow Ray Offset</option>
                                <option value="minShadowBrightness">Min Shadow Brightness</option>
                            </select>
                        </div>
                        <div className="col">
                            <div className="number" style={this.state.numberStyle}>
                                <input type="text" className="input" value={this.state.number} />
                            </div>
                            <div className="vector" style={this.state.vectorStyle}>
                                <input type="text" className="input" value={this.state.vector.x} />
                                <input type="text" className="input" value={this.state.vector.y} />
                                <input type="text" className="input" value={this.state.vector.z} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    optionsChange(event){
        var val = raytrace.getOption(event.target.value);
        var state = this.state;
        if(typeof val === 'object'){
            state.vectorStyle = {display: "flex"};
            state.numberStyle = {display: "none"};
            state.vector = val;
        }
        else{
            state.vectorStyle = {display: "none"};
            state.numberStyle = {display: "flex"};
            state.number = val;
        }
        this.setState(state);
    }

    startRaytrace(){
        console.log(this.refs.canvas);
        raytrace.render(this.refs.canvas, this);
    }
}
 
ReactDOM.render(
  <RaytraceUI/>,
  document.getElementById('root')
);