function ProcessLogger() {

}

ProcessLogger.prototype.performio = function(method, args) {
    process.send({
        channel: "log",
        data: {
            method: method,
            contents: args
        }
    });
}

ProcessLogger.prototype.log = function() {
    var args = [].slice.call(arguments);
    this.performio("log", args);
}

ProcessLogger.prototype.error = function() {
    var args = [].slice.call(arguments);
    this.performio("error", args);
}

ProcessLogger.prototype.warn = function() {
    var args = [].slice.call(arguments);
    this.performio("error", args);
}

module.exports = ProcessLogger;
