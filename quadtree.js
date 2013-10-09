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
        potentialCollisions = this.nodes[index].detectPotentialCollisions(potentialCollisions,AABB);
    }
    potentialCollisions = potentialCollisions.concat(this.objects);
    
    return potentialCollisions;
}

module.exports = Quadtree;


