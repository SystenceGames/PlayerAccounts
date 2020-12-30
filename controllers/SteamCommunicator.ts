import I = require('../Interfaces');
import settings = require('../config/Settings');
import request = require('request');
import Q = require('q');
import logger = require('../logger');
import TMError = require('../TMError');

class SteamCommunicator implements I.SteamCommunicator {

    static AUTHENTICATE_USER_TICKET_URL: string = "https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/";

    public authenticateUserTicket(ticket: string): Q.Promise<I.AuthenticateUserTicketResponse> {
        let deferred = Q.defer<I.AuthenticateUserTicketResponse>();

        let inputJson: any = {
            appid: settings.steamAppId,
            ticket: ticket
        };

        let inputJsonString: string = encodeURIComponent(JSON.stringify(inputJson));

        let uri: string = SteamCommunicator.AUTHENTICATE_USER_TICKET_URL + "?key=" + settings.steamWebApiKey + "&appid=" + settings.steamAppId + "&ticket=" + ticket;

        request.get(uri, (error: any, response: any, body: any) => {
            if (error) {
                logger.error("call to SteamCommunicator to AuthenticateUserTicket failed, error was received", error);
                deferred.reject(error);
                return;
            }
            else if (!response) {
                logger.error("call to SteamCommunicator to AuthenticateUserTicket failed, no response was received");
                deferred.reject(new Error("call to PlayerStats to deletePlayerStats failed, no response was received"));
                return;
            }
            else if (response.statusCode != 200) {
                logger.error("call to SteamCommunicator to AuthenticateUserTicket failed, statusCode was: " + response.statusCode);
                deferred.reject(new Error("call to SteamCommunicator to AuthenticateUserTicket failed, statusCode was: " + response.statusCode));
                return;
            }

            if (body == null) {
                logger.error("call to SteamCommunicator to AuthenticateUserTicket failed, response from steam was null");
                deferred.reject(new Error("call to SteamCommunicator to AuthenticateUserTicket failed, response from steam was null"));
                return;
            }

            let responseBody: any = JSON.parse(body);

            if (responseBody.response.params.result != "OK") {
                logger.error("call to SteamCommunicator to AuthenticateUserTicket failed, result from steam was: " + body.response.params.result);
                deferred.reject(new Error("call to SteamCommunicator to AuthenticateUserTicket failed, result from steam was: " + body.response.params.result));
                return;
            }

            let authenticateUserTicketResponse: I.AuthenticateUserTicketResponse = {
                steamId: responseBody.response.params.steamid
            };

            logger.info("Steam user identified successfully");

            deferred.resolve(authenticateUserTicketResponse);
        });

        return deferred.promise;
    }
}

export = SteamCommunicator;