import http = require('http');
import https = require('https');
import querystring = require('querystring');
import fs = require('fs');
import Q = require('q');
import net = require('net');
let LeStoreRedis = require('le-store-redis');
let LeChallengeCloudflare= require('le-challenge-cloudflare');
let GreenlockExpress = require('greenlock-express');

/** Express related requires **/
import express = require('express');
let morgan = require('morgan');
let errorHandler = require('errorhandler');
let bodyParser = require('body-parser');

/** Import own JS files **/
import settings = require('./config/Settings');
import logger = require('./logger');
import I = require('./Interfaces');
import StandardLibraryProxy = require('./StandardLibraryProxy');
import WebPlayerAccountsController = require('./controllers/WebPlayerAccountsController');
import UserController = require('./controllers/UserController');
import MongoDbUserController = require('./controllers/MongoDbUserController');
import MailController = require('./controllers/MailController');
import PlayerStatsCommunicator = require('./controllers/PlayerStatsCommunicator');
import SteamCommunicator = require('./controllers/SteamCommunicator');
import GuidGenerator = require('./GuidGenerator');
import MandrillApiMailController = require('./controllers/MandrillApiMailController');

import RequestPointController = require('./controllers/RequestPointController');
const FAILURE_EXIT_CODE: number = 1;

/** App Setup **/
let app = express();
let jsonFormatter = function (tokens:any, req:any, res:any) {
    let obj: any = {
        url: tokens.url(req, res),
        statusCode: tokens.status(req, res),
        durationMs: parseInt(tokens['response-time'](req, res), 10)
    };
    return JSON.stringify(obj);
}
app.use(morgan(jsonFormatter, {stream: logger.stream }));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express.static(__dirname + '/public'));

let standardLibraryProxy: StandardLibraryProxy = new StandardLibraryProxy();
let dbUserController: MongoDbUserController = new MongoDbUserController(standardLibraryProxy);
dbUserController.connect();
let mailController: MailController = new MailController();
mailController.init();
let guidGenerator: GuidGenerator = new GuidGenerator();
let userController: UserController = new UserController(dbUserController, guidGenerator, standardLibraryProxy);
let steamCommunicator: SteamCommunicator = new SteamCommunicator();
let playerStatsCommunicator: PlayerStatsCommunicator = new PlayerStatsCommunicator();
let mandrillApiMailController: MandrillApiMailController = new MandrillApiMailController();
mandrillApiMailController.init();
let webPlayerAccountsController: WebPlayerAccountsController = new WebPlayerAccountsController(userController, playerStatsCommunicator, mailController, steamCommunicator, mandrillApiMailController);
let requestPointController: RequestPointController = new RequestPointController();
requestPointController.init();

//Fix so that bodyParser will work even though the client doesn't set content-type
app.all('*', function (req, res, next) {
    if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE'); // probably not needed
    res.header("Access-Control-Allow-Headers", "X-Requested-With,     Content-Type");
  
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.render('index2');
});

app.get('/index2', (req, res) => {
    res.render('index2');
});

function buildSocketId(connection: net.Socket): string {
    return connection.remoteAddress + ":" + connection.remotePort; // would just using the ip be better? Catch botters but also maybe catch large networks? :/
}

function failResponseHandler(err: any, res: express.Response, req: any) {
    let errorMessage;
    if (err && err.message) {
        errorMessage = err.message;
    }
    requestPointController.increaseRequestPoints(settings.failureRequestPointsIncrease, buildSocketId(req.connection));
    logger.error("Error Message: "+ errorMessage, err);  
    res.json(200, { error: errorMessage });
}

function successResponseHandler(responsePayload: any, res: express.Response, req: any) {
    let socketId: string = buildSocketId(req.connection);
    requestPointController.increaseRequestPoints(settings.successRequestPointsIncrease, buildSocketId(req.connection));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json(responsePayload);
    res.status(200);
}

