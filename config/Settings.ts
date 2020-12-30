import nconf = require('nconf');
import I = require('../Interfaces');

class Settings implements I.Settings {
    get port(): number {
        return Number(nconf.get('port'));
    }
    get insecurePort(): number {
        return Number(nconf.get('insecurePort'));
    }
    get graylog2(): I.Graylog2 {
        return <I.Graylog2> nconf.get('graylog2');
    }
    get JWTSecret(): string {
        return nconf.get('JWTSecret');
    }
    get sslConfigPath(): string {
        return nconf.get('sslConfigPath');
    }
    set maxNameLength(value: number) {
        nconf.set('maxNameLength', value);
    }
    get maxNameLength(): number {
        return nconf.get('maxNameLength');
    }
    set minNameLength(value: number) {
        nconf.set('minNameLength', value);
    }
    get minNameLength(): number {
        return nconf.get('minNameLength');
    }
    get maxPasswordLength(): number {
        return nconf.get('maxPasswordLength');
    }
    set maxPasswordLength(value: number) {
        nconf.set('maxPasswordLength', value);
    }
    get minPasswordLength(): number {
        return nconf.get('minPasswordLength');
    }
    set minPasswordLength(value: number) {
        nconf.set('minPasswordLength', value);
    }
    get maxEmailLength(): number {
        return nconf.get('maxEmailLength');
    }
    set maxEmailLength(value: number) {
        nconf.set('maxEmailLength', value);
    }
    get createNewPlayerStatsUrl(): string {
        return nconf.get('createNewPlayerStatsUrl');
	}
	get getDbPlayerStatsUrl(): string {
		return nconf.get('getDbPlayerStatsUrl');
	}
	get editPlayerStatsUrl(): string {
		return nconf.get('editPlayerStatsUrl');
	}
    get mongoDBUsersCollectionName(): string {
        return nconf.get('mongoDBUsersCollectionName');
    }
    get mongoDbUris(): Array<string> {
        return nconf.get('mongoDbUris');
    }
    get mongoDbReplicaSet(): string {
        return nconf.get('mongoDbReplicaSet');
    }
    get mongoDbName(): string {
        return nconf.get('mongoDbName');
    }
    get mongoDbKeepAlive(): number {
        return nconf.get('mongoDbKeepAlive');
    }
    get mongoDbUsername() {
        return nconf.get('mongoDbUsername')
    }
    get mongoDbPassword() {
        return nconf.get('mongoDbPassword')
    }
    get containsBlacklist(): { [key: string]: string } {
        return nconf.get('containsBlacklist');
    }
    get emailUser(): string {
        return nconf.get('emailUser')
    }
    get emailPassword(): string {
        return nconf.get('emailPassword');
    }
    get deletePlayerStatsUrl(): string {
        return nconf.get('deletePlayerStatsUrl');
    }
    get emailVerificationBaseUrl(): string {
        return nconf.get('emailVerificationBaseUrl');
    }
    get mongoDbReconnectTries(): number {
        return nconf.get('mongoDbReconnectTries');
    }
    get mongoDbReconnectIntervalMillis(): number {
        return nconf.get('mongoDbReconnectIntervalMillis');
    }
    get shard(): string {
        return nconf.get('shard');
    }
    get redisAddress(): string {
        return nconf.get('redisAddress');
    }
    get redisPort(): number {
        return nconf.get('redisPort');
    }
    get redisPassword(): string {
        return nconf.get('redisPassword');
    }
    get cloudflareLoginEmail(): string {
        return nconf.get('cloudflareLoginEmail');
    }
    get cloudflareApiKey(): string {
        return nconf.get('cloudflareApiKey');
    }
    get letsEncryptDomains(): Array<string> {
        return nconf.get('letsEncryptDomains');
    }
    get letsEncryptEmail(): string {
        return nconf.get('letsEncryptEmail');
    }
    get letsEncryptEnvironment(): string {
        return nconf.get('letsEncryptEnvironment');
    }
    get testCloudflareChallengeDelayMs(): number {
        return nconf.get('testCloudflareChallengeDelayMs');
    }
    get useCertifiedSsl(): boolean {
        return nconf.get('useCertifiedSsl');
    }
    get leStoreRedisDb(): number {
        return nconf.get('leStoreRedisDb');
    }
    get passwordResetTokenDurationHours(): number {
        return nconf.get('passwordResetTokenDurationHours');
    }
    get callbackBaseUrl(): string {
        return nconf.get('callbackBaseUrl');
    }
    get passwordResetPageBaseUrl(): string {
        return nconf.get('passwordResetPageBaseUrl');
    }
    get resetPasswordPath(): string {
        return nconf.get('resetPasswordPath');
    }
    get verifyEmailPath(): string {
        return nconf.get('verifyEmailPath');
    }
    get emailFromAddress(): string {
        return nconf.get('emailFromAddress');
    }
    get emailService(): string {
        return nconf.get('emailService');
    }
    get steamWebApiKey(): string {
        return nconf.get('steamWebApiKey');
    }
    get steamAppId(): number {
        return nconf.get('steamAppId');
    }
    get mandrillApiKey(): string {
        return nconf.get('mandrillApiKey');
    }
    get useMandrillApi(): boolean {
        return nconf.get('useMandrillApi');
    }
    set useMandrillApi(value: boolean) {
        nconf.set('useMandrillApi', value);
    }
    get reservedNameEndings(): Array<string> {
        return nconf.get('reservedNameEndings');
    }
    get successRequestPointsIncrease(): number {
        return nconf.get('successRequestPointsIncrease');
	}
    get failureRequestPointsIncrease(): number {
        return nconf.get('failureRequestPointsIncrease');
	}
    get softBlockRequestPoints(): number {
        return nconf.get('softBlockRequestPoints');
	}
    get hardBlockRequestPoints(): number {
        return nconf.get('hardBlockRequestPoints');
	}
    get decreaseRequestPoints(): number {
        return nconf.get('decreaseRequestPoints');
	}
    get decreaseRequestPointsInterval(): number {
        return nconf.get('decreaseRequestPointsInterval');
	}
    get blockedRequestPointsIncrease(): number {
        return nconf.get('blockedRequestPointsIncrease');
	}
	get sendVerificationEmailOnCreate(): boolean {
		return nconf.get('sendVerificationEmailOnCreate');
    }
    get requestMaxSockets(): number {
        return nconf.get('requestMaxSockets');
    }
    get requestKeepAlive(): boolean {
        return nconf.get('requestKeepAlive');
    }
    get logMorgan(): boolean {
        return nconf.get('logMorgan');
    }
}

