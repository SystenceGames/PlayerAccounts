import assert = require('assert');
import Q = require('q');
import MongoDbUserController = require('./MongoDbUserController');
import I = require('../Interfaces');
import settings = require('../config/Settings');
import request = require('request');
import logger = require('../logger');
import PlayerStatsCommunicator = require('./PlayerStatsCommunicator');
import bcrypt = require('bcrypt');

class UserController implements I.UserController {
    private mongoDbUserController: I.DbUserController;
    private guidGenerator: I.GuidGenerator;
    private standardLibraryProxy: I.StandardLibraryProxy;

    public static BAD_PASSWORD_ERROR_MESSAGE: string = "Password is incorrect";
    public static BAD_PASSWORD_ERROR: Error = new Error(UserController.BAD_PASSWORD_ERROR_MESSAGE);
    public static DEFAULT_PASSWORD_RESET_TOKEN: string = "notokenyetAW;LHV@BASCK!!!4%";
    public static PASSWORD_RESET_EXPIRED_ERROR_MESSAGE: string = "This password reset link expired.";
    public static PASSWORD_RESET_EXPIRED_ERROR: Error = new Error(UserController.PASSWORD_RESET_EXPIRED_ERROR_MESSAGE);
    public static PASSWORD_RESET_INVALID_ERROR_MESSAGE: string = "This password reset link is invalid.";
    public static PASSWORD_RESET_INVALID_ERROR: Error = new Error(UserController.PASSWORD_RESET_INVALID_ERROR_MESSAGE);
    public static GENERIC_ERROR_MESSAGE: string = "Something went wrong.";
    public static GENERIC_ERROR: Error = new Error(UserController.GENERIC_ERROR_MESSAGE);


    constructor(dbUserController: I.DbUserController, guidGenerator: I.GuidGenerator, standardLibraryProxy: I.StandardLibraryProxy) {
        this.mongoDbUserController = dbUserController;
        this.guidGenerator = guidGenerator;
        this.standardLibraryProxy = standardLibraryProxy
    }

    public getUser(email: string): Q.Promise<I.User> {
        return this.mongoDbUserController.getByEmail(email); // TODO: if there's errors, it's this guys fault? fcalls?

        //return Q.fcall(() => {
        //    return this.mongoDbUserController.getByEmail(email);
        //});
    }

    public getUserByName(name: string): Q.Promise<I.User> {
        return this.mongoDbUserController.getByName(name);
    }

    public loginUser4(steamId: string): Q.Promise<I.User> {
        return this.mongoDbUserController.getBySteamId(steamId).then((user: I.User) => {
            if (!user.verified) {
                assert(false, "You must verify your email address before logging in.");
            }
            return user;
        }).then((user: I.User) => {
            return this.mongoDbUserController.updateLastLogin(user.name);
        });
    }

    public loginUser3(email: string, password: string): Q.Promise<I.User> {
        return this.mongoDbUserController.getByEmail(email).then((user: I.User) => {
            return this._AuthenticateUser(password, user);
        }).then((user: I.User) => {
            if (!user.verified) {
                assert(false, "You must verify your email address before logging in.");
            }
            return user;
        }).then((user: I.User) => {
            return this.mongoDbUserController.updateLastLogin(user.name);
        });
    }

    public loginUser(name: string, password: string): Q.Promise<I.User> {
        return Q("")
            .then(() => {
                return this.mongoDbUserController.getByName(name);
            })
            .then((user: I.User) => {
                return this._AuthenticateUser(password, user);
            })
            .then((user: I.User) => {
                return this.mongoDbUserController.updateLastLogin(user.name);
            });
    }

    public deleteUser(deleteUserRequest: I.DeleteUserRequest): Q.Promise<I.User> {
        return this.mongoDbUserController.deleteUser(deleteUserRequest);
    }

    public deleteUserWithoutStats(deleteUserRequest: I.DeleteUserRequest): Q.Promise<I.User> {
        return this.mongoDbUserController.deleteUser(deleteUserRequest);
        // TODO: we should authenticate
    }

