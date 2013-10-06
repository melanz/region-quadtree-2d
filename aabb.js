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