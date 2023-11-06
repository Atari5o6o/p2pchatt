class p2pCustomError extends Error{
    constructor(message,code){
        super(message,code)
    }
}

module.exports = p2pCustomError