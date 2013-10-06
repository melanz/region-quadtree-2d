var Quadtree = require("../quadtree.js");
var AABB = require("../aabb.js");

var bounds = new AABB([0,0], 100, 100);

console.log(bounds.getWidth());

var quadtree = new Quadtree(0,bounds);
quadtree.insert(new AABB([1,1],1,1));



