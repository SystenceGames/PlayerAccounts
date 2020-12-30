import settings = require('../config/Settings');
import logger = require('../logger');
import I = require('../Interfaces');
import Q = require('q');

class RequestPointController {
    public requestPointsBySocketId: { [key: string]: number } = {};

    private decreaseLoginAttemptPoints() {
        for (let socketId in this.requestPointsBySocketId) {
            if (this.requestPointsBySocketId[socketId] > 0) {
                this.requestPointsBySocketId[socketId] = Math.max(this.requestPointsBySocketId[socketId] - settings.decreaseRequestPoints, 0);
            }
        }
        setTimeout(this.decreaseLoginAttemptPoints.bind(this), settings.decreaseRequestPointsInterval);
    }

    public init() {
        setTimeout(this.decreaseLoginAttemptPoints.bind(this), settings.decreaseRequestPointsInterval);
    }

    public increaseRequestPoints(delta: number, socketId: string) {
        if (this.requestPointsBySocketId[socketId] == null) {
            this.requestPointsBySocketId[socketId] = delta;
        } else {
            this.requestPointsBySocketId[socketId] += delta;
        }
    }

    public shouldSoftBlock(socketId: string) {
        if (this.requestPointsBySocketId[socketId] > settings.softBlockRequestPoints) {
            return true;
        }
        return false;
    }

    public shouldHardBlock(socketId: string) {
        if (this.requestPointsBySocketId[socketId] > settings.hardBlockRequestPoints) {
            return true;
        }
        return false;
    }
}

export = RequestPointController;