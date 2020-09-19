import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import {Raytrace, Sphere, Cube, Vec3} from './raytracer';
import {ObjectComponent} from './SubComponents/objectUI';
import { ProgressBar } from './SubComponents/progressUI';

const RaytraceWorker = require("worker-loader?name=dist/[name].js!./raytrace.worker");



interface RaytraceState {
    numberStyle: any;
    vectorStyle: any;
    number: number;
    vector: any;
    width: number;
    height: number;
    selectedOption: string;
    objectsExpanded: boolean;
    objectSelectionOpen: boolean;
    progress: number;

}

class RaytraceUI extends React.Component<{}, RaytraceState> {
    state: RaytraceState;
    raytracer: Raytrace;
    output: React.RefObject<any>;
    objects: React.RefObject<any>;
    canvas: HTMLCanvasElement;
    wrapper: HTMLDivElement;
    private updateDimensionsFunc: (this: Window, event: UIEvent) => any;

    constructor(props: {}){
        super(props);
        this.state = {
            numberStyle: {display: "flex"},
            vectorStyle: {display: "none"},
            number: 30,
            vector: {x: 0, y: 0, z:0},
            width: 640,
            height: 480,
            selectedOption: "fov",
            objectsExpanded: false,
            objectSelectionOpen: false,
            progress: 0
        };
        this.output = React.createRef();
        this.objects = React.createRef();

        this.optionsChange = this.optionsChange.bind(this);
        this.changeOptionValue = this.changeOptionValue.bind(this);
        this.addObject = this.addObject.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);

        this.raytracer = new Raytrace();

