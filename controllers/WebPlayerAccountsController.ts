import assert = require('assert');
import Q = require('q');
let bcrypt = require('bcrypt');
let jwt = require('jsonwebtoken');
import I = require('../Interfaces');
import settings = require('../config/Settings');
import logger = require('../logger');
import TMError = require('../TMError');
import tmassert = require('../TMAssert');

class WebPlayerAccountsController {
    public static ACCOUNT_VERIFICATION_EMAIL_SUBJECT: string = "The Maestros Account Verification";
    public static PASSWORD_RESET_EMAIL_SUBJECT: string = "The Maestros Account Password Reset";
    public static EMAIL_VERIFICATION_ERROR: TMError = new TMError(true, "Error sending verification email, check the email address or try again later");
    public static GENERIC_ERROR: TMError = new TMError(true, "There was an error processing your request.");

    private userController: I.UserController;
    private playerStatsCommunicator: I.PlayerStatsCommunicator;
    private mailController: I.MailController;
    private steamCommunicator: I.SteamCommunicator;
    private mandrillApiMailController: I.MailController;

    constructor(userController: I.UserController, playerStatsCommunicator: I.PlayerStatsCommunicator, mailController: I.MailController, steamCommunicator: I.SteamCommunicator, mandrillApiMailController: I.MailController) {
        this.userController = userController;
        this.playerStatsCommunicator = playerStatsCommunicator;
        this.mailController = mailController;
        this.steamCommunicator = steamCommunicator;
        this.mandrillApiMailController = mandrillApiMailController;
    }
    
    public generatePasswordResetEmailBody(email: string, passwordResetToken: string): string {
        let callbackUrl: string = encodeURIComponent("https://" + settings.callbackBaseUrl + ":" + settings.port + settings.resetPasswordPath);
        let passwordResetPage: string = settings.passwordResetPageBaseUrl + "?email=" + email + "&passwordResetToken=" + passwordResetToken + "&callbackUrl=" + callbackUrl;
        return "Hello,\n" +
            "Please click the link below or paste it into your browser to begin resetting your password.  This link will expire in " + settings.passwordResetTokenDurationHours + " hours.\n\n" +
            passwordResetPage;
    }

    public generateAccountVerificationEmailBody(playerName: string, email: string, verificationToken: string): string {
        let callbackUrl: string = encodeURIComponent("https://" + settings.callbackBaseUrl + ":" + settings.port + settings.verifyEmailPath);
        let verifyEmailPage: string = settings.emailVerificationBaseUrl + "?email=" + email + "&verificationToken=" + verificationToken + "&callbackUrl=" + callbackUrl;
        return "Hello " + playerName + ",\n\n" +
            "Please click the link below or paste it in your browser's address bar to verify your Maestros account.\n\n" + 
            verifyEmailPage;
    }

