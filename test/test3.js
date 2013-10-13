var Quadtree = require("../quadtree.js");
var AABB = require("../aabb.js");

var bounds = new AABB([0,0], 100, 100);

var quadtree = new Quadtree(0,bounds);
var aabb1 = new AABB([1,1],1,1);
quadtree.insert(aabb1);
var aabb2 = new AABB([51,1],1,1);
quadtree.insert(aabb2);
var aabb3 = new AABB([51,51],1,1);
quadtree.insert(aabb3);

var potentialCollisions = [];
potentialCollisions = quadtree.detectPotentialCollisions(potentialCollisions, aabb1);

console.log(potentialCollisions);

var aabb4 = new AABB([1,51],1,1);
quadtree.insert(aabb4);

potentialCollisions = [];
potentialCollisions = quadtree.detectPotentialCollisions(potentialCollisions, aabb1);

console.log(potentialCollisions);