var Quadtree = require("../quadtree.js");
var AABB = require("../aabb.js");

var scale = document.body.querySelector("#scale").value;
var resetButton = document.body.querySelector("#reset");
var canvas = document.body.querySelector("#canvas");
var context = canvas.getContext("2d");
var interval;
var timeStep = 0.01;

var bounds = new AABB([0,0],100,100);
var quadtree = new Quadtree(0,bounds);

var tempCorner;

var originCart = [0,0];

function initialize() {
    interval = setInterval(drawAll,1000*timeStep);
    
    resetButton.addEventListener("click",reset);
    canvas.addEventListener("mousedown",getBoundingBoxCorner,false);
    canvas.addEventListener("mouseup",addBoundingBox,false);
}

function drawAll() {
    scale = document.body.querySelector("#scale").value;
    canvas.width = scale*bounds.getWidth();
    canvas.height = scale*bounds.getHeight();
    
    context.fillStyle = "rgb(255, 255, 255)";
    context.fillRect(0, 0, bounds.getWidth()*scale, bounds.getHeight()*scale);
    
    drawObjects(quadtree);
    drawQuadtree(quadtree);
}

function convertCartesianToPixels(point) {
    var newPoint = [0, 0];
    
    newPoint[0] = scale*(point[0]+originCart[0]);
    newPoint[1] = canvas.height+scale*(originCart[1]-point[1]);
    
    return newPoint;
}

function convertPixelsToCartesian(point) {
    var newPoint = [0, 0];
    
    newPoint[0] = point[0]/scale-originCart[0];
    newPoint[1] = originCart[1]-(point[1]-canvas.height)/scale;
    
    return newPoint;
}

function drawPoint(position,color) {
    var pos = convertCartesianToPixels(position);
    context.strokeStyle = color;//"rgb(0, 0, 255)"
    context.beginPath();
    context.arc(pos[0],pos[1],3*scale/200,0,2*Math.PI);
    context.stroke();
}

function drawLine(startCart, endCart, color) {
    context.strokeStyle = color;//"rgb(255, 0, 0)"
    var start = convertCartesianToPixels(startCart);
    var end = convertCartesianToPixels(endCart);
    context.beginPath();
    context.moveTo(start[0],start[1]);
    context.lineTo(end[0],end[1]);
    context.stroke();
    context.closePath();
}

function drawBox(min,max,color) {
    var point1 = [min[0], min[1]];
    var point2 = [max[0], min[1]];
    var point3 = [max[0], max[1]];
    var point4 = [min[0], max[1]];
    
    drawLine(point1,point2,color);
    drawLine(point2,point3,color);
    drawLine(point3,point4,color);
    drawLine(point4,point1,color);
}

function drawQuadtree(tree) {
    drawBox(tree.bounds.min,tree.bounds.max,"rgb(255, 0, 0)");
    for(var i=0; i < tree.nodes.length; i++) {
        drawQuadtree(tree.nodes[i]);
    }
}

function drawObjects(tree) {
    for(var i=0; i < tree.objects.length; i++) {
        drawBox(tree.objects[i].min,tree.objects[i].max,"rgb(0, 0, 255)");
    }
    for(var i=0; i < tree.nodes.length; i++) {
        drawObjects(tree.nodes[i]);
    }
}

function reset() {
    clearInterval(interval);
    quadtree.clear();
    console.log("Reset!");
    interval = setInterval(drawAll,1000*timeStep);
}

function getBoundingBoxCorner(event) {
    var point = convertPixelsToCartesian([event.pageX-canvas.offsetLeft, event.pageY-canvas.offsetTop]);
    console.log("Corner added at ("+point[0]+", "+point[1]+")");
    tempCorner = point;
}

function addBoundingBox(event) {
    var corner = convertPixelsToCartesian([event.pageX-canvas.offsetLeft, event.pageY-canvas.offsetTop]);
    console.log("Corner added at ("+corner[0]+", "+corner[1]+")");
    
    var minX = Math.min(tempCorner[0],corner[0]);
    var minY = Math.min(tempCorner[1],corner[1]);
    var maxX = Math.max(tempCorner[0],corner[0]);
    var maxY = Math.max(tempCorner[1],corner[1]);
    
    var aabb = new AABB([minX,minY],maxX-minX,maxY-minY);
    
    quadtree.insert(aabb);
}

initialize()


