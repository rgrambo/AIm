var request = require('request');

window.onload = function() {

    //
    //
    // DECLARING VARIABLES
    //
    //

    var overlapTable = document.getElementById('overlapTable');
    var leaderboardText = document.getElementById('leaderboardText');
    var htmlCanvas = document.getElementById('canvas');
    var context = htmlCanvas.getContext('2d');

    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    editor.getSession().setTabSize(4);

    //
    //
    // CANVAS RESIZING
    //
    //

    // Start listening to resize events and draw canvas.
    initialize();

    function initialize() {
        // Register an event listener to call the resizeCanvas() function
        // each time the window is resized.
        window.addEventListener('resize', resizeCanvas, false);
        // Draw canvas border for the first time.
        resizeCanvas();
    }

    // Runs each time the DOM window resize event fires.
    // Resets the canvas dimensions to match window,
    // then draws the new borders accordingly.
    function resizeCanvas() {
        htmlCanvas.width = window.innerWidth;
        htmlCanvas.height = window.innerHeight;
        redraw();
    }

    //
    //
    // CANVAS BUTTONS
    //
    //

    var rect;

    //Function to get the mouse position
    function getMousePos(htmlCanvas, event) {
        var rect = htmlCanvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    //Function to check whether a point is inside a rectangle
    function isInside(pos, rect){
        return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
    }

    function drawStartButton() {
        rect = {
            x:(htmlCanvas.width/2)-200/2,
            y:(htmlCanvas.height/2)-100/2,
            width:200,
            height:100
        };

        context.fillStyle = "white";
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        context.beginPath();
        context.strokeStyle = "red";
        context.rect(rect.x, rect.y, rect.width, rect.height);
        context.stroke();

        context.font = "30px Arial";
        context.fillText("Start",(htmlCanvas.width/2)-35,(htmlCanvas.height/2)+10);
    }

    //Binding the click event on the canvas
    htmlCanvas.addEventListener('click', function(evt) {
        var mousePos = getMousePos(htmlCanvas, evt);
        if (isInside(mousePos,rect)) {
            var code = editor.getValue();
            request({method:'POST', url:URL+'/join', form:{code: code}}, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var myUnit = JSON.parse(body);
                    if ('msg' in myUnit) {
                        if (myUnit.msg == "same ip") {
                            // Same IP Address
                        }
                    }
                    if ('id' in myUnit) {
                        myId = myUnit.id;
                        rect = {x: 0, y: 0, width: 0, height: 0}
                    }
                }
            });
        }
    }, false);

    //
    //
    // GAME PLAY
    //
    //


    var URL = "http://35.164.156.127:3000";
    var unitRadius = 20;
    var bulletRadius = 10;

    var arenaSize;
    var data;
    var myData;
    var myId;
    var me;

    var tick;
    var nextData;
    var tickSpeed;

    var redrawInterval;

    function refresh() {
        request(URL, function(error, response, body) {
            // If we didn't get a 200 response code
            if (!error && response.statusCode != 200) {
                return;
            }

            // If our new data is not valid
            if (!handleNewData(JSON.parse(body))) {
                return;
            }

            if (!tick || tick < data[0].tick) {
                tick = data[0].tick;
            }
            if (!tickSpeed || tickSpeed != data[0].tickSpeed) {
                tickSpeed = data[0].tickSpeed;
                if (redrawInterval) {
                    clearInterval(redrawInterval);
                }
                redrawInterval = setInterval(function(){ update(); }, tickSpeed);
            }
        });
    }

    function handleNewData(newData) {
        data = newData;
        if (data.length > 1) {
            return true;
        } else {
            return false;
        }
    }

    function refreshLeaderboard() {
        if (nextData) {
            var board = "";
            for (var i = 0; i < nextData.units.length; i++) {
                board += nextData.units[i].name + ": " + nextData.units[i].score + "\n";
            }
            leaderboardText.innerHTML = board;
        }
    }

    function update() {
        // Sync our current tick with the server's
        SyncObjectsAndTicks();

        // If there is valid data for the next tick, move units
        if (nextData) {
            refreshLeaderboard();
            HandleUnits();
            HandleBullets();
            redraw();
        }
        tick++;
    }

    function SyncObjectsAndTicks() {
        for (var i = 0; i < data.length; i++) {
            if (data[i].tick === tick) {
                myData = {units: data[i].units.concat(), bullets: data[i].bullets.concat()};
                if (i+1 < data.length) {
                    nextData = data[i+1];
                } else {
                    nextData = null;
                }
            }
        }
    }

    function HandleUnits() {
        var removalIndexes = [];
        for (var i = 0; i < myData.units.length; i++) {
            var nextUnit = null;
            nextData.units.forEach(function(nUnit) {
                if (nUnit.id == myData.units[i].id) {
                    nextUnit = nUnit;
                }
            });


            if (nextUnit && nextData.tick-tick > 0) {
                myData.units[i].x += (nextUnit.x - myData.units[i].x)/(nextData.tick-tick);
                myData.units[i].y += (nextUnit.y - myData.units[i].y)/(nextData.tick-tick);
            } else {
                removalIndexes.push(i);
            }
        }

        RemoveMultipleFromArray(myData.units, removalIndexes);
    }

    function HandleBullets() {
        var removalIndexes = [];
        for (var i = 0; i < myData.bullets.length; i++) {
            var nextBullet = null;
            nextData.bullets.forEach(function(nBullet) {
                if (nBullet.id == myData.bullets[i].id) {
                    nextBullet = nBullet;
                }
            });

            if (nextBullet && nextData.tick-tick > 0) {
                myData.bullets[i].x += (nextBullet.x - myData.bullets[i].x)/(nextData.tick-tick);
                myData.bullets[i].y += (nextBullet.y - myData.bullets[i].y)/(nextData.tick-tick);
            } else {
                removalIndexes.push(i);
            }
        }

        RemoveMultipleFromArray(myData.bullets, removalIndexes);
    }

    function UnitVectorFromAngle(angle) {
        a = Math.cos(angle * (Math.PI/180));
        b = Math.sin(angle * (Math.PI/180));

        return {x: a, y: b};
    }
    function findMe() {
        if (!data || !data[0].units) {
            return;
        }

        data.forEach(function (aData) {
            var units = aData.units;

            // Find me
            for (var i = 0; i < units.length; i++) {
                var unit = units[i];
                if (unit.id === myId) {
                    me = unit;
                    return;
                }
            }
        });
    }

    function findCurrentMe() {
        if (!myData) {
            return;
        }

        var units = myData.units;

        // Find me
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            if (unit.id === myId) {
                me = unit;
                return;
            }
        }
    }

    function redraw() {
        context.clearRect(0, 0, htmlCanvas.width, htmlCanvas.height);

        arenaSize = 2000;

        me = null;
        findMe();
        findCurrentMe();

        if (myData) {
            var units = myData.units;
            var bullets = myData.bullets;
        } else {
            var units = [];
            var bullets = [];
        }

        // If player does exist
        if (me != null) {
            var grd=context.createLinearGradient(0,0,arenaSize,arenaSize);
            grd.addColorStop(0,"black");
            grd.addColorStop(1,"white");
            context.fillStyle = grd;
            context.fillRect((htmlCanvas.width/2)-me.x, (htmlCanvas.height/2)-me.y, arenaSize, arenaSize);

            // Draw all players
            for (var j = 0; j < units.length; j++) {
                var unit = units[j];
                context.beginPath();
                context.strokeStyle = unit.color;
                if (unit.id === myId) {
                    context.arc((htmlCanvas.width / 2) - unitRadius / 2, (htmlCanvas.height / 2) - unitRadius / 2, unitRadius, 0, 2 * Math.PI);
                } else {
                    context.arc(unit.x - me.x + (htmlCanvas.width / 2) - unitRadius / 2, unit.y - me.y + (htmlCanvas.height / 2) - unitRadius / 2, unitRadius, 0, 2 * Math.PI);
                }
                context.stroke();
            }

            // Draw all bullets
            for (var k = 0; k < bullets.length; k++) {
                var bullet = bullets[k];
                context.beginPath();
                context.strokeStyle = bullet.color;
                context.arc(bullet.x - me.x + (htmlCanvas.width / 2) - bulletRadius / 2, bullet.y - me.y + (htmlCanvas.height / 2) - bulletRadius / 2, bulletRadius, 0, 2 * Math.PI);
                context.stroke();
            }
        } else {
            var grdB=context.createLinearGradient(0,0,arenaSize,arenaSize);
            var scale = 4;
            grdB.addColorStop(0,"black");
            grdB.addColorStop(1,"white");
            context.fillStyle = grdB;
            context.fillRect((htmlCanvas.width/2)-(arenaSize/2)/scale, (htmlCanvas.height/2)-(arenaSize/2)/scale, arenaSize/scale, arenaSize/scale);

            // Draw all players
            for (var l = 0; l < units.length; l++) {
                var unitB = units[l];
                context.beginPath();
                context.strokeStyle = unitB.color;
                if (unitB.id === myId) {
                    context.arc((htmlCanvas.width / 2) - unitRadius / 2, (htmlCanvas.height / 2) - unitRadius / 2, unitRadius, 0, 2 * Math.PI);
                } else {
                    context.arc(((htmlCanvas.width/2)-(arenaSize/2) + unitB.x - unitRadius / 2)/scale, ((htmlCanvas.height/2)-(arenaSize/2) + unitB.x - unitRadius / 2)/scale, unitRadius/scale, 0, 2 * Math.PI);
                }
                context.stroke();
            }

            // Draw all bullets
            for (var m = 0; m < bullets.length; m++) {
                var bulletB = bullets[m];
                context.beginPath();
                context.strokeStyle = bulletB.color;
                context.arc(((htmlCanvas.width/2)-(arenaSize/2) + bulletB.x - unitRadius / 2)/scale, ((htmlCanvas.height/2)-(arenaSize/2) + bulletB.x - unitRadius / 2)/scale, bulletRadius/scale, 0, 2 * Math.PI);
                context.stroke();
            }

            drawStartButton();
        }

        context.strokeStyle = 'blue';
        context.lineWidth = '5';
        context.strokeRect(0, 0, window.innerWidth, window.innerHeight);
    }

    function RemoveMultipleFromArray(array, indexes) {
        if (indexes.length > 0) {
            indexes.sort(function (a, b) {
                return b - a;
            }).forEach(function (index) {
                array.splice(index, 1);
            });
        }
    }

    setInterval(function(){ refresh(); }, 3000);
};