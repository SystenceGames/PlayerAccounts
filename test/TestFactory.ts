import I = require('../Interfaces');

class TestFactory {
    public static fakePlayerName: string = "fakePlayerName";
    public static fakePlayerUniqueName: string = "FAKEPLAYERNAME";
    public static fakePassword: string = "fakePassword";
    public static fakeEmail: string = "fake@email.com";
    public static fakeUniqueEmail: string = "FAKE@EMAIL.COM";
    public static fakeBirthDate: string = "12/04/1991";
    public static fakeSteamId: string = "1234567890";   
    public static fakeGuid: string = "fakeGuid";
    public static fakePasswordResetToken: string = "fakePasswordResetToken";
    public static expiration: number = 100;
}

export = TestFactory;