const TOO_MANY_REQUEST_ATTEMPTS_MESSAGE: string = "Too many requests attempted.  Close your client and try again later.";
app.all('*', function (req, res, next) {
    let socketId: string = buildSocketId(req.connection);
    if (requestPointController.shouldHardBlock(socketId)) {
        requestPointController.increaseRequestPoints(settings.blockedRequestPointsIncrease, socketId);
        logger.info("Shitter detected, cutting connection immediately");
        res.end();
        return;
    }
    if (requestPointController.shouldSoftBlock(socketId)) {
        requestPointController.increaseRequestPoints(settings.failureRequestPointsIncrease, socketId);
        res.json(200, { error: TOO_MANY_REQUEST_ATTEMPTS_MESSAGE });
        logger.info("Notifying client that too many requests were made.");
        return;
    }
    next();
});

app.post('/login3', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.login3(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});
app.post('/login4', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.login4(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});
app.post(settings.verifyEmailPath, (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.verify(req, res)
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});
app.post('/createPlayer2', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.create(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});
app.post('/createPlayer3', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.create3(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});

app.post('/deletePlayer2', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.deleteUser(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});

app.post('/resendVerificationEmail', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.resendVerificationEmail(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});

app.post('/verify', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.verify(req, res)
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});

app.post('/sendPasswordResetEmail', (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.sendPasswordResetEmail(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});

app.post(settings.resetPasswordPath, (req, res) => {
    Q.fcall(() => {
        return webPlayerAccountsController.resetPassword(req, res);
    }).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
    }).catch((err) => {
        failResponseHandler(err, res, req);
    });
});

app.post('/getPlayerAccountInfo', (req, res) => {
	Q.fcall(() => {
		 return webPlayerAccountsController.getPlayerAccountInfo(req, res);
	}).then((responsePayload: any) => {
		successResponseHandler(responsePayload, res, req);
	}).catch((err) => {
        failResponseHandler(err, res, req);
	});
});

app.post('/setPlayerAccountInfo', (req, res) => {
	Q.fcall(() => {
		return webPlayerAccountsController.setPlayerAccountInfo(req, res);
	}).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
	}).catch((err) => {
        failResponseHandler(err, res, req);
	});
});

app.post('/getUserCount', (req, res) => {
	Q.fcall(() => {
		return webPlayerAccountsController.getUserCount(req, res);
	}).then((responsePayload: any) => {
        successResponseHandler(responsePayload, res, req);
	}).catch((err) => {
        failResponseHandler(err, res, req);
	});
});

app.get('/isRunning', (req, res) => {
    res.json(200, true);
});

app.get('*', (req, res) => {
    res.status(404);
    res.write("404");
    res.end();
});

app.use(errorHandler());

let port = settings.port;
if (settings.useCertifiedSsl == false) {
    if (fs.existsSync(settings.sslConfigPath)) {
        https.createServer({
            pfx: fs.readFileSync(require(settings.sslConfigPath).pfx),
            passphrase: require(settings.sslConfigPath).passphrase
        }, app).listen(port, '0.0.0.0');
    } else {
        logger.error("Failed to find ssl cert at " + settings.sslConfigPath, + " server not started, exiting...");
        process.exit(FAILURE_EXIT_CODE);
    }
}

if (settings.useCertifiedSsl == true) {
    let leStoreRedisOptions = {
        debug: true,
        redisOptions: {
            db: settings.leStoreRedisDb,
            host: settings.redisAddress,
            port: settings.redisPort,
            password: settings.redisPassword
        }
    };
    let leStoreRedis = LeStoreRedis.create(leStoreRedisOptions);

    let leChallengeCloudflare = LeChallengeCloudflare.create({
        email: settings.cloudflareLoginEmail,
        key: settings.cloudflareApiKey,
        delay: settings.testCloudflareChallengeDelayMs
    });

    let greenlockExpress = GreenlockExpress.create({
        server: settings.letsEncryptEnvironment,
        store: leStoreRedis,
        challenges: { 'dns-01': leChallengeCloudflare },
        challengeType: 'dns-01',
        email: settings.letsEncryptEmail,
        agreeTos: true,
        approveDomains: settings.letsEncryptDomains,
        app: app
    });
    greenlockExpress.listen(settings.insecurePort, port);

    logger.info('SECURE server running at localhost', { codepath: "app.https.createServer", port: port });
}

process.on('uncaughtException', function (err: any) {
    logger.error(err);
    logger.error(err.stack);
    logger.info("Node NOT Exiting...");
    debugger;
});

let printableSettings: any = settings;
logger.info(JSON.stringify(printableSettings.__proto__, null, 2));