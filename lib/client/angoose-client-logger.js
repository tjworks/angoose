/**
 * Created by qiuzuhui on 14-2-27.
 */
function initClientLogger(){
    var levels = {
        TRACE: { v: 1, name: "TRACE" },
        DEBUG: { v: 2, name: "DEBUG" },
        INFO: { v: 3, name: "INFO" },
        WARN: { v: 4, name: "WARN" },
        ERROR: { v: 5, name: "ERROR" },
        LOG: { v: 6, name: "LOG" }
    };

    var ClientLogger={
        levels:levels,
        level:levels.INFO
    }

    "log,info,trace,debug,warn,error".split(",").forEach( function(method){
        if(console && console[method])
            ClientLogger[method]= function(){
                if(ClientLogger.level.v <=  levels[method.toUpperCase()].v ){
                    console[method].apply(console,arguments)
                }
            }
        else
            ClientLogger[method]=function(){}
    });

    ClientLogger.setLevel=function(level){
        ClientLogger.level=level;
    }
    return ClientLogger;
}
var ClientLogger = initClientLogger();
ClientLogger.setLevel(/**CLIENT_LOGGER_LEVEL*/)//ClientLogger.levels.LOG
