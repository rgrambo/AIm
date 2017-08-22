/**
 * Created by rossg on 2/22/2017.
 */
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const evaluator = require('./evaluator');

var app = express();

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors());

var id = 0;
var snapshotCount = 20;
var tickSpeed = 50;

var unitRadius = 15;
var unitSpeed = 10;
var bulletSpeed = 15;
var size = 2000;
var Names = ["Phil", "Bill", "Sanchez", "Ross"];

var tick = 0;
var users = [];
var units = [];
var unitFunctions = {};
var bullets = [];
var snapshots = [];

var hits = [];
var deadBullets = [];

var paused = false;

app.get('/', function (req, res) {
    if (snapshots.length < snapshotCount) {
        res.send([{units:[], bullets:[], tick:0, tickSpeed: tickSpeed}]);
    } else {
        var result = "[";
        for (var i = 0; i < snapshots.length; i++) {
            result += snapshots[i];
            if (i < snapshots.length - 1) {
                result+=",";
            }
        }
        result += "]";
        res.send(result);
    }
});

app.post('/join', function(req, res) {
    if (!req.body || !req.body.code) return res.sendStatus(400);
    res.send(NewPlayer(req.body.code, req.headers['x-forwarded-for']));
});

app.get('stop/:id', function(req, res) {
    var index;
    for (var i = 0; i < units.length; i++) {
        if (units[i].id == req.params.id) {
            index = i;
        }
    }
    units.splice(index, 1);

    res.send("Ok");
});

function NewPlayer(code, user) {
    if (users.filter(function (u) {if (user === u) {return u}}) > 0) {
        return {msg:"same ip"};
    }
    var name = Names[GetRandomInt(0, Names.length)];
    while (units.filter(function(item) {return item.id === name}).length > 0) {
        name = Names[GetRandomInt(0, Names.length)];
    }

    id++;
    if (id > 1000) {
        id = 0;
    }

    evaluator(code);
    unitFunctions[id + "m"] = evaluator.getRotation;
    unitFunctions[id + "r"] = evaluator.getGunRotation;

    var unit = {id: id, name: name, x: GetRandomInt(0, size), y: GetRandomInt(0, size), r: GetRandomInt(0, 360), m: GetRandomInt(0, 360), color: '#'+Math.floor(Math.random()*16777215).toString(16), score:0};
    units.push(unit);
    users.push(user);
    return unit;
}

function Update() {
    if (!paused) {
        tick++;
        HandleUserCode();
        HandleUnitSpawn();
        HandleUnits();
        HandleBulletSpawn();
        HandleBullets();

        if (tick % 5 == 0) {
            if (snapshots.length > snapshotCount) {
                snapshots.shift();
            }
            snapshots.push(JSON.stringify({units: units, bullets: bullets, tick: tick, tickSpeed: tickSpeed}));
        }
    }
}

function HandleUserCode() {
    for (var i = 0; i < units.length; i++) {
        try {
            var rotation = unitFunctions[units[i].id + "m"](units[i].id, units,bullets);
            if (typeof rotation == 'number') {
                units[i].m = Math.round(rotation);
            }

            var gunRotation = unitFunctions[units[i].id + "r"](units[i].id, units,bullets);
            if (typeof gunRotation == 'number') {
                units[i].r = Math.round(gunRotation);
            }
        }
        catch (e) {
            console.log(e);
        }
    }
}

function HandleUnitSpawn() {

}

function HandleUnits() {
    units.forEach(function(unit) {
        var direction = UnitVectorFromAngle(unit.m);

        if (unit.x + (direction.x * unitSpeed) > size - unitRadius || unit.x + (direction.x * unitSpeed) < unitRadius) {
            unit.m = 180 - unit.m;
        }
        if (unit.y + (direction.y * unitSpeed) > size - unitRadius || unit.y + (direction.y * unitSpeed) < unitRadius) {
            unit.m = -unit.m;
        }
        if (unit.m >= 360) {
            unit.m -= 360;
        }
        if (unit.m < 0) {
            unit.m += 360;
        }

        direction = UnitVectorFromAngle(unit.m);
        unit.x += direction.x * unitSpeed;
        unit.y += direction.y * unitSpeed;
    });
}

function HandleBulletSpawn() {
    if (tick % 50 === 0) {
        units.forEach(function(unit) {
            id++;
            if (id > 1000) {
                id = 0;
            }
            bullets.push({id: id, owner: unit.id, x: unit.x, y: unit.y, r: unit.r, life: 100, color: unit.color})
        });
    }
}

function HandleBullets() {
    for (var i = 0; i < bullets.length; i++) {
        var bullet = bullets[i];

        // Reduce life
        bullet.life--;
        if (bullet.life < 1 || bullet.x >= size || bullet.y >= size || bullet.x <= 0 || bullet.y <= 0) {
            deadBullets.push(i);
        }

        // Move bullets forward
        var direction = UnitVectorFromAngle(bullet.r);
        bullet.x = bullet.x + direction.x * bulletSpeed;
        bullet.y = bullet.y + direction.y * bulletSpeed;

        // Find hits
        for (var j = 0; j < units.length; j++) {
            var unit = units[j];

            if (unit.id !== bullet.owner && Math.abs(bullet.x - unit.x) < unitRadius && Math.abs(bullet.y - unit.y) < unitRadius) {
                hits.push(unit);
                for (var k = 0; k < units.length; k++) {
                    if (units[k].id === bullet.owner) {
                        units[k].score++;
                    }
                }
            }
        }

        RemoveMultipleFromArray(units, hits);
        RemoveMultipleFromArray(users, hits);
        hits.length = 0;
    }

    RemoveMultipleFromArray(bullets, deadBullets);
    deadBullets.length = 0;
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

function UnitVectorFromAngle(angle) {
    a = Math.cos(angle * (Math.PI/180));
    b = Math.sin(angle * (Math.PI/180));

    return {x: a, y: b};
}

function GetRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

setInterval(function(){ Update(); }, tickSpeed);

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});