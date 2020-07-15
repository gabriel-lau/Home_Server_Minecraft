// Require Node.js standard library function to spawn a child process
var { exec } = require('child_process');

// Require express for routing
var express = require('express');
var router = express.Router();
router.use(require('body-parser').urlencoded({
    extended:false
}));

var minecraftServerProcess;

router.get('/start', function(request,response) {
    
    // Create a child process for the Minecraft server using the same java process
    // invocation we used manually before
    minecraftServerProcess = exec("java -Xmx1024M -Xms1024M -jar server.jar nogui", {
        cwd: '/home/gabriel/Documents/minecraft'
    });

    var logDataArray = new String;
    response.setHeader("Content-Type", "application/json");
    // Checks if the server is running as accordingly
    
    minecraftServerProcess.stdout.on('data', (data) => {

        console.log("stout: " + data);
        logDataArray += " " + data;

        // Ends the get method with a success message
        if (data.includes("[Server thread/INFO]: Done")) {
            console.log("Server Started");
            response.json(
                {
                    message: "Server Started Sucessfully",
                    log: logDataArray
                });
            minecraftServerProcess.stdout.removeAllListeners()
        }

        // Ends the get method with a failure message
        else if (data.includes("[Server thread/ERROR]: Exception stopping the server")) {
            minecraftServerProcess.kill();
            console.log("Server Failed to Start");
            response.json(
                {
                    message: "Server Failed to Start",
                    log: logDataArray
                });
            minecraftServerProcess.stdout.removeAllListeners()
        }
    });
    /*
    minecraftServerProcess.stdout.on("data", serverOutput)
    // Await Output
    var serverOutput = function(data) {
        console.log("stout: " + data);
        logDataArray += " " + data;

        // Ends the get method with a success message
        if (data.includes("[Server thread/INFO]: Done")) {
            console.log("Server Started");
            response.json(
                {
                    message: "Server Started Sucessfully",
                    log: logDataArray
                });
        }
        
        // Ends the get method with a failure message
        else if (data.includes("[Server thread/ERROR]: Exception stopping the server")) {
            minecraftServerProcess.kill();
            console.log("Server Failed to Start");
            response.json(
                {
                    message: "Server Failed to Start",
                    log: logDataArray
                });
        }
        return "", ""
    }*/

    
    // Error
    minecraftServerProcess.stderr.on('data', (data) => {
        minecraftServerProcess.kill();
        console.log("stderr: " + data);
        response.json(
            {
                message: "An Error Ocurred, Server did not start",
                log: logDataArray
            });
    });
});

router.get('/end', function(request,response) {
    response.setHeader("Content-Type", "application/json");
    minecraftServerProcess.stdin.write("stop" + "\n");

    var logDataString = new String;

    minecraftServerProcess.stdout.on('data', (data) => {
        console.log("stout: " + data);
        logDataString += " " + data;
    });

    minecraftServerProcess.stderr.on('data', (data) => {
        minecraftServerProcess.kill();
        console.log("stderr: " + data);
        response.json(
            {
                message: "An error ocurred, Server Killed",
                log: logDataString
            });
        minecraftServerProcess.stdout.removeAllListeners()
    });

    setTimeout(function() {
        minecraftServerProcess.kill()
        response.json(
            {
                message: "Server Stopped",
                log: logDataString
            });
        minecraftServerProcess.stdout.removeAllListeners()
    }, 2000);
});

router.get('/status', function(request, response) {
    try{
        //Gets the status of the running server
        minecraftServerProcess.stdin.write("list"+'\n');
/*
        var playersCountString = new String;
        minecraftServerProcess.stdout.on('data', (data) => {
            console.log("stout: " + data);
            playersCountString += " " + data;
        });

        setTimeout(function() {
            response.json({
                online: true,
                playersCount: playersCountString,
            });
            minecraftServerProcess.stdout.removeAllListeners()
        }, 250); */

        var playersCountString = new String;
        var countFunction = function(data) {
            console.log("stout: " + data);
            playersCountString += " " + data;
        };

        minecraftServerProcess.stdout.on('data', countFunction);
        setTimeout(function() {
            minecraftServerProcess.stdout.removeListener('data', countFunction);
            response.json({
                online: true,
                playersCount: playersCountString,
            });
        }, 250);

    }
    catch{
        response.json(
            {
                online: false,
                playersCount: ""
        })
        minecraftServerProcess.stdout.removeAllListeners()
    }
    minecraftServerProcess.stdout.removeAllListeners()
});

router.get("/kill", function(request, response) {
    if (minecraftServerProcess != null) {
        minecraftServerProcess.kill();
        response.send("Server Killed")
    }
    else {
        response.send("Server Not Running")
    }
})

// Create a route that will respond to a POST request
router.post('/command', function(request, response) {
    // Get the command from the HTTP request and send it to the Minecraft
    // server process
    var command = request.param('Body');
    minecraftServerProcess.stdin.write(command+'\n');

    // buffer output for a quarter of a second, then reply to HTTP request
    var buffer = [];
    var collector = function(data) {
        data = data.toString();
        buffer.push(data.split(']: ')[1]);
    };
    minecraftServerProcess.stdout.on('data', collector);
    setTimeout(function() {
        minecraftServerProcess.stdout.removeListener('data', collector);
        response.send(buffer.join(''));
    }, 250);
});

/*
// Listen for events coming from the minecraft server process - in this case,
// just log out messages coming from the server
function log(data) {
    process.stdout.write(data.toString());
}*/

// Ends the server when the program closes
process.on('exit', function() {
    minecraftServerProcess.kill();
});



// Listen for incoming HTTP requests on port 3000
module.exports = router;