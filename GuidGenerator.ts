import uuid = require('node-uuid');
import I = require('./Interfaces');

class GuidGenerator implements I.GuidGenerator {
    public generate():string {
        return uuid.v4();
    }
}

export = GuidGenerator;