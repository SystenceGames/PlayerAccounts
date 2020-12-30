class TMError extends Error {
    public isPlayerFacing: boolean;

    constructor(playerFacing:boolean, message:string) {
        super(message);
        this.isPlayerFacing = playerFacing;
    }
}

export = TMError;