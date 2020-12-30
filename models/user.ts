import I = require('../Interfaces');

class User implements I.User {
    public name: string;
    public uniqueName: string;
    public password: string;
    public email: string;
    public steamId: string;
    public verificationToken: string;
    public verified: boolean;
    public passwordResetToken: string;
    public passwordResetExpiration: number;
	public lastLogin: number;
	public createdAt: number;

    constructor(mongoDbUser: I.MongoDbUser) {
        this.name = mongoDbUser.name;
        this.uniqueName = mongoDbUser.uniqueName;
        this.password = mongoDbUser.password;
        this.email = mongoDbUser.email;
        this.steamId = mongoDbUser.steamId;
        this.verificationToken = mongoDbUser.verificationToken;
        this.verified = mongoDbUser.verified;
		this.passwordResetToken = mongoDbUser.passwordResetToken;
		this.passwordResetExpiration = mongoDbUser.passwordResetExpiration;
		this.lastLogin = mongoDbUser.lastLogin;
		this.createdAt = parseInt(mongoDbUser._id.toString().slice(0, 8), 16) * 1000;
    }
}

export = User;