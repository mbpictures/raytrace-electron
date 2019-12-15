export const raytrace = (function() {  
    var objects = [];
    var settings = {
        "fov": 30.0,
        "invWidth": function() { return 1 / settings.width; },
        "invHeight": function() { return 1 / settings.height; },
        "aspectRatio": function() { return settings.width / settings.height; },
        "width": 640,
        "height": 480,
        "angle": function() { return Math.tan(Math.PI * 0.5 * settings.fov / 180.0); },
		"rayDepth": 12,
		"shadowRays": 36,
		"backgroundColor": new Vec3(0,0,0),
		"shadowRayOffset": 3.5, // meaning 350%!
		"minShadowBrightness": 0.125 // shadows not completly black!
    };
	
	var mix = function (a, b, mix){
		return b * mix + a * (1 - mix);
	};
	
	var rand = function(min, max){
		return (Math.random() * (max - min) + min);
	};
	
	var trace = function(rayorig, raydir, depth){
		var infinity = Math.pow(10, 8);
		var object;
		var tnear = infinity;
		for (var i = 0; i < objects.length; ++i) {
			var intersection = objects[i].intersect(rayorig, raydir);
			if (Array.isArray(intersection)) {
				if (intersection[0] < 0){ intersection[0] = intersection[1]; }
				if (intersection[0] < tnear) {
					tnear = intersection[0];
					object = objects[i];
				}
			}
		}
		
		if(object === undefined){
			return settings.backgroundColor; // black
		}
		
		var surfaceColor = new Vec3(0,0,0);
		
		var phit = rayorig.add(raydir.multiply(new Vec3(tnear, tnear, tnear))); // intersection point
    	var nhit = phit.subtract(object.position);
		nhit.normalize();
		var bias = Math.pow(10, -4); var inside = false;
		if (raydir.dot(nhit) > 0){ nhit = nhit.multiply(new Vec3(-1, -1, -1)); inside = true; }
		
		if ((object.transparency > 0 || object.reflection > 0) && depth < settings.rayDepth) {
			var facingratio = -(raydir.dot(nhit));
			// to adjust fresnel effect, change mix value
			var fresneleffect = mix(Math.pow(1 - facingratio, 3), 1, 0.1);
			// calc reflection directions (all vectors are already normalized)
			var refldir = raydir.subtract(nhit.multiply(new Vec3(2, 2, 2)).multiply(new Vec3(raydir.dot(nhit), raydir.dot(nhit), raydir.dot(nhit))));
			
			refldir.normalize();
			var reflection = trace(phit.add(nhit.multiply(new Vec3(bias, bias, bias))), refldir, depth + 1);
			var refraction = new Vec3(0,0,0);
			// calc refraction ray if object is transparent
			if (object.transparency > 0) {
				var ior = 1.1;
				var eta = (inside) ? ior : 1 / ior; // are we inside or outside the object?
				var cosi = nhit.dot(raydir) * -1;
				var k = 1 - eta * eta * (1 - cosi * cosi);
				var refrdir = raydir.multiply(new Vec3(eta, eta, eta)).add((new Vec3(eta*cosi, eta*cosi, eta*cosi).subtract(new Vec3(k,k,k).sqrt())).multiply(nhit));
				refrdir.normalize();
				refraction = trace(phit.subtract(nhit.multiply(new Vec3(bias, bias, bias))), refrdir, depth + 1);
			}
			// the result is a mix of surface color, reflection and refraction (if the object is transparent)
			surfaceColor = reflection.multiply(new Vec3(fresneleffect, fresneleffect, fresneleffect));
			var refractionColor = refraction.multiply(new Vec3((1-fresneleffect), (1-fresneleffect), (1-fresneleffect)));
			refractionColor = refractionColor.multiply(new Vec3(object.transparency, object.transparency, object.transparency));
			surfaceColor = surfaceColor.add(refractionColor);
			surfaceColor = surfaceColor.multiply(object.surfaceColor);
		}
		else{
			for (var i = 0; i < objects.length; i++) {
				if (objects[i].emissionColor.x > 0) {
					// object is a light!
					var transmission = new Vec3(1, 1, 1);
					var lightDirection = objects[i].position.subtract(phit);
					lightDirection.normalize();
					var raysInShadow = 0;

					for (var x = 0; x < settings.shadowRays; x++) {
						var minOff = 1.0 - settings.shadowRayOffset;
						var maxOff = 1.0 + settings.shadowRayOffset;
						var random = new Vec3(rand(minOff, maxOff), rand(minOff, maxOff), rand(minOff, maxOff));
						var lightDirectionOffset = settings.shadowRays > 1.0 ? lightDirection.multiply(random) : lightDirection;
						lightDirectionOffset.normalize();
						for (var j = 0; j < objects.length; j++) {
							if (i !== j) {
								if (objects[j].intersect(phit.add(nhit.multiply(new Vec3(bias, bias, bias))), lightDirectionOffset) !== false) {
									raysInShadow++;
									break;
								}
							}
						}
					}
					transmission = Math.min(1.0, settings.minShadowBrightness + (1.0 - (raysInShadow / settings.shadowRays)));
					surfaceColor = surfaceColor.add(object.surfaceColor.multiply(new Vec3(
						transmission * Math.max(0, nhit.dot(lightDirection)), 
						transmission * Math.max(0, nhit.dot(lightDirection)), 
						transmission * Math.max(0, nhit.dot(lightDirection)))).multiply(objects[i].emissionColor));
				}
			}
		}
		
		return surfaceColor.add(object.emissionColor);
	};
      
    return {
        addSphere: function(position, radius, surfaceColor, reflection, emissionColor, transparency){
            objects.push(Sphere(position, radius, surfaceColor, reflection, emissionColor, transparency));
        },
        changeSettingsByCanvas: function (self) {
            settings.width = Math.round(self.state.width);
            settings.height = Math.round(self.state.height);
            console.log("Settings changed:");
            console.log(settings);
        },
        /* render scene on given canvas object */
        render: function(canvas, self){
            this.changeSettingsByCanvas(self);
            var context = canvas.getContext("2d");
            var imagedata = context.createImageData(settings.width, settings.height);
            for(var y = 0; y < settings.height; y++) {
                for(var x = 0; x < settings.width; x++) {
                    var xx = (2 * ((x + 0.5) * settings.invWidth) * settings.angle * settings.aspectRatio);
                    var yy = (1 - 2 * ((y + 0.5) * settings.invHeight)) * settings.angle;
                    var raydir = new Vec3(xx, yy, -1);
                    raydir.normalize();
					
					var pixel = trace(new Vec3(0,0,0), raydir, 0);
					var pixelindex = (y * settings.width + x) * 4;
					imagedata.data[pixelindex] = Math.floor(pixel.x >= 1.0 ? 255 : pixel.x * 256.0); // Red
					imagedata.data[pixelindex+1] =Math.floor(pixel.y >= 1.0 ? 255 : pixel.y * 256.0); // Green
					imagedata.data[pixelindex+2] = Math.floor(pixel.z >= 1.0 ? 255 : pixel.z * 256.0);  // Blue
					imagedata.data[pixelindex+3] = 255;   // Alpha
                }
            }
			context.putImageData(imagedata, 0, 0);
			console.log("Finished!");
        },
		addObject: function(object){
			objects.push(object);
		},
		getOption: function(key){
			return settings[key];
		},
		setOption: function (key, value){
			settings[key] = typeof value === 'object' ? new Vec3(value.x, value.y, value.z) : value;
			console.log("Settings changed:");
			console.log(settings);
		}
    };
  }());

