import {Raytrace, Sphere, Cube, Vec3} from './raytracer';

self.addEventListener("message", raytraceWorker); // eslint-disable-line no-restricted-globals

function raytraceWorker(event) {
    var raytrace = new Raytrace();
    raytrace.deserializeOptions(event.data.raytraceOptions);
    var trace = raytrace.render(event.data.dimension, event.data.threshhold);
    var currenttrace = trace.next();
    while(!currenttrace.done) {
        postMessage(currenttrace.value);
        currenttrace = trace.next();
    }
}