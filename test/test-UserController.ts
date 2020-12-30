import assert = require('assert');
import settings = require('../config/Settings');
import bcrypt = require('bcrypt');
import request = require('request');
import UserController = require('../controllers/UserController');
import should = require('should');
require('should');
import sinon = require('sinon');
import I = require('../Interfaces');
import Q = require('q');
import PlayerStatsCommunicator = require('../controllers/PlayerStatsCommunicator');
import TestFactory = require('./TestFactory');

describe("test-UserController", () => {
    let sandbox: any;
    let user: I.User;
    let requestOptions: request.CoreOptions;
    let errorResponse: I.CreateNewPlayerStatsResponse;
    let stubUpdateLastLogin: any;
    let stubBcryptCompare: any;
    let stubGetByEmail: any;
    let stubCreateUser: any;
    let stubDeleteUser: any;
    let stubGeneratePasswordResetFor: any;
    let deleteUserRequest: I.DeleteUserRequest;
    let tempSettings: any = {};
    let mockDbUserController: I.DbUserController;
    let userController: UserController;
    let stubGenerate: any;
    let stubGetCurrentDate: any;
    let stubResetPassword: any;
    let date14YearsAgo: any;
    let nowTime: Date;
    let promiseOfIUser: Q.Promise<I.User>;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        date14YearsAgo = new Date();
        date14YearsAgo.setFullYear(date14YearsAgo.getFullYear() - 14);

        user = {
            name: "fakePlayerName",
            password: "fakePassword",
            email: "fake@email.com",
            steamId: TestFactory.fakeSteamId,
            uniqueName: "FAKEPLAYERNAME",
            verificationToken: TestFactory.fakeGuid,
            verified: false,
            passwordResetToken: UserController.DEFAULT_PASSWORD_RESET_TOKEN,
            passwordResetExpiration: TestFactory.expiration
        };
        requestOptions = {
            body: "playerStats=" + JSON.stringify({ playerName: user.uniqueName }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        errorResponse = { error: PlayerStatsCommunicator.FAILED_ACCOUNT_CREATION_ERROR, user: user };

        deleteUserRequest = {
            playerName: user.name,
        };

        promiseOfIUser = Q.fcall(() => {
            return user;
        });

        stubDeleteUser = sandbox.stub();
        stubDeleteUser.withArgs(deleteUserRequest).returns(promiseOfIUser);
        stubCreateUser = sandbox.stub();
        stubCreateUser.withArgs(user).returns(promiseOfIUser);
        stubGetByEmail = sandbox.stub();
        stubGetByEmail.withArgs(user.email.toUpperCase()).returns(promiseOfIUser);
        stubUpdateLastLogin = sandbox.stub();
        stubUpdateLastLogin.withArgs(user.name).returns(promiseOfIUser);

        stubResetPassword = sandbox.stub();

		stubGeneratePasswordResetFor = sandbox.stub();

        mockDbUserController = {
            create: stubCreateUser,
            deleteUser: stubDeleteUser,
            getByEmail: stubGetByEmail,
            getByName: sandbox.stub(),
            getBySteamId: sandbox.stub(),
            updateLastLogin: stubUpdateLastLogin,
			verify: sandbox.stub(),
			setVerified: sandbox.stub(),
			getUserCount: sandbox.stub(),
            generatePasswordResetFor: stubGeneratePasswordResetFor,
            resetPassword: stubResetPassword
        }

        stubGenerate = sandbox.stub().returns(TestFactory.fakeGuid);

        let mockGuidGenerator: I.GuidGenerator = {
            generate: stubGenerate
        };

        nowTime = new Date();
        stubGetCurrentDate = sandbox.stub().onCall(0).returns(nowTime).onCall(1).returns(new Date(TestFactory.expiration)).onCall(2).returns(nowTime).onCall(3).returns(new Date(TestFactory.expiration));

        let mockStandardLibraryProxy: I.StandardLibraryProxy = {
            getCurrentDate: stubGetCurrentDate
        };

        tempSettings.maxNameLength = settings.maxNameLength;
        tempSettings.minNameLength = settings.minNameLength;
        tempSettings.maxPasswordLength = settings.maxPasswordLength;
        tempSettings.minPasswordLength = settings.minPasswordLength;
        tempSettings.maxEmailLength = settings.maxEmailLength;

        stubBcryptCompare = sandbox.stub(bcrypt, "compare");
        stubBcryptCompare.callsArgWithAsync(2, null, true);

        userController = new UserController(mockDbUserController, mockGuidGenerator, mockStandardLibraryProxy);
    });

    it("1. loginUser3", () => {
        user.verified = true;

        return userController.loginUser3(user.email.toUpperCase(), user.password).then((actual) => {
            sinon.assert.calledWith(stubGetByEmail, user.email.toUpperCase());
            sinon.assert.calledWith(stubUpdateLastLogin, user.name);
            sinon.assert.calledOnce(stubBcryptCompare);
            should.deepEqual(actual, user);
        });
    });

    it("2. loginUser3 unverified", () => {
        return userController.loginUser3(user.email.toUpperCase(), user.password).then((actual) => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, "You must verify your email address before logging in.");
        });
    });

    it("1. createUser", () => {
        let createUserRequest: I.CreateUser = {
            birthdate: date14YearsAgo,
            email: TestFactory.fakeEmail,
            name: TestFactory.fakePlayerName,
            password: TestFactory.fakePassword,
            steamId: TestFactory.fakeSteamId
        };

        return userController.createUser(createUserRequest).then((actual) => {
            sinon.assert.calledOnce(stubGenerate);
            sinon.assert.calledWith(stubCreateUser, user);
            should.deepEqual(actual, user);
        });
    });

    it("1. deleteUser", () => {
        return userController.deleteUser(deleteUserRequest).then((actual) => {
            should.deepEqual(actual, user);
        });
    });

    it("1. deleteUserWithoutStats", () => {
        return userController.deleteUserWithoutStats(deleteUserRequest).then((actual) => {
            should.deepEqual(actual, user);
        });
    });

    it("1. _ValidateNewPassword", () => {
        settings.minPasswordLength = 8;
        settings.maxPasswordLength = 8;

        let password: string = "password";
        try {
            userController.validateNewPassword(password);
        } catch (error) {
            assert(false, "shouldn't have thrown but did " + error);
        }
    });

    it("2. _ValidateNewPassword throw for too short", () => {
        settings.minPasswordLength = 9;
        settings.maxPasswordLength = 9;
        let password: string = "password";
        let threw: boolean = true;

        try {
            userController.validateNewPassword(password);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Passwords must be at least " + settings.minPasswordLength + " characters");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("2. _ValidateNewPassword throw for too long", () => {
        settings.minPasswordLength = 7;
        settings.maxPasswordLength = 7;
        let password: string = "password";
        let threw: boolean = true;

        try {
            userController.validateNewPassword(password);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Passwords must be at most " + settings.maxPasswordLength + " characters");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("1. _ValidateNewUserName", () => {
        let username: string = "username";

        try {
            userController.validateNewUserName(username);
        } catch (error) {
            assert(false, "shouldn't have thrown but did " + error);
        }
    });

    it("2. _ValidateNewUserName too short", () => {
        settings.minNameLength = 9;
        settings.maxNameLength = 100;
        let username: string = "username";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, 'playerName must be no less than ' + settings.minNameLength + ' characters long.');
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("3. _ValidateNewUserName too long", () => {
        settings.maxNameLength = 7;
        settings.minNameLength = 5;
        let username: string = "username";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, 'playerName must be no more than ' + settings.maxNameLength + ' characters long.');
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("4. _ValidateNewUserName not alphanumeric", () => {
        let username: string = "username!";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Player Name can only contain alphanumeric characters or _");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("5. _ValidateNewUserName can't start with an underscore", () => {
        let username: string = "_username";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Names can neither start nor end with _underscore");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("6. _ValidateNewUserName containing blacklisted word", () => {
        let username: string = "usershitname";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Names cannot contain inappropriate language");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("7. _ValidateNewUserName containing blacklisted word with capitalization", () => {
        let username: string = "usersHitname";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Names cannot contain inappropriate language");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("7. _ValidateNewUserName containing reserved name ending", () => {
        let username: string =  "PlayerName_tM";
        let threw: boolean = true;

        try {
            userController.validateNewUserName(username);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Names cannot use a reserved format (e.g. ending with '_TM')");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("1. _ValidateNewEmail", () => {
        let email: string = "email@mail.com";
        try {
            userController.validateNewEmail(email);
        } catch (error) {
            assert(false, "shouldn't have thrown but did " + error);
        }
    });

    it("2. _ValidateNewEmail too long", () => {
        settings.maxEmailLength = 13;
        let email: string = "email@mail.com";
        let threw: boolean = true;

        try {
            userController.validateNewEmail(email);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, 'emails must be no more than 13 characters long.');
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("3. _ValidateNewEmail not email format", () => {
        let email: string = "emailmail.com";
        let threw: boolean = true;

        try {
            userController.validateNewEmail(email);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, "Email address format is invalid. It should be similar to user@email.com");
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("1. validateBirthDate", () => {

        try {
            userController.validateBirthDate(date14YearsAgo);
        } catch (error) {
            assert(false, "shouldn't have thrown but did " + error);
        }
    });

    it("2. validateBirthDate too young", () => {
        let currentDate = new Date();
        stubGetCurrentDate = sandbox.stub().returns(currentDate);
        let date12YearsAgo = new Date(currentDate);
        date12YearsAgo.setFullYear(date12YearsAgo.getFullYear() - 12);
        let threw: boolean = true;

        try {
            userController.validateBirthDate(date12YearsAgo);
            threw = false;
        } catch (error) {
            should.deepEqual(error.message, 'players less than 13 years of age can not create accounts');
        }

        should.deepEqual(threw, true, "didn't throw but should have");
    });

    it("1. generatePasswordReset", () => {
        
        let expirationDate: Date = new Date(nowTime);
        expirationDate.setHours(nowTime.getHours() + settings.passwordResetTokenDurationHours)
        let expiration: number = expirationDate.getTime();

        let expected: I.User = user;
        expected.passwordResetExpiration = expiration;
        expected.passwordResetToken = TestFactory.fakeGuid;

        let promiseOfUpdatedUser: Q.Promise<I.User> = Q.fcall(() => {
            return expected;
        });

        stubGeneratePasswordResetFor.withArgs(user.email, TestFactory.fakeGuid, expiration).returns(promiseOfUpdatedUser);

        return userController.generatePasswordReset(user.email).then((passwordResetToken: string) => {
            sinon.assert.calledWith(stubGeneratePasswordResetFor, user.email, TestFactory.fakeGuid, expiration);
            should.deepEqual(passwordResetToken, expected.passwordResetToken);
        });
    });

    it("1. resetPassword", () => {
        let uniqueEmail = user.email.toUpperCase();
        let passwordResetToken = "notDefaultPasswordToken;)/admin";
        let newPassword = "a;vsdjvaiodv";
        
        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpiration = nowTime.getDate() + 1;

        let resetPasswordRequest: I.ResetPasswordRequest = {
            uniqueEmail: uniqueEmail,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        let expectedPasswordResetToken = UserController.DEFAULT_PASSWORD_RESET_TOKEN;
        let expectedPasswordResetExpiration = nowTime.getDate();

        stubResetPassword.withArgs(uniqueEmail, newPassword, expectedPasswordResetToken, expectedPasswordResetExpiration).returns(promiseOfIUser);

        return userController.resetPassword(resetPasswordRequest).then((actual) => {
            should.deepEqual(actual, user);
        });
    });

    it("2. resetPassword invalid short password", () => {
        let uniqueEmail = user.email.toUpperCase();
        let passwordResetToken = "notDefaultPasswordToken;)/admin";
        let newPassword = "short";

        let resetPasswordRequest: I.ResetPasswordRequest = {
            uniqueEmail: uniqueEmail,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };
        
        return userController.resetPassword(resetPasswordRequest).then(() => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, "Passwords must be at least " + settings.minPasswordLength + " characters");
        });
    });

    it("3. resetPassword invalid long password", () => {
        let uniqueEmail = user.email.toUpperCase();
        let passwordResetToken = "notDefaultPasswordToken;)/admin";
        let newPassword = "loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong";

        let resetPasswordRequest: I.ResetPasswordRequest = {
            uniqueEmail: uniqueEmail,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        return userController.resetPassword(resetPasswordRequest).then(() => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, "Passwords must be at most " + settings.maxPasswordLength + " characters");
        });
    });

    it("4. resetPassword expired password token", () => {
        let uniqueEmail = user.email.toUpperCase();
        let passwordResetToken = "notDefaultPasswordToken;)/admin";
        let newPassword = "a;vsdjvaiodv";

        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpiration = nowTime.getDate() - 1;

        let resetPasswordRequest: I.ResetPasswordRequest = {
            uniqueEmail: uniqueEmail,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        return userController.resetPassword(resetPasswordRequest).then(() => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, UserController.PASSWORD_RESET_EXPIRED_ERROR_MESSAGE);
        });
    });

    it("5. resetPassword Bcrypt Error", () => {
        let uniqueEmail = user.email.toUpperCase();
        let passwordResetToken = "notDefaultPasswordToken;)/admin";
        let newPassword = "a;vsdjvaiodv";

        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpiration = nowTime.getDate() + 1;

        stubBcryptCompare.callsArgWithAsync(2, "Bcrypt Error", true);

        let resetPasswordRequest: I.ResetPasswordRequest = {
            uniqueEmail: uniqueEmail,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        return userController.resetPassword(resetPasswordRequest).then(() => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, UserController.GENERIC_ERROR_MESSAGE);
        });
    });

    it("6. resetPassword Bcrypt does not match", () => {
        let uniqueEmail = user.email.toUpperCase();
        let passwordResetToken = "notDefaultPasswordToken;)/admin";
        let newPassword = "a;vsdjvaiodv";

        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpiration = nowTime.getDate() + 1;

        stubBcryptCompare.callsArgWithAsync(2, null, false);

        let resetPasswordRequest: I.ResetPasswordRequest = {
            uniqueEmail: uniqueEmail,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        return userController.resetPassword(resetPasswordRequest).then(() => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, UserController.PASSWORD_RESET_INVALID_ERROR_MESSAGE);
        });
    });

    afterEach(function () {
        sandbox.restore();

        settings.maxNameLength = tempSettings.maxNameLength;
        settings.minNameLength = tempSettings.minNameLength;
        settings.maxPasswordLength = tempSettings.maxPasswordLength;
        settings.minPasswordLength = tempSettings.minPasswordLength;
        settings.maxEmailLength = tempSettings.maxEmailLength;
    });
});
