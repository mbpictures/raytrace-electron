# Raytracer
[![DeepScan grade](https://deepscan.io/api/teams/10967/projects/13907/branches/246161/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=10967&pid=13907&bid=246161)

This project represents a raytracer inside an electron & react environment.

Note: This project was developed as an introduction into electron and react, you should not use this project as a tutorial for one of these!

## What can I learn and expect from this project?
This project can act as a first contact point to raytracing and other render techniques using a simple and easy to understand scripting language like TypeScript. No boilerplate code or unnecessary features will distract you from the main part - the raytracing algorithm - of this repo. Some easy mathematical techniques you have to know for raytracing (e.g. normal calculation, intersections, ...) are included as well.

## Download & Installation
The only thing you have to do is to download/clone the repository and run the ```npm install``` inside the downloaded folder. This will automatically install all of the dependencies, including react and electron, and set up your project locally.

## Usage
After you installed the environment, start by running the "start" script using the ```npm run start``` script. This will start a webpack development server and open the webapp in your default browser. You will see the final result of the raytracer! Note: The page automatically refreshes, when you make some custom changes in the code.

### Available scripts
* start: Start a dev server and open it in the default browser (this method should be used to during development)
* build: Use webpack to package the react app, compile the typescript code and provide a production ready webapp inside the "dist" folder
* electron: Start an instance of electron running the web app (run the build script first!)
* build-win32: create a Windows-32Bit executable of the electron application inside the release-builds folder
* build-linux: create a Linux executable of the electron application inside the release-builds folder

## Code
The main part of the raytrace calculation is placed in the "src/raytracer.tsx" module. This contains a "Raytracer" class which handles all trace calculations and options handling.
To prevent the UI from being unresponsive and freezing, a worker "thread" ("src/raytrace.worker.ts") is started, after the user presses the "Render"-Button.
The UI coding are located in the "src/index.ts" and "src/SubComponents/*" files.
The page is styled using the "src/index.css" file.
To set up electron, the "src/main.js" file acts as the entry point.

## Features
* Options (FoV, Ray depth, amount of shadow rays, shadow rays spread, background color and minimum shadow brightness)
* Reflections
* Refraction
* Soft and hard shadows
* Emissive material
* different diffuse material colors
* "Scene set up"-UI

## Limits
The raytracer is currently limited to work with spheres and cubes (work in progress). There is no plan to add support for polygon meshes.

## Contribution
Feel free to report bugs using the github issue tracker or to create pull requests.