let defaultSettings = {
    verifyEmailPath: "/verify",
    resetPasswordPath: "/resetPassword",
    leStoreRedisDb: 3,
    useCertifiedSsl: false,
    testCloudflareChallengeDelayMs: 20 * 1000,
    passwordResetTokenDurationHours: 4,
    letsEncryptEnvironment: "staging",
    cloudflareLoginEmail: "CLOUDFLAREACCOUNT@EXAMPLE.COM",
    cloudflareApiKey: "SOME_CLOUDFLARE_API_kEY",
    letsEncryptDomains: ["playeraccounts.local.maestrosgame.com"],
    letsEncryptEmail: "maestrosthegame@gmail.com",
    redisAddress: '127.0.0.1',
    redisPort: 6379,
    redisPassword: '',
    sslConfigPath: "./config/ssl.json",
    port: 443,
    insecurePort: 10600,
    //MongoDBConnectionString: "mongodb://maestros:example.com:30817/xyz", 
    JWTSecret: "strongJwtSecretGoesHere",
    graylog2: {
        name: "Graylog",
        level: "debug",
        graylog: {
            servers: [{
                host: "analytics.beta.maestrosgame.com",
                port: 12201
            }],
            facility: "PlayerAccounts",
        },
        staticMeta: { shard: 'local' }
    },
    maxNameLength: 15,
    minNameLength: 3,
    maxPasswordLength: 30,
    minPasswordLength: 7,
    maxEmailLength: 254,
    createNewPlayerStatsUrl: "http://127.0.0.1:10500/v1/createNewPlayerStats",
	deletePlayerStatsUrl: "http://127.0.0.1:10500/v1/deletePlayerStats",
	getDbPlayerStatsUrl: "http://127.0.0.1:10500/v1/getDbPlayerStats",
	editPlayerStatsUrl: "http://127.0.0.1:10500/v1/editPlayerStats",
    containsBlacklist: {
        damn: "damn",
        shit: "shit"
    },
    mongoDbUris: ["127.0.0.1:27017"],
    mongoDbReplicaSet: "",
    mongoDbName: "tmlocal",
    mongoDbUsername: "",
    mongoDbPassword: "",
    mongoDbKeepAlive: 1,
    mongoDBUsersCollectionName: "users",
    emailService: 'gmail',
    emailUser: "EXAMPLE_EMAIL@gmail.com",
    emailPassword: "GMAIL_PASSWORD",
    emailFromAddress: "EXAMPLE_EMAIL@gmail.com",
    emailVerificationBaseUrl: "http://maestrosgame.com/verify",
    mongoDbReconnectIntervalMillis: 1000,
    mongoDbReconnectTries: 600,
    shard: "local",
    passwordResetPageBaseUrl: "https://maestrosgame.com/resetPassword",
    callbackBaseUrl: "127.0.0.1",
    steamWebApiKey: "STEAM_WEB_API_KEY_FOR_YOUR_APP",
    steamAppId: 1234567890,
    mandrillApiKey: "MANDRILL_API_KEY",
	useMandrillApi: false,
	sendVerificationEmailOnCreate: false,
    reservedNameEndings: ["_tm"],
    successRequestPointsIncrease: 100,
    failureRequestPointsIncrease: 500,
    softBlockRequestPoints: 7500,
    hardBlockRequestPoints: 10000,
    decreaseRequestPoints: 300,
    decreaseRequestPointsInterval: 5000,
    blockedRequestPointsIncrease: 1000,
    requestMaxSockets: 1000,
    requestKeepAlive: true,
    logMorgan: true
}

nconf
    .file('./config/settings.json')
    .defaults(defaultSettings);

let settings: I.Settings = new Settings();
export = settings;