    public login4(req: any, res: any): Q.Promise<I.PlayerAccountsResponse> {
        return Q.fcall(() => {
            assert(req.body.steamAuthSessionTicket, 'steamAuthSessionTicket is missing');
            assert(typeof req.body.steamAuthSessionTicket === 'string', 'steamAuthSessionTicket is missing');
        }).then(() => {
            return this.steamCommunicator.authenticateUserTicket(req.body.steamAuthSessionTicket);
        }).then((authenticateUserTicketResponse: I.AuthenticateUserTicketResponse) => {
            return this.userController.loginUser4(authenticateUserTicketResponse.steamId);
        }).then((user: I.User) => {
            let jwt: string = this._generateJWT(user);
            logger.info("User Logged In 4", { codepath: "WebPlayerAccountsController.login4", email: user.email });
            let playerAccountsResponse: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: user.name, email: user.email };
            return playerAccountsResponse;
        });
    }

    public login3(req: any, res: any): Q.Promise<I.PlayerAccountsResponse> {
        return Q.fcall(() => {
            assert(req.body.email, 'email is missing');
            assert(typeof req.body.email === 'string', 'email is missing');
            assert(req.body.password, 'password is missing');
            assert(typeof req.body.password === 'string', 'password is missing');
        }).then(() => {
            return this.userController.loginUser3(req.body.email.toUpperCase(), req.body.password);
        }).then((user: I.User) => {
            let jwt:string = this._generateJWT(user);
            logger.info("User Logged In 3", { codepath: "WebPlayerAccountsController.login3", email: req.body.email });
            let playerAccountsResponse: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: user.name, email: req.body.email };
            return playerAccountsResponse;
        });
    }

    public login(req: any, res: any): Q.Promise<I.PlayerAccountsResponse> {
        return Q.fcall(() => {
            assert(req.body.playerName, 'playerName is missing');
            assert(typeof req.body.playerName === 'string', 'playerName is missing');
            assert(req.body.password, 'password is missing');
            assert(typeof req.body.password === 'string', 'password is missing');
        }).then(() => {
            return this.userController.loginUser(req.body.playerName, req.body.password);
        }).then((user: I.User) => {
            let jwt:string = this._generateJWT(user);
            logger.info("User Logged In", { codepath: "WebPlayerAccountsController.login", playername: req.body.playerName });
            let playerAccountsResponse: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: user.name, email: user.email };
            return playerAccountsResponse;
        });
    }

    public deleteUser(req: any, res: any): Q.Promise<{}> {
        let deleteUserRequest: I.DeleteUserRequest = null;
        return Q.fcall(() => {
            assert(req.body.playerName, 'playerName is missing');
            deleteUserRequest = {
                playerName: req.body.playerName,
            };
            return deleteUserRequest;
        }).then((deleteUserRequest: I.DeleteUserRequest) => {
            return this.userController.deleteUser(deleteUserRequest);
        }).then((user: I.User) => {
            return this.playerStatsCommunicator.callDeletePlayerStats(user);
        }).then(() => {
            return { success: true };
        });
    }

    public deleteUserWithoutStats(req: any, res: any): Q.Promise<{}> {
        let deleteUserRequest: I.DeleteUserRequest = null;
        return Q.fcall(() => {
            assert(req.body.playerName, 'playerName is missing');
            deleteUserRequest = {
                playerName: req.body.playerName,
            };
            return deleteUserRequest;
        }).then((deleteUserRequest: I.DeleteUserRequest) => {
            this.userController.deleteUserWithoutStats(deleteUserRequest);
        }).then(() => {
            return { success: true };
        });
    }

    private validTypesForCreateUserRequest(body: any) {
        tmassert(body.playerName, 'playerName is missing');
        tmassert(typeof body.playerName === 'string', 'playerName is missing');
        tmassert(body.password, 'password is missing');
        tmassert(typeof body.password === 'string', 'password is missing');
        tmassert(body.email, 'email is missing');
        tmassert(typeof body.email === 'string', 'email is missing');
        tmassert(body.birthDate, 'birthDate is missing');
        tmassert(typeof body.birthDate === 'string', 'birthDate is missing');
        let birthDate = new Date(body.birthDate);
        tmassert(!isNaN(birthDate.getTime()), 'Error parsing birthDate: ' + body.birthDate);
    }

    private validTypesForCreateUser3Request(body: any) {
        tmassert(body.playerName, 'playerName is missing');
        tmassert(typeof body.playerName === 'string', 'playerName is missing');
        tmassert(body.password, 'password is missing');
        tmassert(typeof body.password === 'string', 'password is missing');
        tmassert(body.email, 'email is missing');
        tmassert(typeof body.email === 'string', 'email is missing');
        tmassert(body.birthDate, 'birthDate is missing');
        tmassert(typeof body.birthDate === 'string', 'birthDate is missing');
        let birthDate = new Date(body.birthDate);
        tmassert(!isNaN(birthDate.getTime()), 'Error parsing birthDate: ' + body.birthDate);
        tmassert(body.steamAuthSessionTicket, 'steamAuthSessionTicket is missing');
        tmassert(typeof body.steamAuthSessionTicket === 'string', 'steamAuthSessionTicket is missing');
    }

    public resendVerificationEmail(req: any, res: any) {
        return Q.fcall(() => {
            assert(req.body.email, 'email is missing');
            assert(typeof req.body.email === 'string', 'email is missing');
            return req.body.email;
        }).then((email: string) => {
            return this.userController.getUser(email.toUpperCase());
        }).then((user: I.User) => {
            return this.sendVerificationEmail(user);
        }).then(() => {
            return { success: true };
        });
    }

    private getMailController(): I.MailController {
        if (settings.useMandrillApi) {
            return this.mandrillApiMailController;
        } else {
            return this.mailController;
        }
    }

    private sendVerificationEmail(user: I.User): Q.Promise<void> {
        return this.getMailController().sendMailTo(user.email, WebPlayerAccountsController.ACCOUNT_VERIFICATION_EMAIL_SUBJECT, this.generateAccountVerificationEmailBody(user.name, user.email, user.verificationToken));
    }

    public create3(req: any, res: any): Q.Promise<I.PlayerAccountsResponse> {
        let createUser3Request: I.CreateUser3Request;
        return Q.fcall(() => {
            this.validTypesForCreateUser3Request(req.body);
            createUser3Request = {
                name: req.body.playerName,
                password: req.body.password,
                email: req.body.email.toUpperCase(),
                steamAuthSessionTicket: req.body.steamAuthSessionTicket,
                birthdate: new Date(req.body.birthDate)
            };
            return createUser3Request;
        }).then((createUser3Request: I.CreateUser3Request) => {
            return this.steamCommunicator.authenticateUserTicket(createUser3Request.steamAuthSessionTicket);
        }).then((authenticateUserTicketResponse: I.AuthenticateUserTicketResponse) => {
            let createUser: I.CreateUser = {
                birthdate: createUser3Request.birthdate,
                email: createUser3Request.email,
                name: createUser3Request.name,
                password: createUser3Request.password,
                steamId: authenticateUserTicketResponse.steamId
            };
            return this.userController.createUser(createUser);
        }).then((user: I.User) => {
            return this.playerStatsCommunicator.callCreateNewPlayerStats(user);
        }).then((createNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse) => {
            return this.handleCreateNewPlayerStatsResponse(createNewPlayerStatsResponse);
        }).then((user: I.User) => {
            return this.sendVerificationEmail(user).then((): I.User => {
                return user;
            });
        }).then((user: I.User) => {
            let jwt: string = this._generateJWT(user);
            logger.info("User Created", { codepath: "WebPlayerAccountsController.login", playername: req.body.playerName });
            let playerAccountsResponse: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: user.name, email: user.email };
            return playerAccountsResponse;
        }, (error: any): Q.Promise<I.PlayerAccountsResponse> => {
            if (error.isPlayerFacing === true) {
                return Q.reject<I.PlayerAccountsResponse>(error);
            } else {
                logger.error("There was an error in account creation: " + error.message, error);
                return Q.reject<I.PlayerAccountsResponse>(error);
            }
        });
    }

    public create(req: any, res: any): Q.Promise<I.PlayerAccountsResponse> {
        let createUserRequest: I.CreateUserRequest;
        return Q.fcall(() => {
            this.validTypesForCreateUserRequest(req.body);
            createUserRequest = {
                name: req.body.playerName,
                password: req.body.password,
                email: req.body.email.toUpperCase(),
                birthdate: new Date(req.body.birthDate)
            };
            return createUserRequest;
        }).then((createUserRequest: I.CreateUserRequest) => {
            let createUser: I.CreateUser = {
                birthdate: createUserRequest.birthdate,
                email: createUserRequest.email,
                name: createUserRequest.name,
                password: createUserRequest.password
            };
            return this.userController.createUser(createUser);;
        }).then((user: I.User) => {
            return this.playerStatsCommunicator.callCreateNewPlayerStats(user);
        }).then((createNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse) => {
            return this.handleCreateNewPlayerStatsResponse(createNewPlayerStatsResponse);
		}).then((user: I.User) => {
			if (settings.sendVerificationEmailOnCreate) {
				return this.sendVerificationEmail(user).then((): I.User => {
					return user;
				});
			} else {
				return user;
			}
        }).then((user: I.User) => {
            let jwt:string = this._generateJWT(user);
            logger.info("User Created", { codepath: "WebPlayerAccountsController.login", playername: req.body.playerName });
            let playerAccountsResponse: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: user.name, email: req.body.email };
            return playerAccountsResponse;
        }, (error: any): Q.Promise<I.PlayerAccountsResponse> => {
            if (error.isPlayerFacing === true) {
                return Q.reject<I.PlayerAccountsResponse>(error);
            } else {
                logger.error("There was an error in account creation: " + error.message, error);
                return Q.reject<I.PlayerAccountsResponse>(error);
            }
        });
    }

    public handleCreateNewPlayerStatsResponse(createNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse): Q.Promise<I.User> {
        if (createNewPlayerStatsResponse.error) {
            let deleteUserRequest: I.DeleteUserRequest = {
                playerName: createNewPlayerStatsResponse.user.name,
            };
            return this.userController.deleteUserWithoutStats(deleteUserRequest).finally(() => {
                return Q.reject(createNewPlayerStatsResponse.error);
            });
        } else {
            return Q.fcall(() => {
                return createNewPlayerStatsResponse.user;
            });
        }
    }

    public resetPassword(req: any, res: any): Q.Promise<I.ResetPasswordResponse> {
        return Q.fcall(() => {
            assert(req.body.email, 'email is missing');
            assert(typeof req.body.email === 'string', 'email is missing');
            assert(req.body.passwordResetToken, 'passwordResetToken is missing');
            assert(typeof req.body.passwordResetToken === 'string', 'passwordResetToken is missing');
            assert(req.body.newPassword, 'newPassword is missing');
            assert(typeof req.body.newPassword === 'string', 'newPassword is missing');

            let uniqueEmail: string = req.body.email.toUpperCase();

            let resetPasswordRequest: I.ResetPasswordRequest = {
                uniqueEmail: uniqueEmail,
                passwordResetToken: req.body.passwordResetToken,
                newPassword: req.body.newPassword
            };
            return resetPasswordRequest;
        }).then((resetPasswordRequest: I.ResetPasswordRequest) => {
            return this.userController.resetPassword(resetPasswordRequest);
        }).then(() => {
            let resetPasswordResponse: I.ResetPasswordResponse = {
                success: true
            };
            return resetPasswordResponse;
        });
    }

    public sendPasswordResetEmail(req: any, res: any): Q.Promise<I.SendPasswordResetEmailResponse> {
        let sendPasswordResetEmailRequest: I.SendPasswordResetEmailRequest;
        return Q.fcall(() => {
            assert(req.body.email, 'email is missing');
            assert(typeof req.body.email === 'string', 'email is missing');

            let uniqueEmail: string = req.body.email.toUpperCase();

            sendPasswordResetEmailRequest = {
                email: uniqueEmail,
            };
            return sendPasswordResetEmailRequest;
        }).then((sendPasswordResetEmailRequest: I.SendPasswordResetEmailRequest) => {
            return this.userController.generatePasswordReset(sendPasswordResetEmailRequest.email);
        }).then((passwordResetToken: string) => {
            logger.info("Password Reset Generated", { email: sendPasswordResetEmailRequest.email });
            return this.getMailController().sendMailTo(sendPasswordResetEmailRequest.email, WebPlayerAccountsController.PASSWORD_RESET_EMAIL_SUBJECT, this.generatePasswordResetEmailBody(sendPasswordResetEmailRequest.email, passwordResetToken));
        }).then(() => {
            let sendPasswordResetEmailResponse: I.SendPasswordResetEmailResponse = {
                email: sendPasswordResetEmailRequest.email
            };
            return sendPasswordResetEmailResponse;
        });
    }

    public verify(req: any, res: any): Q.Promise<I.PlayerAccountsResponse> {
        return Q.fcall(() => {
            assert(req.body.email, 'email is missing');
            assert(req.body.verificationToken, 'verificationToken is missing');
            let verifyEmailRequest: I.VerifyEmailRequest = {
                email: req.body.email,
                verificationToken: req.body.verificationToken
            };
            return verifyEmailRequest;
        }).then((verifyEmailRequest: I.VerifyEmailRequest) => {
            return this.userController.verifyEmail(verifyEmailRequest);
        }).then((user: I.User) => {
            let jwt:string = this._generateJWT(user);
            logger.info("User's Email Verified", { email: req.body.email });
            let playerAccountsResponse: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: user.name, email: user.email };
            return playerAccountsResponse;
        });
	}

	public getPlayerAccountInfo(req: any, res: any): Q.Promise<any> {
		let user: I.User;

		return Q.fcall(() => {
		}).then(() => {
			assert(req.body.playerName || req.body.email, 'playerName and email is missing');
			if (req.body.playerName) {
				assert(req.body.playerName, 'playerName is missing');
				assert(typeof req.body.playerName === 'string', 'playerName is missing');
				return this.userController.getUserByName(req.body.playerName);
			} else {
				assert(req.body.email, 'email is missing');
				assert(typeof req.body.email === 'string', 'email is missing');
				return this.userController.getUser(req.body.email.toUpperCase());
			}
		}).then((tempUser: I.User) => {
			user = tempUser;
			return this.playerStatsCommunicator.callGetDbPlayerStats(user);
		}).then((string_body: string) => {
			let body: any = JSON.parse(string_body);
			body["email"] = user.email;
			body["verified"] = user.verified;
			body["lastLogin"] = user.lastLogin;
			body["createdAt"] = user.createdAt;
			return JSON.stringify(body);
		});
	}

	public setPlayerAccountInfo(req: any, res: any): Q.Promise<any> {
		let user: I.User;

		return Q.fcall(() => {
		}).then(() => {
			assert(req.body.playerUniqueName != null, 'playerUniqueName is missing')
			assert(req.body.verified != null, 'verified is missing')
			assert(req.body.currentXP != null, 'currentXP is missing')
			assert(req.body.currentLevel != null, 'currentLevel is missing')
			assert(req.body.wins != null, 'wins is missing')
			assert(req.body.losses != null, 'losses is missing')
			assert(req.body.playerInventory != null, 'playerInventory is missing')

			return this.userController.setVerified(req.body.playerUniqueName, req.body.verified);
		}).then((tempUser: I.User) => {
			user = tempUser;

			let editPlayerStatsRequest: any = {
				playerUniqueName: req.body.playerUniqueName,
				currentXP: req.body.currentXP,
				currentLevel: req.body.currentLevel,
				wins: req.body.wins,
				losses: req.body.losses,
				playerInventory: JSON.parse(req.body.playerInventory)
			};

			return this.playerStatsCommunicator.callEditPlayerStats(editPlayerStatsRequest);
		}).then((string_body: string) => {
			let body: any = JSON.parse(string_body);
			body["verified"] = user.verified;
			return JSON.stringify(body);
		});
	}

	public getUserCount(req: any, res: any): Q.Promise<any> {
		return this.userController.getUserCount();
	}

    public _generateJWT(user: I.User): string {
        return jwt.sign({ u: user.uniqueName }, settings.JWTSecret);
    }
}

export = WebPlayerAccountsController;