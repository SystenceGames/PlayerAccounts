import settings = require('../config/Settings');
import UserController = require('../controllers/UserController');
import WebPlayerAccountsController = require('../controllers/WebPlayerAccountsController');
import should = require('should');
require('should');
import sinon = require('sinon');
import I = require('../Interfaces');
import TestFactory = require('./TestFactory');
import Q = require('q');
import assert = require('assert');
import PlayerStatsCommunicator = require('../controllers/PlayerStatsCommunicator');

describe("test-WebPlayerAccounts", () => {
    let sandbox: any;
    let createBody: any;
    let jwt: string = "cats";
    let stubGetUser: any;
    let stubLogin3: any;
    let stubCreateUser: any;
    let stubDeleteUser: any;
    let stubDeleteUserWithoutStats: any;
    let stubGenerateJWT: any;
    let stubCallCreateNewPlayerStats: any;
    let stubCallDeletePlayerStats: any;
    let stubResetPassword: any;
    let stubSendMailTo: any;
    let stubMandrillSendMailTo: any;
    let stubGeneratePasswordReset: any;
    let createUserRequest: I.CreateUserRequest;
    let deleteUserRequest: I.DeleteUserRequest;
    let user: I.User;
    let createNewPlayerStatsResponse: I.CreateNewPlayerStatsResponse;
    let fakePlayerName: string = TestFactory.fakePlayerName;
    let fakePassword: string = TestFactory.fakePassword;
    let webPlayerAccountsController: WebPlayerAccountsController;
    let userController: I.UserController;
    let expectedSuccessResponsePayload: I.PlayerAccountsResponse = { sessionToken: jwt, playerName: fakePlayerName, email: TestFactory.fakeEmail };
    let playerStatsCommunicator: I.PlayerStatsCommunicator;
    let mailController: I.MailController;
    let spyResJson: any;
    let res: any;
    let email = "asdf@example.com";
    let passwordResetToken = "notDefaultPasswordToken;)/admin";
    let newPassword = "a;vsdjvaiodv";
    let promiseOfIUser: Q.Promise<I.User>;
    let steamCommunicator: I.SteamCommunicator;
    let mandrillApiMailController: I.MailController;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        createBody = {
            playerName: fakePlayerName,
            password: fakePassword,
            email: TestFactory.fakeEmail,
            birthDate: TestFactory.fakeBirthDate,
            steamId: TestFactory.fakeSteamId
        };

        createUserRequest = {
            email: TestFactory.fakeUniqueEmail,
            name: createBody.playerName,
            password: createBody.password,
            birthdate: new Date(createBody.birthDate)
        };

        deleteUserRequest = {
            playerName: createBody.playerName,
        };

        user = {
            email: TestFactory.fakeUniqueEmail,
            name: createBody.playerName,
            password: createBody.password,
            steamId: createBody.steamId,
            uniqueName: "FAKEPLAYERNAME",
            verificationToken: TestFactory.fakeGuid,
            verified: false,
            passwordResetToken: TestFactory.fakeGuid,
            passwordResetExpiration: TestFactory.expiration
        };

        createNewPlayerStatsResponse = { error: null, user: user };

        promiseOfIUser = Q.fcall(() => { return user });
        let promise2OfIUser: Q.Promise<I.User> = Q.fcall(() => { return user });
        let promiseOfCreatePlayerStatsResponse: Q.Promise<I.CreateNewPlayerStatsResponse> = Q.fcall(() => { return createNewPlayerStatsResponse});
        
        stubGetUser = sandbox.stub().returns(promiseOfIUser);
        stubCreateUser = sandbox.stub().returns(promiseOfIUser);
        stubLogin3 = sandbox.stub().returns(promiseOfIUser);
        stubDeleteUser = sandbox.stub().returns(promise2OfIUser);
        stubDeleteUserWithoutStats = sandbox.stub().returns(promise2OfIUser);
        stubCallCreateNewPlayerStats = sandbox.stub().returns(promiseOfCreatePlayerStatsResponse);
        stubCallDeletePlayerStats = sandbox.stub().returns(promiseOfIUser);

        stubResetPassword = sandbox.stub();

        stubGeneratePasswordReset = sandbox.stub().returns(TestFactory.fakeGuid);

        userController = {
            createUser: stubCreateUser,
            deleteUser: stubDeleteUser,
            deleteUserWithoutStats: stubDeleteUserWithoutStats,
            loginUser: sandbox.stub(),
            loginUser3: stubLogin3,
            loginUser4: sandbox.stub(),
			getUser: stubGetUser,
			getUserByName: sandbox.stub(),
			verifyEmail: sandbox.stub(),
			setVerified: sandbox.stub(),
			getUserCount: sandbox.stub(),
            generatePasswordReset: stubGeneratePasswordReset,
            resetPassword: stubResetPassword,
        };

        playerStatsCommunicator = {
            callCreateNewPlayerStats: stubCallCreateNewPlayerStats,
			callDeletePlayerStats: stubCallDeletePlayerStats,
			callGetDbPlayerStats: sandbox.stub(),
			callEditPlayerStats: sandbox.stub()
        };

        steamCommunicator = {
            authenticateUserTicket: sandbox.stub(),
        };

        let promiseOfVoid = Q.fcall(() => { });
        stubSendMailTo = sandbox.stub().returns(promiseOfVoid);
        mailController = {
            sendMailTo: stubSendMailTo
        };

        stubMandrillSendMailTo = sandbox.stub().returns(promiseOfVoid);
        mandrillApiMailController = {
            sendMailTo: stubMandrillSendMailTo
        };

        webPlayerAccountsController = new WebPlayerAccountsController(userController, playerStatsCommunicator, mailController, steamCommunicator, mandrillApiMailController);

        stubGenerateJWT = sandbox.stub(webPlayerAccountsController, '_generateJWT').returns(jwt);

        spyResJson = sandbox.stub();
        res = {
            json: spyResJson
        };
    });

    it("1. resendVerificationEmail", () => {
        let body: any = { email: TestFactory.fakeEmail };
        let req: any = { body: body };

        let expected = { success: true };

        return webPlayerAccountsController.resendVerificationEmail(req, res).then((actual) => {
            should.deepEqual(actual, expected);
            sinon.assert.calledWith(stubGetUser, TestFactory.fakeUniqueEmail);
            //let callbackUrl: string = encodeURIComponent("https://" + settings.callbackBaseUrl + ":" + settings.port + settings.verifyEmailPath);
            //sinon.assert.calledWith(stubSendMailTo, user.email, WebPlayerAccountsController.ACCOUNT_VERIFICATION_EMAIL_SUBJECT, "Hello " + user.name + ",\n" +
            //    "Please visit " + settings.emailVerificationBaseUrl + "?email=" + user.email + "&verificationToken=" + user.verificationToken + "&callbackUrl=" + callbackUrl + " to verify your Maestros account.");
            sinon.assert.calledOnce(stubSendMailTo);
        }); 
    });

    it("2. resendVerificationEmail no email", () => {
        let bodyWithoutEmail: any = { };
        let reqWithoutEmail: any = { body: bodyWithoutEmail };

        return webPlayerAccountsController.resendVerificationEmail(reqWithoutEmail, res).then((actual) => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'email is missing');
        });
    });

    it("1. create", () => {
        let req: any = {
            body: createBody
        };

        return webPlayerAccountsController.create(req, res).then((responsePayload:any) => {
            sinon.assert.calledWith(stubCreateUser, createUserRequest);
            sinon.assert.calledWith(stubCallCreateNewPlayerStats, user);
            sinon.assert.calledWith(stubGenerateJWT, user);
            //let callbackUrl: string = encodeURIComponent("https://" + settings.callbackBaseUrl + ":" + settings.port + settings.verifyEmailPath);
            //sinon.assert.calledWith(stubSendMailTo, user.email, WebPlayerAccountsController.ACCOUNT_VERIFICATION_EMAIL_SUBJECT, "Hello " + user.name + ",\n" +
            //    "Please visit " + settings.emailVerificationBaseUrl + "?email=" + user.email + "&verificationToken=" + user.verificationToken + "&callbackUrl=" + callbackUrl + " to verify your Maestros account.");
            sinon.assert.calledOnce(stubSendMailTo);

            should.deepEqual(expectedSuccessResponsePayload, responsePayload);
        });
    });

    it("1. create with MandrillApi Enabled", () => {
        settings.useMandrillApi = true;

        let req: any = {
            body: createBody
        };

        return webPlayerAccountsController.create(req, res).then((responsePayload: any) => {
            sinon.assert.calledWith(stubCreateUser, createUserRequest);
            sinon.assert.calledWith(stubCallCreateNewPlayerStats, user);
            sinon.assert.calledWith(stubGenerateJWT, user);
            //let callbackUrl: string = encodeURIComponent("https://" + settings.callbackBaseUrl + ":" + settings.port + settings.verifyEmailPath);
            //sinon.assert.calledWith(stubMandrillSendMailTo, user.email, WebPlayerAccountsController.ACCOUNT_VERIFICATION_EMAIL_SUBJECT, "Hello " + user.name + ",\n" +
            //    "Please visit " + settings.emailVerificationBaseUrl + "?email=" + user.email + "&verificationToken=" + user.verificationToken + "&callbackUrl=" + callbackUrl + " to verify your Maestros account.");
            sinon.assert.calledOnce(stubMandrillSendMailTo);
            should.deepEqual(expectedSuccessResponsePayload, responsePayload);
            settings.useMandrillApi = false;
        });
    });

    it("2. create with no playerName errors", () => {
        let body: any = {};
        let reqWithNoBody: any = {
            body: body
        };

        return webPlayerAccountsController.create(reqWithNoBody, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'playerName is missing');
        });
    });

    it("2.1 create with query-selector-injection playerName errors", () => {
        let body: any = { playerName: { $gt: "" } };
        let reqWithNoBody: any = {
            body: body
        };

        return webPlayerAccountsController.create(reqWithNoBody, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'playerName is missing');
        });
    });

    it("2.2 create with query-selector-injection password errors", () => {
        let body: any = { playerName: fakePlayerName, password: { $gt: "" } };
        let reqWithNoBody: any = {
            body: body
        };

        return webPlayerAccountsController.create(reqWithNoBody, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'password is missing');
        });
    });

    it("4. create with invalid date format birthDate", () => {
        createBody.birthDate = "DefinitelyNotDate";
        let reqWithTooLongPlayerName: any = {
            body: createBody
        };

        return webPlayerAccountsController.create(reqWithTooLongPlayerName, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'Error parsing birthDate: ' + createBody.birthDate);
        });
    });

    it("5. create when callCreateNewPlayerStats returns error", () => {
        stubCallCreateNewPlayerStats.returns(Q.resolve({ error: PlayerStatsCommunicator.FAILED_ACCOUNT_CREATION_ERROR, user: user }));

        let req: any = {
            body: createBody
        };

        return webPlayerAccountsController.create(req, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            sinon.assert.calledWith(stubCreateUser, createUserRequest);
            sinon.assert.calledWith(stubCallCreateNewPlayerStats, user);
            sinon.assert.calledWith(stubDeleteUserWithoutStats, deleteUserRequest);
            should.deepEqual(error.message, PlayerStatsCommunicator.FAILED_ACCOUNT_CREATION_MESSAGE);
        });
    });

    it("1. deleteUser", () => {
        let deleteBody: any = {
            playerName: fakePlayerName,
            password: fakePassword
        };
        let req: any = {
            body: deleteBody
        };

        return webPlayerAccountsController.deleteUser(req, res).then((responsePayload) => {
            sinon.assert.calledWith(stubDeleteUser, deleteUserRequest);
            sinon.assert.calledWith(stubCallDeletePlayerStats, user);
            should.deepEqual({ success: true }, responsePayload);
        });
    });

    it("1. deleteUserWithoutStats", () => {
        let deleteBody: any = {
            playerName: fakePlayerName,
            password: fakePassword
        };
        let req: any = {
            body: deleteBody
        };

        return webPlayerAccountsController.deleteUserWithoutStats(req, res).then((responsePayload) => {
            sinon.assert.calledWith(stubDeleteUserWithoutStats, deleteUserRequest);
            should.deepEqual({success: true}, responsePayload);
        });
    });

    it("2. deleteUser doesn't have playerName", () => {
        let deleteBodyWithhoutPlayerName: any = {
            password: fakePassword
        };
        let req: any = {
            body: deleteBodyWithhoutPlayerName
        };

        return webPlayerAccountsController.deleteUserWithoutStats(req, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'playerName is missing');
        });
    });

    it("1. login doesn't accept query-selector-injection password", () => {
        let loginBody: any = {
            playerName: fakePlayerName,
            password: { $gt: "" }
        };
        let req: any = {
            body: loginBody
        };

        return webPlayerAccountsController.login(req, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'password is missing');
        });
    });

    it("1. login3", () => {
        let loginBody: any = {
            email: TestFactory.fakeEmail,
            password: TestFactory.fakePassword
        };
        let req: any = {
            body: loginBody
        };

        let playerAccountsResponse: I.PlayerAccountsResponse = {
            sessionToken: jwt,
            playerName: user.name,
            email: TestFactory.fakeEmail
        };

        return webPlayerAccountsController.login3(req, res).then((actual) => {
            should.deepEqual(actual, playerAccountsResponse);
            sinon.assert.calledWith(stubLogin3, TestFactory.fakeUniqueEmail, loginBody.password);
            sinon.assert.calledOnce(stubGenerateJWT);
        });
    });

    it("2. login3 no email", () => {
        let loginBody: any = {
            password: TestFactory.fakePassword
        };
        let req: any = {
            body: loginBody
        };

        return webPlayerAccountsController.login3(req, res).then((actual) => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'email is missing'); 
        });
    });

    it("1. login3 doesn't accept query-selector-injection password", () => {
        let loginBody: any = {
            email: TestFactory.fakeEmail,
            password: { $gt: "" }
        };
        let req: any = {
            body: loginBody
        };

        return webPlayerAccountsController.login3(req, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'password is missing');
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("1. sendPasswordResetEmail", () => {
        let req: any = {
            body: {
                email: TestFactory.fakeEmail
            }
        };
        let res: any = {};

        let expected: I.SendPasswordResetEmailResponse = {
            email: TestFactory.fakeUniqueEmail
        };

        return webPlayerAccountsController.sendPasswordResetEmail(req, res).then((actual: I.SendPasswordResetEmailResponse) => {
            should.deepEqual(actual, expected);
            let expiration: number; 

            //let callbackUrl: string = encodeURIComponent("https://" + settings.callbackBaseUrl + ":" + settings.port + settings.resetPasswordPath);
            //let passwordResetPage: string = settings.passwordResetPageBaseUrl + "?email=" + TestFactory.fakeUniqueEmail + "&passwordResetToken=" + TestFactory.fakeGuid + "&callbackUrl=" + callbackUrl;
            //let expectedEmailBody: string = "Hello,\n" +
            //    "Please visit " + passwordResetPage + "\nThis link will expire in " + settings.passwordResetTokenDurationHours + " hours.";
            //sinon.assert.calledWith(stubSendMailTo, TestFactory.fakeUniqueEmail, WebPlayerAccountsController.PASSWORD_RESET_EMAIL_SUBJECT, expectedEmailBody);
            sinon.assert.calledOnce(stubSendMailTo);

            sinon.assert.calledWith(stubGeneratePasswordReset, TestFactory.fakeUniqueEmail);
        });

    });

    it("2. sendPasswordResetEmail no email", () => {
        let req: any = {
            body: {}
        };

        return webPlayerAccountsController.sendPasswordResetEmail(req, res).then((actual) => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'email is missing');
        });
    });

    it("3. sendPasswordResetEmail wrong type email", () => {
        let req: any = {
            body: { email: {} }
        };

        return webPlayerAccountsController.sendPasswordResetEmail(req, res).then((actual) => {
            assert(false, "Should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, 'email is missing');
        });
    });

    it("1. resetPassword", () => {
        let requestBody: any = {
            email: email,
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        let request: any = {
            body: requestBody
        };

        let expectedResetPasswordRequest: any = {
            uniqueEmail: email.toUpperCase(),
            passwordResetToken: passwordResetToken,
            newPassword: newPassword
        };

        stubResetPassword.withArgs(expectedResetPasswordRequest).returns(promiseOfIUser);

        return webPlayerAccountsController.resetPassword(request, {}).then((actual) => {
            should.deepEqual(actual, { success: true });
        });

    });

    it("2. resetPassword with query-selector-injection on passwordResetToken", () => {
        let body: any = {
            email: email,
            passwordResetToken: { $gt: "" },
            newPassword: newPassword
        };

        let request: any = {
            body: body
        };

        return webPlayerAccountsController.resetPassword(request, res).then(() => {
            assert(false, "should have thrown but didn't");
        }).catch((error) => {
            should.deepEqual(error.message, "passwordResetToken is missing");
        });
    });

});