    public validateBirthDate(birthDate: Date) {
        let date13YearsAgo: Date = this.standardLibraryProxy.getCurrentDate();
        date13YearsAgo.setFullYear(date13YearsAgo.getFullYear() - 13);
        assert(birthDate.getTime() - date13YearsAgo.getTime() < 0, 'players less than 13 years of age can not create accounts');
    }

    public validateSteamId(steamId: string) {
        let maxSteamIdLength: number = 100;
        assert(!isNaN(parseInt(steamId)), "SteamIds must be a number");
        assert(steamId.length <= maxSteamIdLength, 'steamIds must be no more than ' + maxSteamIdLength + ' characters long.');
    }

    public createUser(createUser: I.CreateUser): Q.Promise<I.User> {
        this.validateNewUserName(createUser.name);
        this.validateNewPassword(createUser.password);
        this.validateNewEmail(createUser.email);
        this.validateBirthDate(createUser.birthdate);
        let user: I.User;
        if (createUser.steamId) {
            this.validateSteamId(createUser.steamId);

            user = {
                email: createUser.email,
                name: createUser.name,
                password: createUser.password,
                steamId: createUser.steamId,
                uniqueName: createUser.name.toUpperCase(),
                verificationToken: this.guidGenerator.generate(),
                verified: false,
                passwordResetToken: UserController.DEFAULT_PASSWORD_RESET_TOKEN,
                passwordResetExpiration: this.standardLibraryProxy.getCurrentDate().getTime()
            };
        } else {
            user = {
                email: createUser.email,
                name: createUser.name,
                password: createUser.password,
                uniqueName: createUser.name.toUpperCase(),
                verificationToken: this.guidGenerator.generate(),
                verified: false,
                passwordResetToken: UserController.DEFAULT_PASSWORD_RESET_TOKEN,
                passwordResetExpiration: this.standardLibraryProxy.getCurrentDate().getTime()
            };
        }

        return this.mongoDbUserController.create(user);
    }

    public resetPassword(resetPasswordRequest: I.ResetPasswordRequest): Q.Promise<I.User> {
        let date: number;
        return Q("")
            .then(() => {
                this.validateNewPassword(resetPasswordRequest.newPassword);

                return this.mongoDbUserController.getByEmail(resetPasswordRequest.uniqueEmail);
            }).then((user: I.User): Q.Promise<I.User> => {
                let deferred = Q.defer<I.User>();
                date = this.standardLibraryProxy.getCurrentDate().getDate();

                if (date > user.passwordResetExpiration) {
                    deferred.reject(UserController.PASSWORD_RESET_EXPIRED_ERROR);
                    return deferred.promise;
                }

                bcrypt.compare(resetPasswordRequest.passwordResetToken, user.passwordResetToken, (err, isMatch) => {
                    if (err) {
                        logger.error("There was an error bcrypting a password reset for reset token in request: " + resetPasswordRequest.passwordResetToken + " and reset token in db: " + user.passwordResetToken + " error was: " + JSON.stringify(err));
                        deferred.reject(UserController.GENERIC_ERROR);
                        return;
                    }

                    if (isMatch) {
                        deferred.resolve(user);
                        return;
                    }

                    deferred.reject(UserController.PASSWORD_RESET_INVALID_ERROR);
                });

                return deferred.promise;
            }).then((user: I.User) => {
                let passwordResetToken = UserController.DEFAULT_PASSWORD_RESET_TOKEN;
                let passwordResetExpiration = date;
                return this.mongoDbUserController.resetPassword(resetPasswordRequest.uniqueEmail, resetPasswordRequest.newPassword, passwordResetToken, passwordResetExpiration);
            });
    }

