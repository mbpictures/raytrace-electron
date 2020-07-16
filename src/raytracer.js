import SphereIMG from './images/Sphere.png'
import CubeIMG from './images/Cube.png'

export class Raytrace {
	objects = [];
	settings = {
		"invWidth": function () { return 1 / this.width; },
		"invHeight": function () { return 1 / this.height; },
		"aspectRatio": function () { return this.width / this.height; },
		"width": 640,
		"height": 480,
		"angle": function () { return Math.tan(Math.PI * 0.5 * this.fov / 180.0); },
		"fov": 30.0,
		"rayDepth": 12,
		"shadowRays": 36,
		"backgroundColor": new Vec3(0.1, 0.5, 1),
		"shadowRayOffset": 3.5, // meaning 350%!
		"minShadowBrightness": 0.125 // shadows not completly black!
	};

	mix(a, b, mix) {
		return b * mix + a * (1 - mix);
	};

	rand(min, max) {
		return (Math.random() * (max - min) + min);
	};

	trace(rayorig, raydir, depth) {
		var infinity = Math.pow(10, 8);
		var object;
		var tnear = infinity;
		for (var i = 0; i < this.objects.length; ++i) {
			var intersection = this.objects[i].intersect(rayorig, raydir);
			if (Array.isArray(intersection)) {
				if (intersection[0] < 0) { intersection[0] = intersection[1]; }
				if (intersection[0] < tnear) {
					tnear = intersection[0];
					object = this.objects[i];
				}
			}
		}

		if (object === undefined) {
			return this.settings.backgroundColor; // black
		}
		var surfaceColor = new Vec3(0, 0, 0);

		var phit = rayorig.add(raydir.multiply(new Vec3(tnear, tnear, tnear))); // intersection point
		var nhit = object.calculateNormalByHit(phit);

		var bias = Math.pow(10, -4); var inside = false;
		if (raydir.dot(nhit) > 0) { nhit = nhit.multiply(new Vec3(-1, -1, -1)); inside = true; }

		if ((object.transparency > 0 || object.reflection > 0) && depth < this.settings.rayDepth) {
			var facingratio = -(raydir.dot(nhit));
			// to adjust fresnel effect, change mix value
			var fresneleffect = this.mix(Math.pow(1 - facingratio, 3), 1, 0.1);
			// calc reflection directions (all vectors are already normalized)
			var refldir = raydir.subtract(nhit.multiply(new Vec3(2, 2, 2)).multiply(new Vec3(raydir.dot(nhit), raydir.dot(nhit), raydir.dot(nhit))));

			refldir.normalize();
			var reflection = this.trace(phit.add(nhit.multiply(new Vec3(bias, bias, bias))), refldir, depth + 1);
			var refraction = new Vec3(0, 0, 0);
			// calc refraction ray if object is transparent
			if (object.transparency > 0) {
				var ior = 1.1;
				var eta = (inside) ? ior : 1 / ior; // are we inside or outside the object?
				var cosi = nhit.dot(raydir) * -1;
				var k = 1 - eta * eta * (1 - cosi * cosi);
				var refrdir = raydir.multiply(new Vec3(eta, eta, eta)).add((new Vec3(eta * cosi, eta * cosi, eta * cosi).subtract(new Vec3(k, k, k).sqrt())).multiply(nhit));
				refrdir.normalize();
				refraction = this.trace(phit.subtract(nhit.multiply(new Vec3(bias, bias, bias))), refrdir, depth + 1);
			}
			// the result is a mix of surface color, reflection and refraction (if the object is transparent)
			surfaceColor = reflection.multiply(new Vec3(fresneleffect, fresneleffect, fresneleffect));
			var refractionColor = refraction.multiply(new Vec3((1 - fresneleffect), (1 - fresneleffect), (1 - fresneleffect)));
			refractionColor = refractionColor.multiply(new Vec3(object.transparency, object.transparency, object.transparency));
			surfaceColor = surfaceColor.add(refractionColor);
			surfaceColor = surfaceColor.multiply(object.surfaceColor);
		}
		else {
			for (i = 0; i < this.objects.length; i++) {
				if (this.objects[i].emissionColor.x > 0) {
					// object is a light!
					var transmission = new Vec3(1, 1, 1);
					var lightDirection = this.objects[i].position.subtract(phit);
					lightDirection.normalize();
					var raysInShadow = 0;

					for (var x = 0; x < this.settings.shadowRays; x++) {
						var minOff = 1.0 - this.settings.shadowRayOffset;
						var maxOff = 1.0 + this.settings.shadowRayOffset;
						var random = new Vec3(this.rand(minOff, maxOff), this.rand(minOff, maxOff), this.rand(minOff, maxOff));
						var lightDirectionOffset = this.settings.shadowRays > 1.0 ? lightDirection.multiply(random) : lightDirection;
						lightDirectionOffset.normalize();
						for (var j = 0; j < this.objects.length; j++) {
							if (i !== j) {
								if (this.objects[j].intersect(phit.add(nhit.multiply(new Vec3(bias, bias, bias))), lightDirectionOffset) !== false) {
									raysInShadow++;
									break;
								}
							}
						}
					}
					transmission = Math.min(1.0, this.settings.minShadowBrightness + (1.0 - (raysInShadow / this.settings.shadowRays)));
					surfaceColor = surfaceColor.add(
						object.surfaceColor.multiply(
							new Vec3(
								transmission * Math.max(0, nhit.dot(lightDirection)),
								transmission * Math.max(0, nhit.dot(lightDirection)),
								transmission * Math.max(0, nhit.dot(lightDirection))
							)
						).multiply(this.objects[i].emissionColor));
				}
			}
		}
		return surfaceColor.add(object.emissionColor);
	}