        this.raytracer.addObject(new Sphere(new Vec3(0.0, -10004.0, -20.0), 10000.0, new Vec3(0.2, 0.2, 0.2), 0.0, 0.0, new Vec3(0,0,0)));
		//spheres
		this.raytracer.addObject(new Sphere(new Vec3(5.0, 0.0, -20.0), 3.0, new Vec3(1.00, 0.32, 0.36), 1.0, 0.0, new Vec3(0,0,0)));
		this.raytracer.addObject(new Cube(new Vec3(10.0, -1.0, -15.0), 1.0, new Vec3(0.90, 0.76, 0.46), 1.0, 0.5, new Vec3(0,0,0)));
		this.raytracer.addObject(new Sphere(new Vec3(10.0, 0.0, -25.0), 2.0, new Vec3(0.65, 0.77, 0.97), 1.0, 0.0, new Vec3(0,0,0)));
		this.raytracer.addObject(new Sphere(new Vec3(2.5, 0, -15.0), 2.0, new Vec3(0.90, 0.90, 0.90), 1.0, 0.0, new Vec3(0,0,0)));
		//light
		this.raytracer.addObject(new Sphere(new Vec3(0.0, 20, -30.0), 3, new Vec3(0.0, 0.0, 0.0), 0.0, 0.0, new Vec3(3, 3, 3)));

    }
    componentDidMount() {
        this.updateDimensions();
        this.updateDimensionsFunc = this.updateDimensions.bind(this);
        window.addEventListener("resize", this.updateDimensionsFunc);
        document.addEventListener('mousedown', this.handleClickOutside);
    }
    
    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
        window.removeEventListener("resize", this.updateDimensionsFunc);
    }

    handleClickOutside(event: any) {
        if(this.wrapper && !this.wrapper.contains(event.target) && this.state.objectSelectionOpen) { // handle user clicked outside of add object selection
            var state = this.state;
            state.objectSelectionOpen = false;
            this.setState(state);
        }
    }

    updateDimensions(){
        var state = this.state;
        state.width = this.output.current.offsetWidth;
        state.height = this.output.current.offsetHeight;
        this.setState(state);
    }
    render(){
        var availableOptions: any = this.raytracer.getAvailableOptions();
        var options = Object.keys(availableOptions).map(function(key){
            return <option value={key}>{availableOptions[key]}</option>;
        });

        var objectsClasses = "objects" + (this.state.objectsExpanded ? " open" : "");
        var expandObjectsClasses = "expandObjects" + (this.state.objectsExpanded ? " open" : "");
        var objectSelectionClasses = "selection" + (this.state.objectSelectionOpen ? " open" : "");
        return(
            <div className="row">
                <div className="output" ref={this.output}>
                    <canvas ref={(c) => this.canvas = c} width={this.state.width} height={this.state.height}></canvas>
                    <div className="downloadImage" onClick={this.saveImage.bind(this)}><div></div></div>
                </div>
                <div className="options">
                    <h1>Raytracer</h1>
                    <button onClick={this.startRaytrace.bind(this)} className="btn btn-primary">Render</button>

                    <ProgressBar progress={this.state.progress} />

                    <select ref="options" id="options" className="input" onChange={this.optionsChange}>
                        {options}
                    </select>
                    <div className="number" style={this.state.numberStyle}>
                        <input type="text" className="input" value={this.state.number} onChange={(evt) => this.changeOptionValue(evt, "number")} />
                    </div>
                    <div className="vector" style={this.state.vectorStyle}>
                        <input type="text" className="input" value={this.state.vector.x} onChange={(evt) => this.changeOptionValue(evt, "vector", "x")} />
                        <input type="text" className="input" value={this.state.vector.y} onChange={(evt) => this.changeOptionValue(evt, "vector", "y")} />
                        <input type="text" className="input" value={this.state.vector.z} onChange={(evt) => this.changeOptionValue(evt, "vector", "z")} />
                    </div>
                </div>
                <div className={objectsClasses} ref={this.objects}>
                    <h1>Objects</h1>
                    <ul>
                    {
                        this.raytracer.getObjects().map((element: any, index: number) => {
                            return <ObjectComponent object={element} name={element.type} preview={element.preview} deleteObjectHandler={() => this.deleteObject(index)} />
                        })
                    }
                    </ul>
                    <div className="addObject">
                        <button className="btn btn-success" onClick={() => this.setState({objectSelectionOpen: true})}>
                            <div className="plus green"></div>
                            Add Object
                        </button>
                        <div className={objectSelectionClasses} ref={node => this.wrapper = node}>
                            <ul>
                                {
                                    Object.keys(this.raytracer.getAvailableObjectsDefault()).map(element => {
                                        return <li onClick={() => this.addObject(element)}>{element}</li>
                                    })
                                }
                            </ul>
                        </div>
                    </div>
                </div>
                <div className={expandObjectsClasses} onClick={() => {this.setState({objectsExpanded: !this.state.objectsExpanded})}}><span></span><span></span><span></span></div>
            </div>
        );
    }
    
    changeOptionValue(event: any, option: "number" | "vector", subOption?: string){
        let state: RaytraceState = this.state;
        if(option === "number")
            state[option] = event.target.value;
        else
            state[option][subOption] = event.target.value;
        this.setState(state);
    }

    optionsChange(event: any){
        let val: any = this.raytracer.getOption(event.target.value);
        let state: RaytraceState = this.state;
        state["selectedOption"] = event.target.value;
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
        this.setState({progress: 0});
        var imagedata = this.canvas.getContext("2d").getImageData(0, 0, this.state.width, this.state.height);
        let worker = new RaytraceWorker();
        worker.postMessage({raytraceOptions: this.raytracer.serializeOptions(), dimension: {width: this.state.width, height: this.state.height}, threshhold: 0.01});
        worker.addEventListener('message', (event: any) => {
            imagedata.data.set(event.data.img);
            this.canvas.getContext("2d").putImageData(imagedata, 0, 0);
            this.setState({progress: event.data.progress});
        });
    }

    saveImage(){
        var link = document.createElement("a");
        link.setAttribute("download", "Raytrace.png");
        link.setAttribute("href", this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        link.click();
    }

    deleteObject(index: number) {
        this.raytracer.deleteObject(index);
        this.setState(this.state);
    }

    addObject(type: string) {
        if(type != "Cube" && type != "Sphere") return;
        this.raytracer.addObject(this.raytracer.getAvailableObjectsDefault()[type]);
        this.setState({objectSelectionOpen: false});
    }


}

ReactDOM.render(
    <RaytraceUI/>,
    document.getElementById('root')
);