    public generatePasswordReset(email: string): Q.Promise<string> {
        let expirationDate: Date = this.standardLibraryProxy.getCurrentDate();
        expirationDate.setHours(expirationDate.getHours() + settings.passwordResetTokenDurationHours);
        let expiration: number = expirationDate.getTime();
        let passwordResetToken: string = this.guidGenerator.generate();

        return Q("")
            .then(() => {
                return this.mongoDbUserController.generatePasswordResetFor(email, passwordResetToken, expiration); // set password reset again
            }).then((user: I.User) => {
                return passwordResetToken;
            });
    }

    public verifyEmail(verifyEmailRequest: I.VerifyEmailRequest): Q.Promise<I.User> {
        return Q("")
            .then(() => {
                return this.mongoDbUserController.verify(verifyEmailRequest);
            });
    }

    public setVerified(uniqueName: string, verified: boolean): Q.Promise<I.User> {
        return this.mongoDbUserController.setVerified(uniqueName, verified);
    }

    public getUserCount(): Q.Promise<any> {
        return this.mongoDbUserController.getUserCount();
    }

    private _AuthenticateUser(password: string, user: I.User): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return deferred.reject(err);
            }

            if (isMatch) {
                return deferred.resolve(user);
            }
            else {
                return deferred.reject(UserController.BAD_PASSWORD_ERROR);
            }
        });

        return deferred.promise;
    }

    private isReserved(name: string): boolean {
        for (let i: number = 0; i < settings.reservedNameEndings.length; i++) {
            let reservedNameEnding: string = settings.reservedNameEndings[i];
            let tempName = name.toLowerCase();
            let lastIndexOf: number = tempName.lastIndexOf(reservedNameEnding);
            if (lastIndexOf == tempName.length - reservedNameEnding.length) {
                return true;
            }
        }
        return false;
    }

    private containsBlacklistedPhrase(name: string): boolean {
        let lowerCaseName: string = name.toLowerCase();
        let containsBlacklist: { [key: string]: string } = settings.containsBlacklist;

        for (let i = 0; i < lowerCaseName.length; i++) {
            for (let j = 1; j <= lowerCaseName.length; j++) {
                let word: string = lowerCaseName.substring(i, j);
                if (containsBlacklist.hasOwnProperty(word)) {
                    return true;
                }
            }
        }
        return false;
    }

    public validateNewUserName(name: string) {
        assert(name.length <= settings.maxNameLength, 'playerName must be no more than ' + settings.maxNameLength + ' characters long.');
        assert(name.length >= settings.minNameLength, 'playerName must be no less than ' + settings.minNameLength + ' characters long.');
        assert(!(/[^-a-z0-9_]/i.test(name)), "Player Name can only contain alphanumeric characters or _");
        assert(name.indexOf("_") != 0 && name.lastIndexOf("_") != name.length - 1, "Names can neither start nor end with _underscore");

        let startTimeMs: number = this.standardLibraryProxy.getCurrentDate().getTime();
        let containsInappropriateLanguage: boolean = this.containsBlacklistedPhrase(name);
        logger.info("ContainsBlacklistDurationMs", { durationMs: this.standardLibraryProxy.getCurrentDate().getTime() - startTimeMs });
        if (containsInappropriateLanguage) {
            logger.info("Inappropriate name attempted", { name: name });
        }

        assert(!containsInappropriateLanguage, "Names cannot contain inappropriate language");
        assert(!this.isReserved(name), "Names cannot use a reserved format (e.g. ending with '_TM')");
    }

    public validateNewPassword(password: string) {
        assert(password.length >= settings.minPasswordLength, "Passwords must be at least " + settings.minPasswordLength + " characters");
        assert(password.length <= settings.maxPasswordLength, "Passwords must be at most " + settings.maxPasswordLength + " characters");
    }

    public validateNewEmail(email: string) {
        assert(email.length <= settings.maxEmailLength, 'emails must be no more than ' + settings.maxEmailLength + ' characters long.');
        assert(/.+?@.+?\..+/.test(email), "Email address format is invalid. It should be similar to user@email.com");
    }
}

export = UserController