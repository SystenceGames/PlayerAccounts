import mandrill = require('mandrill-api');

import settings = require('../config/Settings');
import logger = require('../logger');
import I = require('../Interfaces');
import Q = require('q');
import TMError = require('../TMError');

class MandrillApiMailController implements I.MailController {
    private static SEND_DATE_IN_PAST: string = "2000-06-02 04:02:01";

    private mandrillClient: mandrill.Mandrill;

    constructor() {

    }

    public init() {
        this.mandrillClient = new mandrill.Mandrill(settings.mandrillApiKey);
    }

    public sendMailTo(emailAddress: string, subject: string, messageBody: string): Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        let message: any = {
            "text": messageBody,
            "subject": subject,
            "from_email": settings.emailFromAddress,
            "from_name": "The Maestros Accounts",
            "to": [{
                "email": emailAddress,
                "name": "Maestros Player", // TODO: playerName?
                "type": "to"
            }],
            "headers": {
                "Reply-To": "noreply@maestrosgame.com"
            },
            "metadata": {
                "website": "https://maestrosgame.com"
            },
        };

        let params: any = { "message": message, "async": true, "ip_pool": "Main Pool", "send_at": MandrillApiMailController.SEND_DATE_IN_PAST};

        this.mandrillClient.messages.send(params, (json: Object) => {
            // onSuccess
            logger.debug("Mandrill Message sent successfully", JSON.stringify(json));
            deferred.resolve();
        }, (json: Object) => {
            // onError
            logger.error("Mandrill Message errored", JSON.stringify(json));
            deferred.reject(new TMError(true, "Error sending verification email to your address. Check your address or try again later."));
        });
        return deferred.promise;
    }
}

export = MandrillApiMailController;