	changeSettingsByCanvas(dimension) {
		this.settings.width = Math.round(dimension.width);
		this.settings.height = Math.round(dimension.height);
		console.log("Settings changed:");
		console.log(this.settings);
	}
	/* render scene based on dimensions and update threshhold (percent) */
	*render(dimension, threshhold) {
		this.changeSettingsByCanvas(dimension);
		var imagedata = new Array(this.settings.width * this.settings.height * 4);
		var currentProgress = 0;
		for (var y = 0; y < this.settings.height; y++) {
			for (var x = 0; x < this.settings.width; x++) {
				var xx = (2 * ((x + 0.5) * this.settings.invWidth()) * this.settings.angle() * this.settings.aspectRatio());
				var yy = (1 - 2 * ((y + 0.5) * this.settings.invHeight())) * this.settings.angle();
				var raydir = new Vec3(xx, yy, -1);
				raydir.normalize();

				var pixel = this.trace(new Vec3(0, 0, 0), raydir, 0);
				var pixelindex = (y * this.settings.width + x) * 4;
				imagedata[pixelindex] = Math.floor(pixel.x >= 1.0 ? 255 : pixel.x * 256.0); // Red
				imagedata[pixelindex + 1] = Math.floor(pixel.y >= 1.0 ? 255 : pixel.y * 256.0); // Green
				imagedata[pixelindex + 2] = Math.floor(pixel.z >= 1.0 ? 255 : pixel.z * 256.0); // Blue
				imagedata[pixelindex + 3] = 255;   // Alpha

				if (((x * y) / (this.settings.height * this.settings.width)) - currentProgress > threshhold) {
					currentProgress = (x * y) / (this.settings.height * this.settings.width);
					yield { img: imagedata, progress: currentProgress };
				}
			}
		}
		console.log("Finished!");
		yield { img: imagedata, progress: 1 };
	}

	addObject(object) {
		this.objects.push(object);
	}

	getOption(key) {
		return this.settings[key];
	}

