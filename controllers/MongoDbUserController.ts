import mongoose = require('mongoose');
import I = require('../Interfaces');
import User = require('../models/User');
import Q = require('q');
import logger = require('../logger');
let bcrypt = require('bcrypt');
import settings = require('../config/Settings');
import TMError = require('../TMError');
import MongoDbCollectionClient = require('../MongoDbCollectionClient');

let SALT_WORK_FACTOR = 8;

let INDEX_UNAVAILABLE: number = -1;

let userSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true, unique: true },
    uniqueName: { type: String, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    steamId: { type: String, required: false, unique: true, sparse: true },
    lastLogin: { type: Number },
    verified: { type: Boolean },
    verificationToken: {type: String },
    passwordResetToken: { type: String },
    passwordResetExpiration: { type: Number }
});

userSchema.pre('save', function (next) { //Specifically not anonymous function
    let user = this;

    if (user.isModified('name')) {
        user.uniqueName = user.name.toUpperCase();
    }

    if (user.isModified('password')) {
        bcrypt.genSalt(SALT_WORK_FACTOR, (err: any, salt: any) => {
            if (err) {
                return next(err);
            }

            bcrypt.hash(user.password, salt, (err: any, hash: any) => {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
        return;
    }

    return next();
});

class MongoDbUserController implements I.DbUserController {
    static GENERIC_ERROR_MESSAGE: string = "There was an error creating your new account.";
    static GENERIC_ERROR: TMError = new TMError(true, MongoDbUserController.GENERIC_ERROR_MESSAGE);
    static GENERIC_PASSWORD_RESET_ERROR_MESSAGE: string = "There was an error in the password reset process";
    static GENERIC_PASSWORD_RESET_ERROR: TMError = new TMError(true, MongoDbUserController.GENERIC_PASSWORD_RESET_ERROR_MESSAGE);
    static DUPLICATE_KEY_ERROR_CODE: number = 11000;
    static DUPLICATE_EMAIL_SEARCH_STRING: string = "email_1 dup key";
    static DUPLICATE_EMAIL_ERROR_MESSAGE: string = "That email is already in use.";
    static DUPLICATE_EMAIL_ERROR: TMError = new TMError(true, MongoDbUserController.DUPLICATE_EMAIL_ERROR_MESSAGE);
    static DUPLICATE_STEAM_ID_SEARCH_STRING: string = "steamId_1 dup key";
    static DUPLICATE_STEAM_ID_ERROR_MESSAGE: string = "That steamId is already in use.";
    static DUPLICATE_STEAM_ID_ERROR: TMError = new TMError(true, MongoDbUserController.DUPLICATE_STEAM_ID_ERROR_MESSAGE);
    static FIND_ONE_AND_UPDATE_OPTIONS: mongoose.ModelFindOneAndUpdateOptions = { new: true };
    static DUPLICATE_NAME_SEARCH_STRING: string = "name_1 dup key";
    static DUPLICATE_UNQIUENAME_SEARCH_STRING: string = "uniqueName_1 dup key";
    static DUPLICATE_NAME_ERROR_MESSAGE: string = "That username is already in use.";
    static DUPLICATE_NAME_ERROR: TMError = new TMError(true, MongoDbUserController.DUPLICATE_NAME_ERROR_MESSAGE);

    private mongoDbCollectionClient: MongoDbCollectionClient<I.MongoDbUser>;
    private mongooseConnection: mongoose.Connection;
    private readonly standardLibraryProxy: I.StandardLibraryProxy;

    constructor(standardLibraryProxy: I.StandardLibraryProxy) {
        this.standardLibraryProxy = standardLibraryProxy;
    }

    private buildMongoConnectionString():string {
        let connectionString: string = "mongodb://";
        if (settings.mongoDbUsername && settings.mongoDbPassword) {
            connectionString += settings.mongoDbUsername + ":" + settings.mongoDbPassword + "@";
        }

        connectionString += settings.mongoDbUris[0];
        for (let i: number = 1; i < settings.mongoDbUris.length; i++) {
            connectionString += "," + settings.mongoDbUris[i];
        }
        connectionString += "/" + settings.mongoDbName;

        if (settings.mongoDbReplicaSet) {
            connectionString += "?" + settings.mongoDbReplicaSet;
        }

        logger.info("MongoDb connection string is " + connectionString);

        return connectionString;
    }

    public connect() {
        let mongooseConnectionsOptions: mongoose.ConnectionOptions = {
            user: settings.mongoDbUsername,
            pass: settings.mongoDbPassword,
            server: {
                auto_reconnect: true,
                reconnectInterval: settings.mongoDbReconnectIntervalMillis,
                reconnectTries: settings.mongoDbReconnectTries,
                socketOptions: {
                    keepAlive: settings.mongoDbKeepAlive
                },
            }
        };

        this.mongooseConnection = mongoose.createConnection(this.buildMongoConnectionString(), mongooseConnectionsOptions);
        let rawUserMongoDbModel: mongoose.Model<I.MongoDbUser> = this.mongooseConnection.model<I.MongoDbUser>(settings.mongoDBUsersCollectionName, userSchema);
        this.mongoDbCollectionClient = new MongoDbCollectionClient(rawUserMongoDbModel, this.standardLibraryProxy);

        this.mongooseConnection.on('error', (err: any) => {
            logger.error('Mongoose error while connecting/connected to connection string ' + this.buildMongoConnectionString(), { error: err, errorMsg: err.message });
        });
        this.mongooseConnection.once('open', function () {
            logger.info("Mongoose opened");
        });
        this.mongooseConnection.on('disconnected', function () {
            logger.error('Mongoose disconnected');
        });
        this.mongooseConnection.on('reconnected', function () {
            logger.info('Mongoose reconnected');
        });
    }

    public getBySteamId(steamId: string): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();

        this.mongoDbCollectionClient.findOne({ steamId: steamId }, (err, user) => {
            if (err) {
                return deferred.reject(err);
            }
            if (!user) {
                return deferred.reject(new Error("Failed to find user with steamId: " + steamId));
            }
            return deferred.resolve(new User(user));
        });
        return deferred.promise;
    }

    public getByName(name: string): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();
        this.mongoDbCollectionClient.findOne({ uniqueName: name.toUpperCase() }, (err, user) => {
            if (err) {
                return deferred.reject(err);
            }
            if (!user) {
                return deferred.reject(new Error("Failed to find user: " + name));
            }
            return deferred.resolve(new User(user));
        });
        return deferred.promise;
    }

    public getByEmail(email: string): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();
        this.mongoDbCollectionClient.findOne({ email: email }, (err, user) => {
            if (err) {
                return deferred.reject(err);
            }
            if (!user) {
                return deferred.reject(new Error("Failed to find user with email: " + email));
            }
            return deferred.resolve(new User(user));
        });
        return deferred.promise;
    }

    public create(createUser: I.User): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();

        this._assertPlayerNameNotTaken(createUser.name, (er) => {
            if (er) {
                return deferred.reject(er);
            }

            let newUser: I.MongoDbUser = this.mongoDbCollectionClient.createNew(createUser);

            this.mongoDbCollectionClient.save(newUser, (err: any, mongoDbUser: any, numAffected: number) => {
                if (err) {
                    if (err.code && err.code == MongoDbUserController.DUPLICATE_KEY_ERROR_CODE) {
                        if (err.message && err.message.indexOf(MongoDbUserController.DUPLICATE_EMAIL_SEARCH_STRING) !== INDEX_UNAVAILABLE) {
                            deferred.reject(MongoDbUserController.DUPLICATE_EMAIL_ERROR);
                            return;
                        }
                        if (err.message && err.message.indexOf(MongoDbUserController.DUPLICATE_STEAM_ID_SEARCH_STRING) !== INDEX_UNAVAILABLE) {
                            deferred.reject(MongoDbUserController.DUPLICATE_STEAM_ID_ERROR);
                            return;
                        }
                        if (err.message && err.message.indexOf(MongoDbUserController.DUPLICATE_UNQIUENAME_SEARCH_STRING) !== INDEX_UNAVAILABLE) {
                            deferred.reject(MongoDbUserController.DUPLICATE_NAME_ERROR);
                            return;
                        }
                        if (err.message && err.message.indexOf(MongoDbUserController.DUPLICATE_NAME_SEARCH_STRING) !== INDEX_UNAVAILABLE) {
                            deferred.reject(MongoDbUserController.DUPLICATE_NAME_ERROR);
                            return;
                        }
                    }
                    logger.error(err);
                    deferred.reject(MongoDbUserController.GENERIC_ERROR);
                    return;
                }

                deferred.resolve(new User(mongoDbUser));
            });
        });
        return deferred.promise;
    }

    public deleteUser(deleteUserRequest: I.DeleteUserRequest): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();
        let uniqueName: string = deleteUserRequest.playerName.toUpperCase();

        this.mongoDbCollectionClient.findOneAndRemove({ uniqueName: uniqueName }, (err: any, res: I.MongoDbUser): void => {
            if (err) {
                deferred.reject(err);
                return;
            }
            if (res == null) {
                deferred.reject(new Error("empty response from mongoose"));
                return;
            }
            let user: I.User = new User(res);
            deferred.resolve(user);
        });

        return deferred.promise;
    }

    public resetPassword(uniqueEmail: string, newPassword: string, newPasswordResetToken: string, newPasswordResetExpiration: number): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();

        bcrypt.genSalt(SALT_WORK_FACTOR, (err: any, salt: any) => {
            if (err) {
                logger.error("bcrypt threw an error on hash for new password: " + err.message, err);
                deferred.reject(new Error("Failed reset password"));
                return;
            }

            bcrypt.hash(newPassword, salt, (err: any, newPasswordHash: any) => {
                if (err) {
                    logger.error("bcrypt threw an error on hash for new password: " + err.message, err);
                    deferred.reject(new Error("Failed reset password"));
                    return;
                }
                
                this.mongoDbCollectionClient.findOneAndUpdate(
                    { email: uniqueEmail },
                    { $set: { passwordResetToken: newPasswordResetToken, passwordResetExpiration: newPasswordResetExpiration, password: newPasswordHash } },
                    MongoDbUserController.FIND_ONE_AND_UPDATE_OPTIONS,
                    (err, user) => {
                        if (err) {
                            logger.error("MongoDb error during resetPassword()", err);
                            deferred.reject(MongoDbUserController.GENERIC_PASSWORD_RESET_ERROR);
                            return;
                        }
                        if (!user) {
                            logger.error("Failed to find user for email: " + uniqueEmail);
                            deferred.reject(new Error("Failed to find user for email: " + uniqueEmail + ", email may be incorrect."));
                            return;
                        }
                        deferred.resolve(new User(user));
                        return;
                });
            });
        });

        return deferred.promise;
    }

    public generatePasswordResetFor(email: string, passwordResetToken: string, tokenExpiration: number): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();

        bcrypt.genSalt(SALT_WORK_FACTOR, (err: any, salt: any) => {
            if (err) {
                logger.error("bcrypt threw an error on hash: " + err.message, err);
                deferred.reject(new Error("Failed to initiate password reset process"));
                return;
            }

            bcrypt.hash(passwordResetToken, salt, (err: any, passwordResetTokenHashed: any) => {
                if (err) {
                    logger.error("bcrypt threw an error on hash: " + err.message, err);
                    deferred.reject(new Error("Failed to initiate password reset process"));
                    return;
                }

                this.mongoDbCollectionClient.findOneAndUpdate(
                    { email: email },
                    { $set: { passwordResetToken: passwordResetTokenHashed, passwordResetExpiration: tokenExpiration } },
                    MongoDbUserController.FIND_ONE_AND_UPDATE_OPTIONS,
                    (err, user) => {
                        if (err) {
                            logger.error("MongoDb error during generatePasswordResetFor()", err);
                            deferred.reject(MongoDbUserController.GENERIC_PASSWORD_RESET_ERROR);
                            return;
                        }
                        if (!user) {
                            logger.error("Failed to find user for email: " + email);
                            deferred.reject(new Error("Failed to initiate password reset process: " + email + ", email may be incorrect."));
                            return;
                        }
                        deferred.resolve(new User(user));
                        return;
                    }
                );
            });
        });

        return deferred.promise;
    }

    public verify(verifyEmailRequest: I.VerifyEmailRequest): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();
        this.mongoDbCollectionClient.findOneAndUpdate(
            { email: verifyEmailRequest.email, verificationToken: verifyEmailRequest.verificationToken },
            { $set: { verified: true } },
            { new: true },
            (err, user) => {
                if (err) {
                    logger.error("MongoDb error during verify()", err);
                    return deferred.reject(err);
                }
                if (!user) {
                    return deferred.reject(new Error("Failed to validate user with email: " + verifyEmailRequest.email + ", email or verification token may be incorrect."));
                }
                return deferred.resolve(new User(user));
            }
        );
        return deferred.promise;
    }

	public setVerified(uniqueName: string, verified: boolean): Q.Promise<I.User> {
		let deferred = Q.defer<I.User>();
		this.mongoDbCollectionClient.findOneAndUpdate(
			{ uniqueName: uniqueName },
			{ $set: { verified: verified } },
			{ new: true },
			(err, user) => {
				if (err) {
					logger.error("MongoDb error during verify()", err);
					return deferred.reject(err);
				}
				if (!user) {
					return deferred.reject(new Error("Failed to validate user " + uniqueName + " from ServerManager."));
				}
				return deferred.resolve(new User(user));
			}
		);
		return deferred.promise;
	}

	public getUserCount(): Q.Promise<any> {
		let deferred = Q.defer<number>();
		this.mongoDbCollectionClient.count({}, function (err, count) {
			if (err) {
				logger.error("MongoDb error during getUserCount()", err);
				return deferred.reject(err);
			}
			return deferred.resolve(count);
		});
		return deferred.promise;
	}

    public updateLastLogin(name: string): Q.Promise<I.User> {
        let deferred = Q.defer<I.User>();
        this.mongoDbCollectionClient.findOneAndUpdate(
            { name: name },
            { $set: { lastLogin: new Date().getTime() } },
            { new: true },
            (err, user) => {
                if (err) {
                    return deferred.reject(err);
                }
                if (!user) {
                    return deferred.reject(new Error("Failed to find user with name: " + name));
                }
                return deferred.resolve(new User(user));
            }
        );
        return deferred.promise;
    }

    private _assertPlayerNameNotTaken(playerName: string, callback: (error: Error) => void) {
        this.mongoDbCollectionClient.findOne({ uniqueName: playerName.toUpperCase() }, (err, user) => {
            if (err) {
                callback(err);
            }
            if (user) {
                callback(new Error("Name taken"));
            }
            callback(null);
        });
    }
}

export = MongoDbUserController;