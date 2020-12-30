import I = require('../Interfaces');
import settings = require('../config/Settings');
import request = require('request');
import Q = require('q');
import logger = require('../logger');
import TMError = require('../TMError');

class PlayerStatsCommunicator implements I.PlayerStatsCommunicator {
    public static FAILED_ACCOUNT_CREATION_MESSAGE: string = "Failed to create account stats. Try a different name or try again later.";
    public static FAILED_ACCOUNT_CREATION_ERROR: Error = new TMError(true, PlayerStatsCommunicator.FAILED_ACCOUNT_CREATION_MESSAGE);

    public createFailedAccountCreationResponse(user: I.User): I.CreateNewPlayerStatsResponse {
        let createNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse = {
            error: PlayerStatsCommunicator.FAILED_ACCOUNT_CREATION_ERROR,
            user: user
        };
        return createNewPlayerStatsResponse;
    }

    public callDeletePlayerStats(user: I.User): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();

        let requestBody: any = { playerName: user.name };

        this.call(settings.deletePlayerStatsUrl, requestBody, (error: any, response: any, body: any) => {
            if (error) {
                logger.error("call to PlayerStats to deletePlayerStats failed, error was received", error);
                deferred.reject(error);
            }
            else if (!response) {
                logger.error("call to PlayerStats to deletePlayerStats failed, no response was received");
                deferred.reject(new Error("call to PlayerStats to deletePlayerStats failed, no response was received"));
            }
            else if (response.statusCode != 200) {
                logger.error("call to PlayerStats to deletePlayerStats failed, statusCode was: " + response.statusCode);
                deferred.reject(new Error("call to PlayerStats to deletePlayerStats failed, statusCode was: " + response.statusCode));
            }

            deferred.resolve(user);
        });

        return deferred.promise;
    }

    public callCreateNewPlayerStats(user: I.User): Q.Promise<I.CreateNewPlayerStatsResponse> {
        let deferred = Q.defer<I.CreateNewPlayerStatsResponse>();

        let requestBody: any = { playerName: user.uniqueName };
        this.call(settings.createNewPlayerStatsUrl, requestBody, (error: any, response: any, body: any) => {
            if (error) {
                logger.error("call to PlayerStats to createNewPlayerStats failed", error);
                deferred.resolve(this.createFailedAccountCreationResponse(user));
            }
            else if (!response) {
                logger.error("call to PlayerStats to createNewPlayerStats failed, no response was received");
                deferred.resolve(this.createFailedAccountCreationResponse(user));
            }
            else if (response.statusCode != 200) {
                logger.error("call to PlayerStats to createNewPlayerStats failed, statusCode was: " + response.statusCode);
                deferred.resolve(this.createFailedAccountCreationResponse(user));
            }

            let createNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse = {
                error: null,
                user: user
            };

            deferred.resolve(createNewPlayerStatsResponse);
        });

        return deferred.promise;
	}

	public callGetDbPlayerStats(user: I.User): Q.Promise<any> {
		let deferred = Q.defer<any>();

		let requestBody: any = { playerName: user.uniqueName };

        this.call(settings.getDbPlayerStatsUrl, requestBody, (error: any, response: any, body: any) => {
			if (error) {
				logger.error("call to PlayerStats to getDbPlayerStats failed, error was received", error);
				deferred.reject(error);
			}
			else if (!response) {
				logger.error("call to PlayerStats to getDbPlayerStats failed, no response was received");
				deferred.reject(new Error("call to PlayerStats to getDbPlayerStats failed, no response was received"));
			}
			else if (response.statusCode != 200) {
				logger.error("call to PlayerStats to getDbPlayerStats failed, statusCode was: " + response.statusCode);
				deferred.reject(new Error("call to PlayerStats to getDbPlayerStats failed, statusCode was: " + response.statusCode));
			}

			deferred.resolve(body);
		});

		return deferred.promise;
	}

	public callEditPlayerStats(req: any): Q.Promise<any> {
        let deferred = Q.defer<any>();

        this.call(settings.editPlayerStatsUrl, req, (error: any, response: any, body: any) => {
			if (error) {
				logger.error("call to PlayerStats to editPlayerStats failed, error was received", error);
				deferred.reject(error);
			}
			else if (!response) {
				logger.error("call to PlayerStats to editPlayerStats failed, no response was received");
				deferred.reject(new Error("call to PlayerStats to editPlayerStats failed, no response was received"));
			}
			else if (response.statusCode != 200) {
				logger.error("call to PlayerStats to editPlayerStats failed, statusCode was: " + response.statusCode);
				deferred.reject(new Error("call to PlayerStats to editPlayerStats failed, statusCode was: " + response.statusCode));
			}

			deferred.resolve(body);
		});

		return deferred.promise;
    }

    private call(url: string, body: any, callback: any) {
        let requestOptions: request.CoreOptions = {
            body: "playerStats=" + JSON.stringify(body),
            time: true,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }

        request.post(url, requestOptions, (error: any, response: any, body: any) => {
            logger.info("OutboundCall", { url: url, durationMs: response.elapsedTime, statusCode: response.statusCode });
            callback(error, response, body);
        });
    }
}

export = PlayerStatsCommunicator;