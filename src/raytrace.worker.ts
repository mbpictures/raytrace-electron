import {Raytrace} from './raytracer';

const ctx: Worker = self as any;
ctx.addEventListener("message", (event: RaytraceWorkerEvent) => {
    var raytrace = new Raytrace();
    raytrace.deserializeOptions(event.data.raytraceOptions);
    var trace = raytrace.render(event.data.dimension, event.data.threshhold);
    var currentTrace = trace.next();
    while(!currentTrace.done) {
        postMessage(currentTrace.value);
        currentTrace = trace.next();
    }
});

interface RaytraceWorkerEvent extends MessageEvent {
    data: {raytraceOptions: object, dimension: {width: number, height: number}, threshhold: number, img: ArrayLike<number>, progress: number};
    value: object;
    progress: number;
}

export default null as any;