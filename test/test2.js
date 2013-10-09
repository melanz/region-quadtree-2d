var Quadtree = require("../quadtree.js");
var AABB = require("../aabb.js");

var bounds = new AABB([0,0], 100, 100);

var quadtree = new Quadtree(0,bounds);
var aabb1 = new AABB([1,1],1,1);
quadtree.insert(aabb1);
var aabb2 = new AABB([10,10],1,1);
quadtree.insert(aabb2);

var potentialCollisions = new Array();
quadtree.detectPotentialCollisions = function(potentialCollisions, aabb1);

console.log(potentialCollisions);
//Prints out potential collisions



