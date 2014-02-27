/**
 * Created by qiuzuhui on 14-2-27.
 */
function initClientLogger(){
    var levels = {
        LOG: { v: 1, name: "LOG" },
        INFO: { v: 2, name: "INFO" },
        TRACE: { v: 3, name: "TRACE" },
        DEBUG: { v: 4, name: "DEBUG" },
        WARN: { v: 5, name: "WARN" },
        ERROR: { v: 6, name: "ERROR" }
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
