import mongoose = require('mongoose');
import I = require('./Interfaces');
import logger = require('./logger');

class LoggingModel<T extends mongoose.Document> {

    private Model: mongoose.Model<T>;
    private readonly standardLibraryProxy: I.StandardLibraryProxy;

    constructor(model: mongoose.Model<T>, standardLibraryProxy: I.StandardLibraryProxy) {
        this.Model = model;
        this.standardLibraryProxy = standardLibraryProxy;
    }

    public findOne(conditions?: Object, callback?: (err: any, res: T) => void): mongoose.DocumentQuery<T, T> {
        const startTime: number = this.standardLibraryProxy.getCurrentDate().getTime();
        return this.Model.findOne(conditions, (err: any, res: T) => {
            callback(err, res);
            const durationMs: number = this.standardLibraryProxy.getCurrentDate().getTime() - startTime;
            logger.info("MongoCall", { queryType: "findOne", conditions: JSON.stringify(conditions), durationMs: durationMs });
        });
    }

    public create(sourceObject:any): T {
        return new this.Model(sourceObject);
    }
}

export = LoggingModel;