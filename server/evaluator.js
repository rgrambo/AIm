module.exports = function(funcToCall) {
    eval(funcToCall);
    module.exports.getRotation = eval("getRotation");
    module.exports.getGunRotation = eval("getGunRotation");
};