export function Sphere(position, radius, surfaceColor, reflection, transparency, emissionColor){
    this.position = position;
    this.radius = radius;
    this.surfaceColor = surfaceColor;
    this.reflection = reflection;
    this.emissionColor = emissionColor;
    this.transparency = transparency;

    /* intersection between this and ray consisting of origin and direction (Vec3)
        return: false (no intersection) or array of 2 intersection points */
    this.intersect = function(rayorig, raydir){
        var l = position.subtract(rayorig);
        var tca = l.dot(raydir);
        if(tca < 0){ return false; }
        var d2 = l.dot(l) - (tca * tca);
        if(d2 > (this.radius * this.radius)){ return false; }
        var thc = Math.sqrt((this.radius * this.radius) - d2);
        return [(tca - thc), (tca + thc)];
    };
  }

export function Vec3(x, y, z){
	this.x = x;
	this.y = y;
	this.z = z;

	this.add = function (v) {
		return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
	};
	this.subtract = function (v) {
		return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
	};
	this.multiply = function (v) {
		return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
	};
	this.dot = function (v){
		return this.x * v.x + this.y * v.y + this.z * v.z;
	};
	this.length2 = function (){
		return this.x * this.x + this.y * this.y + this.z * this.z;
	};
	this.normalize = function (){
		var nor2 = this.length2();
		if(!(nor2 > 0)){ return this; }
		var invNor = 1 / Math.sqrt(nor2);
		this.x *= invNor; this.y *= invNor; this.z *= invNor;
		return this;
	};
	this.sqrt = function(){
		if(this.x < 0 || this.y < 0 || this.z < 0) { return new Vec3(0,0,0); }
		return new Vec3(Math.sqrt(this.x), Math.sqrt(this.y), Math.sqrt(this.z));
	};
  }