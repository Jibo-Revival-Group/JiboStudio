import jibo = require('jibo');

// Custom class extends Behavior
class TestDebugBehavior extends jibo.bt.Behavior {
    private _status:jibo.bt.Status;
    constructor(options) {
        super(options);
        this._status = jibo.bt.Status.INVALID;
    }
    start() {
        this._status = jibo.bt.Status.SUCCEEDED;
        // @if DEBUG
        console.log('Debug: ' + this.options.text);
        // @endif
        return true;
    }
    update() {
        return this._status;
    }
}

export default TestDebugBehavior;