	setOption(key, value) {
		this.settings[key] = typeof value === 'object' ? new Vec3(value.x, value.y, value.z) : value;
		console.log("Settings changed:");
		console.log(this.settings);
	}

	getAvailableOptions() {
		var result = {};
		for (var key in this.settings) {
			if (typeof this.settings[key] !== "function" && (key !== "width" && key !== "height"))
				result[key] = key.replace(/([A-Z])/g, " $1").charAt(0).toUpperCase() + key.replace(/([A-Z])/g, " $1").slice(1);
		}
		return result;
	}

	getAvailableObjectsDefault() {
		return {
			"Cube": new Cube(new Vec3(0, 0, 0), 1.0, new Vec3(1, 1, 1), 1.0, 1, new Vec3(0, 0, 0)),
			"Sphere": new Sphere(new Vec3(0, 0, 0), 1.0, new Vec3(1, 1, 1), 1.0, 1, new Vec3(0, 0, 0))
		};
	}

	getObjects() {
		return this.objects;
	}

	deleteObject(index) {
		this.objects.splice(index, 1);
	}

	serializeOptions() {
		var result = { settings: {}, objects: [] };
		// copy settings
		for (var key in this.settings) {
			if (typeof this.settings[key] !== "function")
				result["settings"][key] = this.settings[key];
		}
		// copy objects
		for (var i = 0; i < this.objects.length; i++) {
			result.objects[i] = { objectType: this.objects[i].constructor.name, definition: this.objects[i].getAvailableOptions() };
		}
		return JSON.stringify(result);
	}

	deserializeOptions(options) {
		options = JSON.parse(options);
		this.objects = options.objects;
		for (var i = 0; i < this.objects.length; i++) {
			var temp = eval("new " + this.objects[i].objectType + "()");
			temp.setAllOptions(this.objects[i].definition);
			this.objects[i] = temp;
		}
		for (var key in options.settings) {
			if (typeof options.settings[key] === 'object') {
				this.settings[key] = Object.assign(new Vec3(), options.settings[key]);
				continue;
			}
			this.settings[key] = options.settings[key];
		}
	}
}

export class Sphere {
	position;
	radius;
	surfaceColor;
	reflection;
	emissionColor;
	transparency;
	type = "Sphere";
	preview = SphereIMG;

	constructor(position, radius, surfaceColor, reflection, transparency, emissionColor) {
		this.position = position;
		this.radius = radius;
		this.surfaceColor = surfaceColor;
		this.reflection = reflection;
		this.emissionColor = emissionColor;
		this.transparency = transparency;
	}

    /* intersection between this and ray consisting of origin and direction (Vec3)
        return: false (no intersection) or array of 2 intersection points */
	intersect(rayorig, raydir) {
		var l = this.position.subtract(rayorig);
		var tca = l.dot(raydir);
		if (tca < 0) { return false; }
		var d2 = l.dot(l) - (tca * tca);
		if (d2 > (this.radius * this.radius)) { return false; }
		var thc = Math.sqrt((this.radius * this.radius) - d2);
		return [(tca - thc), (tca + thc)];
	}

	getOption(name) {
		return this[name];
	}

	setOption(key, value) {
		this[key] = value;
	}

	getAvailableOptions() {
		return {
			position: this.position,
			radius: this.radius,
			surfaceColor: this.surfaceColor,
			reflection: this.reflection,
			emissionColor: this.emissionColor,
			transparency: this.transparency
		};
	}

	setAllOptions(options) {
		for (var key in options) {
			if (typeof options[key] === 'object') {
				this[key] = Object.assign(new Vec3(), options[key]);
				continue;
			}
			this[key] = options[key];
		}
	};
	calculateNormalByHit(hitPosition) {
		var hit = hitPosition.subtract(this.position);
		hit.normalize();
		return hit;
	}
}

export class Cube {
	position;
	edgeLength;
	surfaceColor;
	reflection;
	emissionColor;
	transparency;
	type = "Cube";
	preview = CubeIMG;

