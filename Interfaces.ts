import mongoose = require('mongoose');

export interface SocketId {
    address: string,
    port: number,
    family: string
}

export interface User {
    name: string;
    uniqueName: string;
    password: string;
    email: string;
    steamId?: string;
    verificationToken: string;
    verified: boolean;
    passwordResetToken: string;
	passwordResetExpiration: number;
	lastLogin?: number;
	createdAt?: number;
}

export interface DeletePlayerStatsResponse {
    error: any;
    playerName: string;
    currentXP: number;
    currentLevel: number;
    gamesPlayed: number;
    xpForNextLevel: number;
    xpDelta: number;
}

export interface CreateNewPlayerStatsResponse {
    error: any;
    user: User;
}

export interface VerifyEmailRequest {
    email: string;
    verificationToken: string;
}

export interface DeleteUserRequest {
    playerName: string;
}

export interface CreateUserRequest {
    name: string;
    password: string;
    email: string;
    birthdate: Date;
}

export interface CreateUser3Request {
    name: string;
    password: string;
    email: string;
    steamAuthSessionTicket: string;
    birthdate: Date;
}

export interface CreateUser {
    name: string;
    password: string;
    email: string;
    steamId?: string;
    birthdate: Date;
}

export interface MongoDbUser extends mongoose.Document {
    name: string;
    uniqueName: string;
    password: string;
    email: string;
    steamId?: string;
    lastLogin: number;
    verified: boolean;
    verificationToken: string;
    passwordResetToken: string;
    passwordResetExpiration: number;
}

export interface Graylog2 {
    graylogHost: string;
    graylogPort: number;
    graylogFacility: string;
    level: string;
}

export interface Settings {
    redisAddress: string;
    redisPort: number;
    redisPassword: string;
    sslConfigPath: string;
    port: number;
    insecurePort: number;
    JWTSecret: string;
    graylog2: Graylog2;
    maxNameLength: number;
    minNameLength: number;
    maxPasswordLength: number;
    minPasswordLength: number;
    maxEmailLength: number;
    createNewPlayerStatsUrl: string;
	deletePlayerStatsUrl: string;
	getDbPlayerStatsUrl: string;
	editPlayerStatsUrl: string;
    containsBlacklist: { [key: string]: string };
    mongoDBUsersCollectionName: string;
    mongoDbUris: Array<string>;
    mongoDbReplicaSet: string;
    mongoDbName: string;
    mongoDbUsername: string;
    mongoDbPassword: string;
    mongoDbKeepAlive: number;
    mongoDbReconnectTries: number;
    mongoDbReconnectIntervalMillis: number;
    emailUser: string;
    emailPassword: string;
    emailVerificationBaseUrl: string;
    shard: string;
    cloudflareLoginEmail: string;
    cloudflareApiKey: string;
    letsEncryptDomains: Array<string>;
    letsEncryptEmail: string;
    letsEncryptEnvironment: string;
    testCloudflareChallengeDelayMs: number;
    useCertifiedSsl: boolean;
    leStoreRedisDb: number;
    passwordResetTokenDurationHours: number;
    passwordResetPageBaseUrl: string;
    callbackBaseUrl: string;
    resetPasswordPath: string;
    verifyEmailPath: string;
    emailFromAddress: string;
    emailService: string;
    steamWebApiKey: string;
    steamAppId: number;
    mandrillApiKey: string;
	useMandrillApi: boolean;
	sendVerificationEmailOnCreate: boolean;
    reservedNameEndings: Array<string>;

    successRequestPointsIncrease: number;
    failureRequestPointsIncrease: number;
    softBlockRequestPoints: number;
    hardBlockRequestPoints: number;
    decreaseRequestPoints: number;
    decreaseRequestPointsInterval: number;
    blockedRequestPointsIncrease: number;
    requestMaxSockets: number;
    requestKeepAlive: boolean;
    logMorgan: boolean;
}

export interface ResetPasswordResponse {
    success: boolean;
}

export interface ResetPasswordRequest {
    uniqueEmail: string;
    passwordResetToken: string;
    newPassword: string;
};

export interface UserController {
	getUser(email: string): Q.Promise<User>;
	getUserByName(name: string): Q.Promise<User>;
    createUser(createUserRequest: CreateUser): Q.Promise<User>;
    deleteUser(deleteUserRequest: DeleteUserRequest): Q.Promise<User>;
    deleteUserWithoutStats(deleteUserRequest: DeleteUserRequest): Q.Promise<User>;
    loginUser(name: string, password: string): Q.Promise<User>;
    loginUser3(email: string, password: string): Q.Promise<User>;
    loginUser4(steamAuthSessionTicket: string): Q.Promise<User>;
	verifyEmail(verifyEmailRequest: VerifyEmailRequest): Q.Promise<User>;
	setVerified(uniqueName: string, verified: boolean): Q.Promise<User>;
    generatePasswordReset(email: string): Q.Promise<string>;
	resetPassword(resetPasswordRequest: ResetPasswordRequest): Q.Promise<User>;
	getUserCount(): Q.Promise<any>;
}

export interface SendPasswordResetEmailRequest {
    email: string;
}

export interface SendPasswordResetEmailResponse {
    email: string;
}

export interface PlayerAccountsResponse {
    sessionToken: string;
    playerName: string;
    email: string;
}

export interface MailController {
    sendMailTo(emailAddress: string, subject: string, messageBody: string): Q.Promise<void>;
}

export interface PlayerStatsCommunicator {
    callDeletePlayerStats(user: User): Q.Promise<User>;
	callCreateNewPlayerStats(user: User): Q.Promise<CreateNewPlayerStatsResponse>;
	callGetDbPlayerStats(user: User): Q.Promise<any>;
	callEditPlayerStats(request: any): Q.Promise<any>;
}

export interface AuthenticateUserTicketResponse {
    steamId: string;
}

export interface SteamCommunicator {
    authenticateUserTicket(ticket: string): Q.Promise<AuthenticateUserTicketResponse>;
}

export interface GuidGenerator {
    generate(): string;
}

export interface StandardLibraryProxy {
    getCurrentDate(): Date;
}

export interface DbUserController {
    getByName(name: string): Q.Promise<User>;
    getByEmail(email: string): Q.Promise<User>;
    getBySteamId(steamId: string): Q.Promise<User>;
    create(user: User): Q.Promise<User>;
	verify(verifyEmailRequest: VerifyEmailRequest): Q.Promise<User>;
	setVerified(uniqueName: string, verified: boolean): Q.Promise<User>;
    updateLastLogin(name: string): Q.Promise<User>;
    deleteUser(deleteUserRequest: DeleteUserRequest): Q.Promise<User>;
    generatePasswordResetFor(email: string, passwordResetToken: string, tokenExpiration: number): Q.Promise<User>;
	resetPassword(uniqueEmail: string, newPassword: string, passwordResetToken: string, passwordResetExpiration: number): Q.Promise<User>;
	getUserCount(): Q.Promise<any>;
}