const SphereIMG = require("./images/Sphere.png");
const CubeIMG = require("./images/Cube.png");

export class Raytrace {
	objects: Object[] = [];
	settings: {[key: string]: any} = {
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

	mix(a: number, b: number, mix: number): number {
		return b * mix + a * (1 - mix);
	};

	rand(min: number, max: number): number {
		return (Math.random() * (max - min) + min);
	};

	trace(rayorig: Vec3, raydir: Vec3, depth: number = 0) {
		let infinity = Math.pow(10, 8);
		let object: Object;
		let tnear = infinity;
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
		let surfaceColor = new Vec3(0, 0, 0);

		let phit = rayorig.add(raydir.multiply(new Vec3(tnear, tnear, tnear))); // intersection point
		let nhit = object.calculateNormalByHit(phit);

		let bias = Math.pow(10, -4); var inside = false;
		if (raydir.dot(nhit) > 0) { nhit = nhit.multiply(new Vec3(-1, -1, -1)); inside = true; }

		if ((object.transparency > 0 || object.reflection > 0) && depth < this.settings.rayDepth) {
			let facingratio = -(raydir.dot(nhit));
			// to adjust fresnel effect, change mix value
			let fresneleffect = this.mix(Math.pow(1 - facingratio, 3), 1, 0.1);
			// calc reflection directions (all vectors are already normalized)
			let refldir = raydir.subtract(nhit.multiply(new Vec3(2, 2, 2)).multiply(new Vec3(raydir.dot(nhit), raydir.dot(nhit), raydir.dot(nhit))));

			refldir.normalize();
			let reflection = this.trace(phit.add(nhit.multiply(new Vec3(bias, bias, bias))), refldir, depth + 1);
			let refraction = new Vec3(0, 0, 0);
			// calc refraction ray if object is transparent
			if (object.transparency > 0) {
				let ior = 1.1;
				let eta = (inside) ? ior : 1 / ior; // are we inside or outside the object?
				let cosi = nhit.dot(raydir) * -1;
				let k = 1 - eta * eta * (1 - cosi * cosi);
				let refrdir = raydir.multiply(new Vec3(eta, eta, eta)).add((new Vec3(eta * cosi, eta * cosi, eta * cosi).subtract(new Vec3(k, k, k).sqrt())).multiply(nhit));
				refrdir.normalize();
				refraction = this.trace(phit.subtract(nhit.multiply(new Vec3(bias, bias, bias))), refrdir, depth + 1);
			}
			// the result is a mix of surface color, reflection and refraction (if the object is transparent)
			surfaceColor = reflection.multiply(new Vec3(fresneleffect, fresneleffect, fresneleffect));
			let refractionColor = refraction.multiply(new Vec3((1 - fresneleffect), (1 - fresneleffect), (1 - fresneleffect)));
			refractionColor = refractionColor.multiply(new Vec3(object.transparency, object.transparency, object.transparency));
			surfaceColor = surfaceColor.add(refractionColor);
			surfaceColor = surfaceColor.multiply(object.surfaceColor);
		}
		else {
			for (i = 0; i < this.objects.length; i++) {
				if (this.objects[i].emissionColor.x > 0) {
					// object is a light!
					let lightDirection = this.objects[i].position.subtract(phit);
					lightDirection.normalize();
					let raysInShadow = 0;

					for (let x = 0; x < this.settings.shadowRays; x++) {
						let minOff = 1.0 - this.settings.shadowRayOffset;
						let maxOff = 1.0 + this.settings.shadowRayOffset;
						let random = new Vec3(this.rand(minOff, maxOff), this.rand(minOff, maxOff), this.rand(minOff, maxOff));
						let lightDirectionOffset = this.settings.shadowRays > 1.0 ? lightDirection.multiply(random) : lightDirection;
						lightDirectionOffset.normalize();
						for (let j = 0; j < this.objects.length; j++) {
							if (i !== j) {
								if (this.objects[j].intersect(phit.add(nhit.multiply(new Vec3(bias, bias, bias))), lightDirectionOffset) !== false) {
									raysInShadow++;
									break;
								}
							}
						}
					}
					let transmission: number = Math.min(1.0, this.settings.minShadowBrightness + (1.0 - (raysInShadow / this.settings.shadowRays)));
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

	changeSettingsByCanvas(dimension: {width: number, height: number}) {
		this.settings.width = Math.round(dimension.width);
		this.settings.height = Math.round(dimension.height);
		console.log("Settings changed:");
		console.log(this.settings);
	}
	/* render scene based on dimensions and update threshhold (percent) */
	*render(dimension: {width: number, height: number}, threshhold: number) {
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

	addObject(object: Object) {
		this.objects.push(object);
	}

	getOption(key: string) {
		return this.settings[key];
	}

	setOption(key: string, value: any) {
		this.settings[key] = typeof value === 'object' ? new Vec3(value.x, value.y, value.z) : value;
		console.log("Settings changed:");
		console.log(this.settings);
	}

	getAvailableOptions() {
		var result: {[key: string]: any} = {};
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

	getObjects(): Object[] {
		return this.objects;
	}

	deleteObject(index: number): void {
		this.objects.splice(index, 1);
	}

	serializeOptions(): string {
		var result: {settings: {[key: string]: any}, objects: {objectType: string, definition: object}[]} = { settings: {}, objects: [] };
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

	deserializeOptions(optionsString: any): void {
		console.log("Deserialize: " + optionsString);
		let options: {settings: {[key: string]: any}, objects: {objectType: string, definition: object}[]} = JSON.parse(optionsString);
		for (var i = 0; i < options.objects.length; i++) {
			var temp = eval("new " + options.objects[i].objectType + "()");
			temp.setAllOptions(options.objects[i].definition);
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

export interface Object {
	intersect(rayorig: Vec3, raydir: Vec3): [number, number] | false;
	getOption(name: string): any;
	setOption(key: string, value: any): void;
	getAvailableOptions(): object;
	setAllOptions(options: any): void;
	calculateNormalByHit(hitPosition: Vec3): Vec3;

	type: string;
	preview: string;
	surfaceColor: Vec3;
	reflection: number;
	transparency: number;
	emissionColor: Vec3;
	position: Vec3;
}

export class Sphere implements Object {
	position: Vec3;
	radius: number;
	surfaceColor: Vec3;
	reflection: number;
	emissionColor: Vec3;
	transparency: number;
	type: string = "Sphere";
	preview: string = SphereIMG;

	constructor(position: Vec3, radius: number, surfaceColor: Vec3, reflection: number, transparency: number, emissionColor: Vec3) {
		this.position = position;
		this.radius = radius;
		this.surfaceColor = surfaceColor;
		this.reflection = reflection;
		this.emissionColor = emissionColor;
		this.transparency = transparency;
	}

    /* intersection between this and ray consisting of origin and direction (Vec3)
        return: false (no intersection) or array of 2 intersection points */
	intersect(rayorig: Vec3, raydir: Vec3): [number, number] | false {
		var l = this.position.subtract(rayorig);
		var tca = l.dot(raydir);
		if (tca < 0) { return false; }
		var d2 = l.dot(l) - (tca * tca);
		if (d2 > (this.radius * this.radius)) { return false; }
		var thc = Math.sqrt((this.radius * this.radius) - d2);
		return [(tca - thc), (tca + thc)];
	}

	getOption(name: string): any {
		return (this as any)[name];
	}

	setOption(key: string, value: any): void {
		(this as any)[key] = value;
	}

	getAvailableOptions(): object {
		return {
			position: this.position,
			radius: this.radius,
			surfaceColor: this.surfaceColor,
			reflection: this.reflection,
			emissionColor: this.emissionColor,
			transparency: this.transparency
		};
	}

	setAllOptions(options: any): void {
		for (var key in options) {
			if (typeof options[key] === 'object') {
				(this as any)[key] = Object.assign(new Vec3(), options[key]);
				continue;
			}
			(this as any)[key] = options[key];
		}
	};
	calculateNormalByHit(hitPosition: Vec3): Vec3 {
		var hit = hitPosition.subtract(this.position);
		hit.normalize();
		return hit;
	}
}

export class Cube implements Object {
	position: Vec3;
	edgeLength: number;
	surfaceColor: Vec3;
	reflection: number;
	emissionColor: Vec3;
	transparency: number;
	type: string = "Cube";
	preview: string = CubeIMG;

	constructor(position: Vec3, edgeLength: number, surfaceColor: Vec3, reflection: number, transparency: number, emissionColor: Vec3) {
		this.position = position;
		this.edgeLength = edgeLength;
		this.surfaceColor = surfaceColor;
		this.reflection = reflection;
		this.emissionColor = emissionColor;
		this.transparency = transparency;
	}

	intersect(rayorig: Vec3, raydir: Vec3): [number, number] | false {
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

	getOption(name: any) {
		return (this as any)[name];
	}

	setOption(key: any, value: any) {
		(this as any)[key] = value;
	}

	getAvailableOptions(): any {
		return {
			position: this.position,
			edgeLength: this.edgeLength,
			surfaceColor: this.surfaceColor,
			reflection: this.reflection,
			emissionColor: this.emissionColor,
			transparency: this.transparency
		};
	}

	setAllOptions(options: any): void {
		for (var key in options) {
			if (typeof options[key] === 'object') {
				(this as any)[key] = Object.assign(new Vec3(), options[key]);
				continue;
			}
			(this as any)[key] = options[key];
		}
	}

	calculateNormalByHit(hitPosition: Vec3): Vec3 {
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
			normal = new Vec3(0, 0, 1 * Math.sign(hitPosition.z));    // Cardinal axis for Z
		}
		return normal;
	}

	// calculate left bottom and right top corner of the cube
	private lb(self: Cube): Vec3 {
		return new Vec3(self.position.x - (self.edgeLength / 2), self.position.y - (self.edgeLength / 2), self.position.z - (self.edgeLength / 2));
	}
	private rt(self: Cube): Vec3 {
		return new Vec3(self.position.x + (self.edgeLength / 2), self.position.y + (self.edgeLength / 2), self.position.z + (self.edgeLength / 2));
	}
}
export class Vec3 {
	x: number;
	y: number;
	z: number;

	constructor(x?: number, y?: number, z?: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	add(v: Vec3): Vec3 {
		return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
	}

	subtract(v: Vec3): Vec3 {
		return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
	}

	multiply(v: Vec3): Vec3 {
		return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
	}

	dot(v: Vec3): number {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	}

	length2(): number {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

	normalize(): Vec3 {
		var nor2 = this.length2();
		if (!(nor2 > 0)) { return this; }
		var invNor = 1 / Math.sqrt(nor2);
		this.x *= invNor; this.y *= invNor; this.z *= invNor;
		return this;
	}

	sqrt(): Vec3 {
		if (this.x < 0 || this.y < 0 || this.z < 0) return new Vec3(0, 0, 0); 
		return new Vec3(Math.sqrt(this.x), Math.sqrt(this.y), Math.sqrt(this.z));
	};
}