	constructor(position, edgeLength, surfaceColor, reflection, transparency, emissionColor) {
		this.position = position;
		this.edgeLength = edgeLength;
		this.surfaceColor = surfaceColor;
		this.reflection = reflection;
		this.emissionColor = emissionColor;
		this.transparency = transparency;
	}

	intersect(rayorig, raydir) {
		var dirfrac = new Vec3(1.0 / raydir.x, 1.0 / raydir.y, 1.0 / raydir.z);
		var t1 = (this.lb(this).x - raydir.x) * dirfrac.x;
		var t2 = (this.rt(this).x - raydir.x) * dirfrac.x;
		var t3 = (this.lb(this).y - raydir.y) * dirfrac.y;
		var t4 = (this.rt(this).y - raydir.y) * dirfrac.y;
		var t5 = (this.lb(this).z - raydir.z) * dirfrac.z;
		var t6 = (this.rt(this).z - raydir.z) * dirfrac.z;

		var tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
		var tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

		if (tmax < 0) {
			return false;
		}

		// if tmin > tmax, ray doesn't intersect AABB
		if (tmin > tmax) {
			return false;
		}
		return [tmin, tmax];
	}

	getOption(name) {
		return this[name];
	}

	setOption(key, value) {
		this[key] = value;
	}

	getAvailableOptions() {
		return {
			position: this.position,
			edgeLength: this.edgeLength,
			surfaceColor: this.surfaceColor,
			reflection: this.reflection,
			emissionColor: this.emissionColor,
			transparency: this.transparency
		};
	}

	setAllOptions(options) {
		for (var key in options) {
			if (typeof options[key] === 'object') {
				this[key] = Object.assign(new Vec3(), options[key]);
				continue;
			}
			this[key] = options[key];
		}
	}

	calculateNormalByHit(hitPosition) {
		var normal = new Vec3(0, 0, 0);
		var min = Math.pow(10, 8);
		var distance;

		hitPosition = hitPosition.subtract(this.position);

		distance = Math.abs(this.edgeLength - Math.abs(hitPosition.x));
		if (distance < min) {
			min = distance;
			normal = new Vec3(1 * Math.sign(hitPosition.x), 0, 0);    // Cardinal axis for X
		}
		distance = Math.abs(this.edgeLength - Math.abs(hitPosition.y));
		if (distance < min) {
			min = distance;
			normal = new Vec3(0, 1 * Math.sign(hitPosition.y), 0);    // Cardinal axis for Y
		}
		distance = Math.abs(this.edgeLength - Math.abs(hitPosition.z));
		if (distance < min) {
			min = distance;
			normal = new Vec3(0, 0, 1 * Math.sign(hitPosition.z));    // Cardinal axis for Z
		}
		return normal;
	}

	// calculate left bottom and right top corner of the cube
	lb(self) {
		return new Vec3(self.position.x - (self.edgeLength / 2), self.position.y - (self.edgeLength / 2), self.position.z - (self.edgeLength / 2));
	}
	rt(self) {
		return new Vec3(self.position.x + (self.edgeLength / 2), self.position.y + (self.edgeLength / 2), self.position.z + (self.edgeLength / 2));
	}
}
export class Vec3 {
	x;
	y;
	z;

	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	add(v) {
		return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
	}

	subtract(v) {
		return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
	}

	multiply(v) {
		return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
	}

	dot(v) {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	}

	length2() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	normalize() {
		var nor2 = this.length2();
		if (!(nor2 > 0)) { return this; }
		var invNor = 1 / Math.sqrt(nor2);
		this.x *= invNor; this.y *= invNor; this.z *= invNor;
		return this;
	}

	sqrt() {
		if (this.x < 0 || this.y < 0 || this.z < 0) return new Vec3(0, 0, 0); 
		return new Vec3(Math.sqrt(this.x), Math.sqrt(this.y), Math.sqrt(this.z));
	};
}