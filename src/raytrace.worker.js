import { raytrace } from "./raytracer";

self.addEventListener("message", raytraceWorker);

function raytraceWorker(event) {
    raytrace.deserializeOptions(event.data.raytraceOptions);
    var trace = raytrace.render({height: event.data.dimension.width, width: event.data.dimension.height}, event.data.threshhold);
    var currenttrace = trace.next();
    while(!currenttrace.done) {
        postMessage(currenttrace.value);
        currenttrace = trace.next();
    }
}