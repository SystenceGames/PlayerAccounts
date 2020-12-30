import nodemailer = require('nodemailer');
import settings = require('../config/Settings');
import logger = require('../logger');
import I = require('../Interfaces');
import Q = require('q');
import TMError = require('../TMError');

class MailController implements I.MailController {
    private emailTransporter: nodemailer.Transporter;
    public static EMAIL_VERIFICATION_ERROR: TMError = new TMError(true, "Error sending verification email, check the email address or try again later");

    public init() {
        let emailService: string = settings.emailService;
        let emailUser: string = settings.emailUser;
        let emailPassword: string = settings.emailPassword;

        this.emailTransporter = nodemailer.createTransport(({
            service: emailService,
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        }));
        logger.info("initializing email transporter", { emailService: emailService, emailUser: emailUser, emailPassword: emailPassword }); 
    }

    public sendMailTo(emailAddress:string, subject:string, messageBody:string): Q.Promise<void> {
        let deferred: Q.Deferred<void> = Q.defer<void>();

        let mailOptions: nodemailer.SendMailOptions = {
            from: settings.emailFromAddress,
            to: emailAddress,
            subject: subject,
            text: messageBody
        };

        this.emailTransporter.sendMail(mailOptions, (error: any, info: any) => {
            if (error) {
                logger.error("Error sending mail: " + error.message, error);
                deferred.reject(MailController.EMAIL_VERIFICATION_ERROR);
                return;
            }

            if (info) {
                logger.info("There was info sending  mail" + info.response);
            }

            deferred.resolve(null);
        });

        return deferred.promise;
    }
}

export = MailController;