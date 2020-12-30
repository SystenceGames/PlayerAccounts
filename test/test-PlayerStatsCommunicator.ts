import assert = require('assert');
import sinon = require('sinon');
import should = require('should');
import request = require('request');
import Q = require('q');
import PlayerStatsCommunicator = require('../controllers/PlayerStatsCommunicator');
import I = require('../Interfaces');
import TestFactory = require('./TestFactory');

describe("PlayerStatsCommunicator", () => {
    let playerStatsCommunicator: PlayerStatsCommunicator;
    let sandbox: any;
    let stubPost: any;
    let deleteUserRequest: I.DeleteUserRequest;
    let user: I.User;
    let expectedCreateNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse;
    let errorResponse: I.CreateNewPlayerStatsResponse;
    let fakeCreateNewPlayerStatsUrl: string = "fakeCreateNewPlayerStatsUrl";

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        stubPost = sandbox.stub(request, 'post').callsArgWithAsync(2, null, { statusCode: 200 }, {});

        deleteUserRequest = {
            playerName: TestFactory.fakePlayerName
        };

        user = {
            email: TestFactory.fakeEmail,
            name: TestFactory.fakePlayerName,
            password: TestFactory.fakePassword,
            steamId: TestFactory.fakeSteamId,
            uniqueName: TestFactory.fakePlayerUniqueName,
            verificationToken: TestFactory.fakeGuid,
            verified: false,
            passwordResetToken: TestFactory.fakePasswordResetToken,
            passwordResetExpiration: TestFactory.expiration
        };

        errorResponse = { error: PlayerStatsCommunicator.FAILED_ACCOUNT_CREATION_ERROR, user: user };

        expectedCreateNewPlayerStatsResponse = {
            error: null,
            user: user
        };

        playerStatsCommunicator = new PlayerStatsCommunicator();
    });

    it("1. callDeletePlayerStats", () => {
        return playerStatsCommunicator.callDeletePlayerStats(user).then((actualResponse) => {
            should.deepEqual(actualResponse, user);
        });
    });

    //it("1. callDeletePlayerStats failure", () => {
    //    assert.fail("NYE");

    //    return playerStatsCommunicator.callDeletePlayerStats(user).then((actualResponse) => {
    //        should.deepEqual(actualResponse, promiseOfIUser);
    //    });
    //});

    it("1. callCreatePlayerStats", () => {
        return playerStatsCommunicator.callCreateNewPlayerStats(user).then((actualCreateNewPlayerStatsResponse) => {
            sinon.assert.calledOnce(stubPost);
            should.deepEqual(actualCreateNewPlayerStatsResponse, expectedCreateNewPlayerStatsResponse);
        });
    });

    it("2. callCreatePlayerStats error from post", () => {
        stubPost.callsArgWithAsync(2, "I am an error", { elapsedTime: 10 }, {});

        return playerStatsCommunicator.callCreateNewPlayerStats(user).then((actualCreateNewPlayerStatsResponse) => {
            should.deepEqual(actualCreateNewPlayerStatsResponse, errorResponse);
        });
    });

    it("3. callCreatePlayerStats no response from post", () => {
        stubPost.callsArgWithAsync(2, null, { elapsedTime: 10 }, null);

        return playerStatsCommunicator.callCreateNewPlayerStats(user).then((actualResponse) => {
            should.deepEqual(actualResponse, errorResponse);
        });
    });

    it("4. callCreatePlayerStats bad status code from post", () => {
        stubPost.callsArgWithAsync(2, null, { statusCode: 404, elapsedTime: 10 }, null);

        return playerStatsCommunicator.callCreateNewPlayerStats(user).then((actualResponse) => {
            should.deepEqual(actualResponse, errorResponse);
        });
    });

    afterEach(function () {
        sandbox.restore();
    });
});
