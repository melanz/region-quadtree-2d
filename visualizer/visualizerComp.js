;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function AABB(min,width,height) {
    // data
    this.min = min; // [xMin, yMin]
    this.max = [min[0]+width, min[1]+height]; // [xMax, yMax]
}

// functions
AABB.prototype.getWidth = function() {
    return this.max[0]-this.min[0];
}
AABB.prototype.getHeight = function() {
    return this.max[1]-this.min[1];
}
AABB.prototype.getX = function() {
    return this.min[0];
}
AABB.prototype.getY = function() {
    return this.min[1];
}

module.exports = AABB;
},{}],2:[function(require,module,exports){
var AABB = require("./aabb.js");

function Quadtree(level, bounds) {
    // data
    this.maxObjects = 3; // defines how many objects a node can hold before it splits
    this.maxLevels = 5; // defines the deepest level subnode
    this.level = level; // current node level (0 being the topmost node)
    this.bounds = bounds; // represents the 2D space that the node occupies (AABB)
    this.objects = []; // list of AABB's that the quadtree holds
    this.nodes = []; // contains the four subnodes of the current node
}

Quadtree.prototype.clear = function() {
    // Clears the tree
    this.objects = [];
    for(var i=0; i < this.nodes.length; i++) {
        this.nodes[i].clear();
    }
    this.nodes = [];
}

Quadtree.prototype.split = function() {
    // Splits the node into 4 subnodes
    var subWidth = 0.5*this.bounds.getWidth();
    var subHeight = 0.5*this.bounds.getHeight();
    var x = this.bounds.getX();
    var y = this.bounds.getY();
    
    this.nodes[0] = new Quadtree(this.level+1, new AABB([x + subWidth, y], subWidth, subHeight));
    this.nodes[1] = new Quadtree(this.level+1, new AABB([x, y], subWidth, subHeight));
    this.nodes[2] = new Quadtree(this.level+1, new AABB([x, y + subHeight], subWidth, subHeight));
    this.nodes[3] = new Quadtree(this.level+1, new AABB([x + subWidth, y + subHeight], subWidth, subHeight));
}

Quadtree.prototype.getIndex = function(AABB) {
    // Determine which node the object belongs to. -1 means the object
    // cannot completely fit within a child node and is part of the
    // parent node
    var index = -1;
    var verticalMidpoint = this.bounds.getX() + 0.5*this.bounds.getWidth();
    var horizontalMidpoint = this.bounds.getY() + 0.5*this.bounds.getHeight();
    
    // Object can completely fit within the top quadrants
    var topQuadrant = (AABB.getY() < horizontalMidpoint && AABB.getY() + AABB.getHeight() < horizontalMidpoint);
    // Object can completely fit within the bottom quadrants
    var bottomQuadrant = (AABB.getY() > horizontalMidpoint);
    
    // Object can completely fit within the left quadrants
    if (AABB.getX() < verticalMidpoint && AABB.getX() + AABB.getWidth() < verticalMidpoint) {
        if (topQuadrant) {
            index = 1;
        }
        else if (bottomQuadrant) {
            index = 2;
        }
    }
    
    // Object can completely fit within the right quadrants
    else if (AABB.getX() > verticalMidpoint) {
        if (topQuadrant) {
            index = 0;
        }
        else if (bottomQuadrant) {
            index = 3;
        }
    }
    
    return index;
}

Quadtree.prototype.removeObject = function(index) {
    var AABB = this.objects[index];
    if (index > -1) {
        this.objects.splice(index,1);
    }
    return AABB;
}

Quadtree.prototype.insert = function(AABB) {
    // Insert the object into the quadtree. If the node exceeds the
    // capacity, it will split and add all objects to their
    // corresponding nodes.
    if(this.nodes.length != 0) {
        var index = this.getIndex(AABB);
        
        if(index != -1) {
            this.nodes[index].insert(AABB)
            return
        }
    }
    
    this.objects.push(AABB);
    
    if(this.objects.length > this.maxObjects && this.level < this.maxLevels) {
        if(this.nodes.length == 0) {
            this.split();
        }
        
        var i = 0;
        while(i < this.objects.length) {
            var index = this.getIndex(this.objects[i]);
            if (index != -1) {
                this.nodes[index].insert(this.removeObject(i));
            }
            else {
                i++;
            }
        }
    }
}

Quadtree.prototype.detectPotentialCollisions = function(potentialCollisions, AABB) {
	// Return all objects that could collide with the given object.
    var index = this.getIndex(AABB);
    if(index != -1 && this.nodes.length != 0) {
        this.nodes[index].detectPotentialCollisions(potentialCollisions,AABB);
    }
    potentialCollisions.concat(this.objects);
    
    return potentialCollisions;
}

module.exports = Quadtree;



},{"./aabb.js":1}],3:[function(require,module,exports){
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



},{"../aabb.js":1,"../quadtree.js":2}]},{},[3])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWVsYW56L0Ryb3Bib3gvQ1M1NTgvSFc0L2FhYmIuanMiLCIvVXNlcnMvbWVsYW56L0Ryb3Bib3gvQ1M1NTgvSFc0L3F1YWR0cmVlLmpzIiwiL1VzZXJzL21lbGFuei9Ecm9wYm94L0NTNTU4L0hXNC92aXN1YWxpemVyL3Zpc3VhbGl6ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIEFBQkIobWluLHdpZHRoLGhlaWdodCkge1xuICAgIC8vIGRhdGFcbiAgICB0aGlzLm1pbiA9IG1pbjsgLy8gW3hNaW4sIHlNaW5dXG4gICAgdGhpcy5tYXggPSBbbWluWzBdK3dpZHRoLCBtaW5bMV0raGVpZ2h0XTsgLy8gW3hNYXgsIHlNYXhdXG59XG5cbi8vIGZ1bmN0aW9uc1xuQUFCQi5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5tYXhbMF0tdGhpcy5taW5bMF07XG59XG5BQUJCLnByb3RvdHlwZS5nZXRIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5tYXhbMV0tdGhpcy5taW5bMV07XG59XG5BQUJCLnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWluWzBdO1xufVxuQUFCQi5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1pblsxXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBQUJCOyIsInZhciBBQUJCID0gcmVxdWlyZShcIi4vYWFiYi5qc1wiKTtcblxuZnVuY3Rpb24gUXVhZHRyZWUobGV2ZWwsIGJvdW5kcykge1xuICAgIC8vIGRhdGFcbiAgICB0aGlzLm1heE9iamVjdHMgPSAzOyAvLyBkZWZpbmVzIGhvdyBtYW55IG9iamVjdHMgYSBub2RlIGNhbiBob2xkIGJlZm9yZSBpdCBzcGxpdHNcbiAgICB0aGlzLm1heExldmVscyA9IDU7IC8vIGRlZmluZXMgdGhlIGRlZXBlc3QgbGV2ZWwgc3Vibm9kZVxuICAgIHRoaXMubGV2ZWwgPSBsZXZlbDsgLy8gY3VycmVudCBub2RlIGxldmVsICgwIGJlaW5nIHRoZSB0b3Btb3N0IG5vZGUpXG4gICAgdGhpcy5ib3VuZHMgPSBib3VuZHM7IC8vIHJlcHJlc2VudHMgdGhlIDJEIHNwYWNlIHRoYXQgdGhlIG5vZGUgb2NjdXBpZXMgKEFBQkIpXG4gICAgdGhpcy5vYmplY3RzID0gW107IC8vIGxpc3Qgb2YgQUFCQidzIHRoYXQgdGhlIHF1YWR0cmVlIGhvbGRzXG4gICAgdGhpcy5ub2RlcyA9IFtdOyAvLyBjb250YWlucyB0aGUgZm91ciBzdWJub2RlcyBvZiB0aGUgY3VycmVudCBub2RlXG59XG5cblF1YWR0cmVlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENsZWFycyB0aGUgdHJlZVxuICAgIHRoaXMub2JqZWN0cyA9IFtdO1xuICAgIGZvcih2YXIgaT0wOyBpIDwgdGhpcy5ub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLm5vZGVzW2ldLmNsZWFyKCk7XG4gICAgfVxuICAgIHRoaXMubm9kZXMgPSBbXTtcbn1cblxuUXVhZHRyZWUucHJvdG90eXBlLnNwbGl0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gU3BsaXRzIHRoZSBub2RlIGludG8gNCBzdWJub2Rlc1xuICAgIHZhciBzdWJXaWR0aCA9IDAuNSp0aGlzLmJvdW5kcy5nZXRXaWR0aCgpO1xuICAgIHZhciBzdWJIZWlnaHQgPSAwLjUqdGhpcy5ib3VuZHMuZ2V0SGVpZ2h0KCk7XG4gICAgdmFyIHggPSB0aGlzLmJvdW5kcy5nZXRYKCk7XG4gICAgdmFyIHkgPSB0aGlzLmJvdW5kcy5nZXRZKCk7XG4gICAgXG4gICAgdGhpcy5ub2Rlc1swXSA9IG5ldyBRdWFkdHJlZSh0aGlzLmxldmVsKzEsIG5ldyBBQUJCKFt4ICsgc3ViV2lkdGgsIHldLCBzdWJXaWR0aCwgc3ViSGVpZ2h0KSk7XG4gICAgdGhpcy5ub2Rlc1sxXSA9IG5ldyBRdWFkdHJlZSh0aGlzLmxldmVsKzEsIG5ldyBBQUJCKFt4LCB5XSwgc3ViV2lkdGgsIHN1YkhlaWdodCkpO1xuICAgIHRoaXMubm9kZXNbMl0gPSBuZXcgUXVhZHRyZWUodGhpcy5sZXZlbCsxLCBuZXcgQUFCQihbeCwgeSArIHN1YkhlaWdodF0sIHN1YldpZHRoLCBzdWJIZWlnaHQpKTtcbiAgICB0aGlzLm5vZGVzWzNdID0gbmV3IFF1YWR0cmVlKHRoaXMubGV2ZWwrMSwgbmV3IEFBQkIoW3ggKyBzdWJXaWR0aCwgeSArIHN1YkhlaWdodF0sIHN1YldpZHRoLCBzdWJIZWlnaHQpKTtcbn1cblxuUXVhZHRyZWUucHJvdG90eXBlLmdldEluZGV4ID0gZnVuY3Rpb24oQUFCQikge1xuICAgIC8vIERldGVybWluZSB3aGljaCBub2RlIHRoZSBvYmplY3QgYmVsb25ncyB0by4gLTEgbWVhbnMgdGhlIG9iamVjdFxuICAgIC8vIGNhbm5vdCBjb21wbGV0ZWx5IGZpdCB3aXRoaW4gYSBjaGlsZCBub2RlIGFuZCBpcyBwYXJ0IG9mIHRoZVxuICAgIC8vIHBhcmVudCBub2RlXG4gICAgdmFyIGluZGV4ID0gLTE7XG4gICAgdmFyIHZlcnRpY2FsTWlkcG9pbnQgPSB0aGlzLmJvdW5kcy5nZXRYKCkgKyAwLjUqdGhpcy5ib3VuZHMuZ2V0V2lkdGgoKTtcbiAgICB2YXIgaG9yaXpvbnRhbE1pZHBvaW50ID0gdGhpcy5ib3VuZHMuZ2V0WSgpICsgMC41KnRoaXMuYm91bmRzLmdldEhlaWdodCgpO1xuICAgIFxuICAgIC8vIE9iamVjdCBjYW4gY29tcGxldGVseSBmaXQgd2l0aGluIHRoZSB0b3AgcXVhZHJhbnRzXG4gICAgdmFyIHRvcFF1YWRyYW50ID0gKEFBQkIuZ2V0WSgpIDwgaG9yaXpvbnRhbE1pZHBvaW50ICYmIEFBQkIuZ2V0WSgpICsgQUFCQi5nZXRIZWlnaHQoKSA8IGhvcml6b250YWxNaWRwb2ludCk7XG4gICAgLy8gT2JqZWN0IGNhbiBjb21wbGV0ZWx5IGZpdCB3aXRoaW4gdGhlIGJvdHRvbSBxdWFkcmFudHNcbiAgICB2YXIgYm90dG9tUXVhZHJhbnQgPSAoQUFCQi5nZXRZKCkgPiBob3Jpem9udGFsTWlkcG9pbnQpO1xuICAgIFxuICAgIC8vIE9iamVjdCBjYW4gY29tcGxldGVseSBmaXQgd2l0aGluIHRoZSBsZWZ0IHF1YWRyYW50c1xuICAgIGlmIChBQUJCLmdldFgoKSA8IHZlcnRpY2FsTWlkcG9pbnQgJiYgQUFCQi5nZXRYKCkgKyBBQUJCLmdldFdpZHRoKCkgPCB2ZXJ0aWNhbE1pZHBvaW50KSB7XG4gICAgICAgIGlmICh0b3BRdWFkcmFudCkge1xuICAgICAgICAgICAgaW5kZXggPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGJvdHRvbVF1YWRyYW50KSB7XG4gICAgICAgICAgICBpbmRleCA9IDI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gT2JqZWN0IGNhbiBjb21wbGV0ZWx5IGZpdCB3aXRoaW4gdGhlIHJpZ2h0IHF1YWRyYW50c1xuICAgIGVsc2UgaWYgKEFBQkIuZ2V0WCgpID4gdmVydGljYWxNaWRwb2ludCkge1xuICAgICAgICBpZiAodG9wUXVhZHJhbnQpIHtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChib3R0b21RdWFkcmFudCkge1xuICAgICAgICAgICAgaW5kZXggPSAzO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBpbmRleDtcbn1cblxuUXVhZHRyZWUucHJvdG90eXBlLnJlbW92ZU9iamVjdCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdmFyIEFBQkIgPSB0aGlzLm9iamVjdHNbaW5kZXhdO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHRoaXMub2JqZWN0cy5zcGxpY2UoaW5kZXgsMSk7XG4gICAgfVxuICAgIHJldHVybiBBQUJCO1xufVxuXG5RdWFkdHJlZS5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24oQUFCQikge1xuICAgIC8vIEluc2VydCB0aGUgb2JqZWN0IGludG8gdGhlIHF1YWR0cmVlLiBJZiB0aGUgbm9kZSBleGNlZWRzIHRoZVxuICAgIC8vIGNhcGFjaXR5LCBpdCB3aWxsIHNwbGl0IGFuZCBhZGQgYWxsIG9iamVjdHMgdG8gdGhlaXJcbiAgICAvLyBjb3JyZXNwb25kaW5nIG5vZGVzLlxuICAgIGlmKHRoaXMubm9kZXMubGVuZ3RoICE9IDApIHtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5nZXRJbmRleChBQUJCKTtcbiAgICAgICAgXG4gICAgICAgIGlmKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGVzW2luZGV4XS5pbnNlcnQoQUFCQilcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHRoaXMub2JqZWN0cy5wdXNoKEFBQkIpO1xuICAgIFxuICAgIGlmKHRoaXMub2JqZWN0cy5sZW5ndGggPiB0aGlzLm1heE9iamVjdHMgJiYgdGhpcy5sZXZlbCA8IHRoaXMubWF4TGV2ZWxzKSB7XG4gICAgICAgIGlmKHRoaXMubm9kZXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc3BsaXQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB3aGlsZShpIDwgdGhpcy5vYmplY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5nZXRJbmRleCh0aGlzLm9iamVjdHNbaV0pO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2Rlc1tpbmRleF0uaW5zZXJ0KHRoaXMucmVtb3ZlT2JqZWN0KGkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuUXVhZHRyZWUucHJvdG90eXBlLmRldGVjdFBvdGVudGlhbENvbGxpc2lvbnMgPSBmdW5jdGlvbihwb3RlbnRpYWxDb2xsaXNpb25zLCBBQUJCKSB7XG5cdC8vIFJldHVybiBhbGwgb2JqZWN0cyB0aGF0IGNvdWxkIGNvbGxpZGUgd2l0aCB0aGUgZ2l2ZW4gb2JqZWN0LlxuICAgIHZhciBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoQUFCQik7XG4gICAgaWYoaW5kZXggIT0gLTEgJiYgdGhpcy5ub2Rlcy5sZW5ndGggIT0gMCkge1xuICAgICAgICB0aGlzLm5vZGVzW2luZGV4XS5kZXRlY3RQb3RlbnRpYWxDb2xsaXNpb25zKHBvdGVudGlhbENvbGxpc2lvbnMsQUFCQik7XG4gICAgfVxuICAgIHBvdGVudGlhbENvbGxpc2lvbnMuY29uY2F0KHRoaXMub2JqZWN0cyk7XG4gICAgXG4gICAgcmV0dXJuIHBvdGVudGlhbENvbGxpc2lvbnM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUXVhZHRyZWU7XG5cblxuIiwidmFyIFF1YWR0cmVlID0gcmVxdWlyZShcIi4uL3F1YWR0cmVlLmpzXCIpO1xudmFyIEFBQkIgPSByZXF1aXJlKFwiLi4vYWFiYi5qc1wiKTtcblxudmFyIHNjYWxlID0gZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yKFwiI3NjYWxlXCIpLnZhbHVlO1xudmFyIHJlc2V0QnV0dG9uID0gZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yKFwiI3Jlc2V0XCIpO1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvcihcIiNjYW52YXNcIik7XG52YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG52YXIgaW50ZXJ2YWw7XG52YXIgdGltZVN0ZXAgPSAwLjAxO1xuXG52YXIgYm91bmRzID0gbmV3IEFBQkIoWzAsMF0sMTAwLDEwMCk7XG52YXIgcXVhZHRyZWUgPSBuZXcgUXVhZHRyZWUoMCxib3VuZHMpO1xuXG52YXIgdGVtcENvcm5lcjtcblxudmFyIG9yaWdpbkNhcnQgPSBbMCwwXTtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBpbnRlcnZhbCA9IHNldEludGVydmFsKGRyYXdBbGwsMTAwMCp0aW1lU3RlcCk7XG4gICAgXG4gICAgcmVzZXRCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIscmVzZXQpO1xuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsZ2V0Qm91bmRpbmdCb3hDb3JuZXIsZmFsc2UpO1xuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLGFkZEJvdW5kaW5nQm94LGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gZHJhd0FsbCgpIHtcbiAgICBzY2FsZSA9IGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvcihcIiNzY2FsZVwiKS52YWx1ZTtcbiAgICBjYW52YXMud2lkdGggPSBzY2FsZSpib3VuZHMuZ2V0V2lkdGgoKTtcbiAgICBjYW52YXMuaGVpZ2h0ID0gc2NhbGUqYm91bmRzLmdldEhlaWdodCgpO1xuICAgIFxuICAgIGNvbnRleHQuZmlsbFN0eWxlID0gXCJyZ2IoMjU1LCAyNTUsIDI1NSlcIjtcbiAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIGJvdW5kcy5nZXRXaWR0aCgpKnNjYWxlLCBib3VuZHMuZ2V0SGVpZ2h0KCkqc2NhbGUpO1xuICAgIFxuICAgIGRyYXdPYmplY3RzKHF1YWR0cmVlKTtcbiAgICBkcmF3UXVhZHRyZWUocXVhZHRyZWUpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0Q2FydGVzaWFuVG9QaXhlbHMocG9pbnQpIHtcbiAgICB2YXIgbmV3UG9pbnQgPSBbMCwgMF07XG4gICAgXG4gICAgbmV3UG9pbnRbMF0gPSBzY2FsZSoocG9pbnRbMF0rb3JpZ2luQ2FydFswXSk7XG4gICAgbmV3UG9pbnRbMV0gPSBjYW52YXMuaGVpZ2h0K3NjYWxlKihvcmlnaW5DYXJ0WzFdLXBvaW50WzFdKTtcbiAgICBcbiAgICByZXR1cm4gbmV3UG9pbnQ7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRQaXhlbHNUb0NhcnRlc2lhbihwb2ludCkge1xuICAgIHZhciBuZXdQb2ludCA9IFswLCAwXTtcbiAgICBcbiAgICBuZXdQb2ludFswXSA9IHBvaW50WzBdL3NjYWxlLW9yaWdpbkNhcnRbMF07XG4gICAgbmV3UG9pbnRbMV0gPSBvcmlnaW5DYXJ0WzFdLShwb2ludFsxXS1jYW52YXMuaGVpZ2h0KS9zY2FsZTtcbiAgICBcbiAgICByZXR1cm4gbmV3UG9pbnQ7XG59XG5cbmZ1bmN0aW9uIGRyYXdQb2ludChwb3NpdGlvbixjb2xvcikge1xuICAgIHZhciBwb3MgPSBjb252ZXJ0Q2FydGVzaWFuVG9QaXhlbHMocG9zaXRpb24pO1xuICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjsvL1wicmdiKDAsIDAsIDI1NSlcIlxuICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgY29udGV4dC5hcmMocG9zWzBdLHBvc1sxXSwzKnNjYWxlLzIwMCwwLDIqTWF0aC5QSSk7XG4gICAgY29udGV4dC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gZHJhd0xpbmUoc3RhcnRDYXJ0LCBlbmRDYXJ0LCBjb2xvcikge1xuICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjsvL1wicmdiKDI1NSwgMCwgMClcIlxuICAgIHZhciBzdGFydCA9IGNvbnZlcnRDYXJ0ZXNpYW5Ub1BpeGVscyhzdGFydENhcnQpO1xuICAgIHZhciBlbmQgPSBjb252ZXJ0Q2FydGVzaWFuVG9QaXhlbHMoZW5kQ2FydCk7XG4gICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICBjb250ZXh0Lm1vdmVUbyhzdGFydFswXSxzdGFydFsxXSk7XG4gICAgY29udGV4dC5saW5lVG8oZW5kWzBdLGVuZFsxXSk7XG4gICAgY29udGV4dC5zdHJva2UoKTtcbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xufVxuXG5mdW5jdGlvbiBkcmF3Qm94KG1pbixtYXgsY29sb3IpIHtcbiAgICB2YXIgcG9pbnQxID0gW21pblswXSwgbWluWzFdXTtcbiAgICB2YXIgcG9pbnQyID0gW21heFswXSwgbWluWzFdXTtcbiAgICB2YXIgcG9pbnQzID0gW21heFswXSwgbWF4WzFdXTtcbiAgICB2YXIgcG9pbnQ0ID0gW21pblswXSwgbWF4WzFdXTtcbiAgICBcbiAgICBkcmF3TGluZShwb2ludDEscG9pbnQyLGNvbG9yKTtcbiAgICBkcmF3TGluZShwb2ludDIscG9pbnQzLGNvbG9yKTtcbiAgICBkcmF3TGluZShwb2ludDMscG9pbnQ0LGNvbG9yKTtcbiAgICBkcmF3TGluZShwb2ludDQscG9pbnQxLGNvbG9yKTtcbn1cblxuZnVuY3Rpb24gZHJhd1F1YWR0cmVlKHRyZWUpIHtcbiAgICBkcmF3Qm94KHRyZWUuYm91bmRzLm1pbix0cmVlLmJvdW5kcy5tYXgsXCJyZ2IoMjU1LCAwLCAwKVwiKTtcbiAgICBmb3IodmFyIGk9MDsgaSA8IHRyZWUubm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZHJhd1F1YWR0cmVlKHRyZWUubm9kZXNbaV0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhd09iamVjdHModHJlZSkge1xuICAgIGZvcih2YXIgaT0wOyBpIDwgdHJlZS5vYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRyYXdCb3godHJlZS5vYmplY3RzW2ldLm1pbix0cmVlLm9iamVjdHNbaV0ubWF4LFwicmdiKDAsIDAsIDI1NSlcIik7XG4gICAgfVxuICAgIGZvcih2YXIgaT0wOyBpIDwgdHJlZS5ub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkcmF3T2JqZWN0cyh0cmVlLm5vZGVzW2ldKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgIHF1YWR0cmVlLmNsZWFyKCk7XG4gICAgY29uc29sZS5sb2coXCJSZXNldCFcIik7XG4gICAgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChkcmF3QWxsLDEwMDAqdGltZVN0ZXApO1xufVxuXG5mdW5jdGlvbiBnZXRCb3VuZGluZ0JveENvcm5lcihldmVudCkge1xuICAgIHZhciBwb2ludCA9IGNvbnZlcnRQaXhlbHNUb0NhcnRlc2lhbihbZXZlbnQucGFnZVgtY2FudmFzLm9mZnNldExlZnQsIGV2ZW50LnBhZ2VZLWNhbnZhcy5vZmZzZXRUb3BdKTtcbiAgICBjb25zb2xlLmxvZyhcIkNvcm5lciBhZGRlZCBhdCAoXCIrcG9pbnRbMF0rXCIsIFwiK3BvaW50WzFdK1wiKVwiKTtcbiAgICB0ZW1wQ29ybmVyID0gcG9pbnQ7XG59XG5cbmZ1bmN0aW9uIGFkZEJvdW5kaW5nQm94KGV2ZW50KSB7XG4gICAgdmFyIGNvcm5lciA9IGNvbnZlcnRQaXhlbHNUb0NhcnRlc2lhbihbZXZlbnQucGFnZVgtY2FudmFzLm9mZnNldExlZnQsIGV2ZW50LnBhZ2VZLWNhbnZhcy5vZmZzZXRUb3BdKTtcbiAgICBjb25zb2xlLmxvZyhcIkNvcm5lciBhZGRlZCBhdCAoXCIrY29ybmVyWzBdK1wiLCBcIitjb3JuZXJbMV0rXCIpXCIpO1xuICAgIFxuICAgIHZhciBtaW5YID0gTWF0aC5taW4odGVtcENvcm5lclswXSxjb3JuZXJbMF0pO1xuICAgIHZhciBtaW5ZID0gTWF0aC5taW4odGVtcENvcm5lclsxXSxjb3JuZXJbMV0pO1xuICAgIHZhciBtYXhYID0gTWF0aC5tYXgodGVtcENvcm5lclswXSxjb3JuZXJbMF0pO1xuICAgIHZhciBtYXhZID0gTWF0aC5tYXgodGVtcENvcm5lclsxXSxjb3JuZXJbMV0pO1xuICAgIFxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIoW21pblgsbWluWV0sbWF4WC1taW5YLG1heFktbWluWSk7XG4gICAgXG4gICAgcXVhZHRyZWUuaW5zZXJ0KGFhYmIpO1xufVxuXG5pbml0aWFsaXplKClcblxuXG4iXX0=
;